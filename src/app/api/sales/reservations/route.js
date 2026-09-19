import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import connectDB from "@/lib/db";
import TableReservation from "@/models/TableReservation";
import Restaurant from "@/models/Restaurant";
import { serializeReservation } from "@/lib/public/createTableReservation";
import { getSocketServer } from "@/lib/socketServer";
import { logger } from "@/utils/logger";
import { onlineOrderingTimezone } from "@/lib/public/pickup";
import { sendTableReservationStatusEmail } from "@/lib/brevo/sendTableReservationStatusEmail";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";

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
    if (!doc) return { name: "Tasty Bites", address: null };
    const profile = doc.slug
      ? await getPublicRestaurantProfile(doc.slug)
      : null;
    return {
      name: profile?.name || doc.name || "Tasty Bites",
      address: profile?.address || doc.address || null,
    };
  } catch {
    return { name: "Tasty Bites", address: null };
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
        date: today,
        status: "PENDING",
      });
      return sendSuccess({ pendingCount }, "Pending reservation count");
    }

    const todayOnly = searchParams.get("today") !== "false";
    const status = String(searchParams.get("status") || "").toUpperCase();
    const query = { restaurantId };

    if (todayOnly) {
      query.date = todayLocalISO();
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
      .sort({ status: 1, time: 1, createdAt: -1 })
      .limit(200)
      .lean();

    return sendSuccess(
      rows.map((r) => serializeReservation(r)),
      "Reservations retrieved"
    );
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
      });
    } else if (action === "seat") {
      if (!["ACCEPTED", "PENDING"].includes(reservation.status)) {
        return sendError(
          new Error("Invalid status"),
          "Only accepted (or pending) bookings can be marked seated",
          400
        );
      }
      reservation.status = "SEATED";
      reservation.handledBy = employeeId;
      reservation.handledAt = new Date();
      if (assignedTableNo != null) {
        reservation.assignedTableNo = String(assignedTableNo).trim() || null;
      }
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
