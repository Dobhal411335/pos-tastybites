import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import connectDB from "@/lib/db";
import TableReservation from "@/models/TableReservation";
import Restaurant from "@/models/Restaurant";
import Floor from "@/models/floor/Floor";
import Table from "@/models/floor/Table";
import TableSession from "@/models/floor/TableSession";
import { findOpenSessionForTable } from "@/lib/orders/sessionTables";
import { serializeReservation } from "@/lib/public/createTableReservation";
import { getSocketServer } from "@/lib/socketServer";
import { logger } from "@/utils/logger";
import { onlineOrderingTimezone } from "@/lib/public/pickup";
import { sendTableReservationStatusEmail } from "@/lib/brevo/sendTableReservationStatusEmail";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import { v4 as uuidv4 } from "uuid";

function todayLocalISO(timeZone = onlineOrderingTimezone()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const STAFF_ROLES = ["EMPLOYEE", "MANAGER", "ADMIN", "SERVER", "BARTENDER", "STAFF"];

async function restaurantLabel(restaurantId) {
  try {
    const doc = await Restaurant.findById(restaurantId)
      .select("name address slug")
      .lean();
    if (!doc) {
      return {
        name: "Tasty Bites",
        address: null,
        phone: null,
        phoneCode: null,
        phoneDisplay: null,
      };
    }
    const profile = doc.slug
      ? await getPublicRestaurantProfile(doc.slug)
      : null;
    return {
      name: profile?.name || doc.name || "Tasty Bites",
      address: profile?.address || doc.address || null,
      phone: profile?.phone || null,
      phoneCode: profile?.phoneCode || null,
      phoneDisplay: profile?.phoneDisplay || null,
    };
  } catch {
    return {
      name: "Tasty Bites",
      address: null,
      phone: null,
      phoneCode: null,
      phoneDisplay: null,
    };
  }
}

export const GET = withAuth(async (request) => {
  try {
    await connectDB();
    const restaurantId = request.restaurant;
    const { searchParams } = new URL(request.url);

    if (searchParams.get("pendingCount") === "true") {
      const today = todayLocalISO();
      const pendingCount = await TableReservation.countDocuments({
        restaurantId,
        date: { $gte: today },
        status: "PENDING",
      });
      return sendSuccess({ pendingCount }, "Pending reservation count");
    }

    if (searchParams.get("tables") === "true") {
      const activeFloors = await Floor.find({
        restaurant: restaurantId,
        isActive: true,
      })
        .select("_id name")
        .lean();

      const activeFloorIds = activeFloors.map((f) => f._id);
      const floorNameMap = new Map(
        activeFloors.map((f) => [String(f._id), f.name || "Main Floor"])
      );

      const tables = await Table.find({
        restaurant: restaurantId,
        floor: { $in: activeFloorIds },
      })
        .select("_id tableNumber seats section status floor shape")
        .lean();

      const openSessions = await TableSession.find({
        restaurant: restaurantId,
        isSessionOpen: true,
      })
        .select("primaryTable linkedTables guestCount status")
        .lean();

      const occupiedTableIds = new Set();
      const sessionByTable = new Map();
      for (const s of openSessions) {
        if (s.primaryTable) {
          occupiedTableIds.add(String(s.primaryTable));
          sessionByTable.set(String(s.primaryTable), String(s._id));
        }
        for (const lt of s.linkedTables || []) {
          occupiedTableIds.add(String(lt));
          sessionByTable.set(String(lt), String(s._id));
        }
      }

      const availableOnly = searchParams.get("availableOnly") === "true";

      let tableList = tables
        .map((t) => {
          const fid = t.floor ? String(t.floor) : null;
          const isOccupied =
            occupiedTableIds.has(String(t._id)) ||
            t.status === "Occupied" ||
            t.status === "Out_of_Service";
          return {
            id: String(t._id),
            _id: String(t._id),
            tableNumber: t.tableNumber,
            seats: Number(t.seats) || 4,
            section: t.section || "",
            floorId: fid,
            floorName: fid ? floorNameMap.get(fid) || "Main Floor" : "Main Floor",
            isOccupied,
            sessionId: sessionByTable.get(String(t._id)) || null,
          };
        })
        .sort((a, b) => {
          const numA = parseInt(a.tableNumber, 10);
          const numB = parseInt(b.tableNumber, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.tableNumber.localeCompare(b.tableNumber);
        });

      if (availableOnly) {
        tableList = tableList.filter((t) => !t.isOccupied);
      }

      return sendSuccess(tableList, "Floor tables retrieved");
    }

    // Default: upcoming bookings (today + future). Pass today=true for same-day only.
    const todayOnly = searchParams.get("today") === "true";
    const upcoming = searchParams.get("upcoming") !== "false" && !todayOnly;
    const status = String(searchParams.get("status") || "").toUpperCase();
    const query = { restaurantId };
    const today = todayLocalISO();

    if (todayOnly) {
      query.date = today;
    } else if (upcoming) {
      query.date = { $gte: today };
    }
    if (
      status &&
      ["PENDING", "ACCEPTED", "DECLINED", "SEATED", "CANCELLED", "NO_SHOW"].includes(
        status
      )
    ) {
      query.status = status;
    }

    const rows = await TableReservation.find(query)
      .sort({ date: 1, status: 1, time: 1, createdAt: -1 })
      .limit(200)
      .lean();

    const seatedTableIds = rows
      .filter((r) => r.status === "SEATED" && r.assignedTableId && !r.tableSessionId)
      .map((r) => r.assignedTableId);

    let sessionMap = new Map();
    if (seatedTableIds.length > 0) {
      const openSessions = await TableSession.find({
        restaurant: restaurantId,
        isSessionOpen: true,
        primaryTable: { $in: seatedTableIds },
      })
        .select("_id primaryTable")
        .lean();
      for (const s of openSessions) {
        sessionMap.set(String(s.primaryTable), String(s._id));
      }
    }

    const serialized = rows.map((r) => {
      const data = serializeReservation(r);
      if (!data.tableSessionId && r.assignedTableId && sessionMap.has(String(r.assignedTableId))) {
        data.tableSessionId = sessionMap.get(String(r.assignedTableId));
      }
      return data;
    });

    return sendSuccess(serialized, "Reservations retrieved");
  } catch (error) {
    logger.error("Failed to list reservations", error);
    return sendError(error, "Failed to load reservations", 500);
  }
}, STAFF_ROLES);

export const PATCH = withAuth(async (request) => {
  try {
    await connectDB();
    const restaurantId = request.restaurant;
    const employeeId = request.user.id;
    const body = await request.json();
    const { reservationId, action, staffNote, assignedTableNo } = body || {};

    if (!reservationId) {
      return sendError(new Error("Missing id"), "reservationId is required", 400);
    }

    const reservation = await TableReservation.findOne({
      _id: reservationId,
      restaurantId,
    });
    if (!reservation) {
      return sendError(new Error("Not found"), "Reservation not found", 404);
    }

    if (action === "accept") {
      if (reservation.status !== "PENDING") {
        return sendError(
          new Error("Invalid status"),
          `Reservation is already ${reservation.status}`,
          400
        );
      }
      reservation.status = "ACCEPTED";
      reservation.handledBy = employeeId;
      reservation.handledAt = new Date();
      if (staffNote != null) reservation.staffNote = String(staffNote).trim() || null;
      if (assignedTableNo != null) {
        reservation.assignedTableNo = String(assignedTableNo).trim() || null;
      }
      await reservation.save();

      const label = await restaurantLabel(restaurantId);
      void sendTableReservationStatusEmail({
        type: "accepted",
        reservation,
        restaurantName: label.name,
        address: label.address,
        phone: label.phone,
        phoneCode: label.phoneCode,
        phoneDisplay: label.phoneDisplay,
      });
    } else if (action === "decline") {
      if (reservation.status !== "PENDING") {
        return sendError(
          new Error("Invalid status"),
          `Reservation is already ${reservation.status}`,
          400
        );
      }
      reservation.status = "DECLINED";
      reservation.handledBy = employeeId;
      reservation.handledAt = new Date();
      if (staffNote != null) reservation.staffNote = String(staffNote).trim() || null;
      await reservation.save();

      const label = await restaurantLabel(restaurantId);
      void sendTableReservationStatusEmail({
        type: "declined",
        reservation,
        restaurantName: label.name,
        address: label.address,
        phone: label.phone,
        phoneCode: label.phoneCode,
        phoneDisplay: label.phoneDisplay,
      });
    } else if (action === "seat") {
      if (!["ACCEPTED", "PENDING"].includes(reservation.status)) {
        return sendError(
          new Error("Invalid status"),
          "Only accepted (or pending) bookings can be marked seated",
          400
        );
      }

      let targetTable = null;
      if (body.tableId) {
        targetTable = await Table.findOne({ _id: body.tableId, restaurant: restaurantId });
      } else if (assignedTableNo || reservation.assignedTableNo) {
        const targetNo = String(assignedTableNo || reservation.assignedTableNo).trim();
        targetTable = await Table.findOne({ tableNumber: targetNo, restaurant: restaurantId });
      }

      let session = null;
      if (targetTable) {
        // Update the table seats to the reservation guest count
        if (reservation.guests && Number(reservation.guests) > 0) {
          targetTable.seats = Number(reservation.guests);
        }
        targetTable.status = "Occupied";
        await targetTable.save();

        session = await findOpenSessionForTable(restaurantId, targetTable._id);
        if (!session) {
          session = await TableSession.create({
            sessionId: `TS-${uuidv4().split("-")[0].toUpperCase()}-${Date.now().toString().slice(-4)}`,
            restaurant: restaurantId,
            floor: targetTable.floor,
            primaryTable: targetTable._id,
            assignedEmployee: employeeId,
            openedBy: employeeId,
            guestCount: Number(reservation.guests) || Number(targetTable.seats) || 1,
            originalSeatCount: Number(targetTable.seats) || 1,
            effectiveSeatCount: Number(reservation.guests) || Number(targetTable.seats) || 1,
            notes: `Booking: ${reservation.guestName} (${reservation.guests} guests)${reservation.reasonForVisit ? ` · ${reservation.reasonForVisit}` : ""}${reservation.specialRequest ? ` · ${reservation.specialRequest}` : ""}`,
            status: "ACTIVE",
            isSessionOpen: true,
          });
        } else {
          if (reservation.guests) {
            session.guestCount = Number(reservation.guests);
            session.effectiveSeatCount = Number(reservation.guests);
            await session.save();
          }
        }

        reservation.assignedTableId = targetTable._id;
        reservation.assignedTableNo = targetTable.tableNumber;
        reservation.tableSessionId = session._id;

        // Emit socket events to update floor in real-time
        try {
          const io = getSocketServer();
          if (io) {
            io.to(`restaurant:${String(restaurantId)}`).emit("table:assigned", {
              tableId: targetTable._id,
              sessionId: session._id,
            });
            io.to(`restaurant:${String(restaurantId)}`).emit("table:updated", {
              tableId: targetTable._id,
              seats: targetTable.seats,
            });
            if (targetTable.floor) {
              io.to(`floor:${String(targetTable.floor)}`).emit("table:assigned", {
                tableId: targetTable._id,
                sessionId: session._id,
              });
              io.to(`floor:${String(targetTable.floor)}`).emit("table:updated", {
                tableId: targetTable._id,
                seats: targetTable.seats,
              });
            }
          }
        } catch (socketErr) {
          logger.error("Failed to emit floor table session socket event", socketErr);
        }
      } else if (assignedTableNo != null) {
        reservation.assignedTableNo = String(assignedTableNo).trim() || null;
      }

      reservation.status = "SEATED";
      reservation.handledBy = employeeId;
      reservation.handledAt = new Date();
      await reservation.save();
    } else if (action === "no-show") {
      if (!["ACCEPTED", "PENDING"].includes(reservation.status)) {
        return sendError(
          new Error("Invalid status"),
          "Only open bookings can be marked no-show",
          400
        );
      }
      reservation.status = "NO_SHOW";
      reservation.handledBy = employeeId;
      reservation.handledAt = new Date();
      await reservation.save();
    } else if (action === "cancel") {
      if (["SEATED", "CANCELLED"].includes(reservation.status)) {
        return sendError(
          new Error("Invalid status"),
          `Cannot cancel a ${reservation.status} booking`,
          400
        );
      }
      reservation.status = "CANCELLED";
      reservation.handledBy = employeeId;
      reservation.handledAt = new Date();
      if (staffNote != null) reservation.staffNote = String(staffNote).trim() || null;
      await reservation.save();
    } else {
      return sendError(new Error("Invalid action"), "Unsupported action", 400);
    }

    try {
      const io = getSocketServer();
      io?.to(`restaurant:${String(restaurantId)}`).emit("reservation:updated", {
        reservationId: reservation._id,
        status: reservation.status,
      });
    } catch (socketErr) {
      logger.error("Failed to emit reservation update", socketErr);
    }

    return sendSuccess(
      serializeReservation(reservation),
      `Reservation ${reservation.status.toLowerCase()}`
    );
  } catch (error) {
    logger.error("Failed to update reservation", error);
    return sendError(error, "Failed to update reservation", 500);
  }
}, STAFF_ROLES);
