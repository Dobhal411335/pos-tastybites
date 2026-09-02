import { withAuth } from "@/utils/auth";
import TableSession from "@/models/floor/TableSession";
import Table from "@/models/floor/Table";
import Order from "@/models/Order";
import Employee from "@/models/employee/Employee";
import OperationalAuditLog from "@/models/OperationalAuditLog";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { v4 as uuidv4 } from "uuid";
import { createNotification } from "@/lib/notifications/notificationService";
import { isSalesAdminRole } from "@/utils/roles";
import { joinTableNumbers, resolveDocumentId } from "@/utils/orderDisplay";
import {
  applyLinkedTablesToSession,
  collectSessionTableIds,
  decorateSessionWithTableNumbers,
  findOpenSessionForTable,
  freeSessionTables,
  SessionTableError,
  sumSeatsForTableIds,
  syncSessionOrderTableLabels,
} from "@/lib/orders/sessionTables";

function actorTypeFromRequest(request) {
  const role = request.role || request.user?.role;
  return isSalesAdminRole(role) || role === "Manager" ? "Admin" : "Employee";
}

/** Emit to floor room and restaurant room (same pattern as print jobs). */
function emitFloorTableEvent(eventName, restaurantId, floorId, payload) {
  if (!global.io) return;
  const floor = resolveDocumentId(floorId);
  const restaurant = resolveDocumentId(restaurantId);
  if (floor) {
    global.io.to(`floor:${floor}`).emit(eventName, payload);
  }
  if (restaurant) {
    global.io.to(`restaurant:${restaurant}`).emit(eventName, payload);
  }
}

// GET - List active sessions for a floor, or get a specific session
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const floorId = searchParams.get("floorId");
    const sessionId = searchParams.get("sessionId");
    const status = searchParams.get("status") || "ACTIVE,PAYMENT_PENDING";

    const query = { restaurant: request.restaurant };

    if (sessionId) {
      query._id = sessionId;
    } else {
      if (floorId) query.floor = floorId;
      if (status) {
        query.status = { $in: status.split(",") };
      }
    }

    const sessions = await TableSession.find(query)
      .populate("primaryTable", "tableNumber shape seats")
      .populate("linkedTables", "tableNumber seats")
      .populate("floor", "name")
      .populate("assignedEmployee", "firstName lastName name")
      .populate("openedBy", "firstName lastName name")
      .lean();

    if (sessionId && sessions.length === 0) {
      return sendError(new Error("Not Found"), "Session not found", 404);
    }

    const withFloorId = sessions.map(decorateSessionWithTableNumbers);

    return sendSuccess(
      sessionId ? withFloorId[0] : withFloorId,
      "Sessions retrieved successfully",
    );
  } catch (error) {
    logger.error("Failed to retrieve sessions", error);
    return sendError(error, "Failed to retrieve sessions", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);

// POST - Create/Open a Table Session
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { tableId, guestCount, notes, linkedTableIds } = data;

    if (!tableId) {
      return sendError(new Error("Missing fields"), "tableId is required", 400);
    }

    const table = await Table.findOne({ _id: tableId, restaurant: request.restaurant });
    if (!table) {
      return sendError(new Error("Not Found"), "Physical table not found", 404);
    }

    const existingOwner = await findOpenSessionForTable(
      request.restaurant,
      tableId,
    );
    if (existingOwner) {
      return sendError(
        new Error("Table Unavailable"),
        "This table is already part of an open session. Please refresh your floor plan.",
        409,
      );
    }

    // Attempt to create the session. 
    // Thanks to our Partial Unique Index on { primaryTable: 1, isSessionOpen: 1 },
    // MongoDB will reject this if another open session already exists for this table.
    let session;
    try {
      session = await TableSession.create({
        sessionId: `TS-${uuidv4().split('-')[0].toUpperCase()}-${Date.now().toString().slice(-4)}`,
        restaurant: request.restaurant,
        floor: table.floor,
        primaryTable: table._id,
        assignedEmployee: request.user.id,
        openedBy: request.user.id,
        guestCount: guestCount || 1,
        originalSeatCount: table.seats,
        effectiveSeatCount: table.seats,
        notes: notes || "",
        status: "ACTIVE",
        isSessionOpen: true,
      });
    } catch (dbError) {
      // 11000 is the duplicate key error code in MongoDB
      if (dbError.code === 11000) {
        return sendError(
          new Error("Table Unavailable"),
          "This table was just taken by another employee. Please refresh your floor plan.",
          409 // Conflict
        );
      }
      throw dbError; // re-throw if it's another error
    }

    // Optionally sync the physical table status for legacy reasons
    if (table.status !== "Occupied") {
      table.status = "Occupied";
      await table.save();
    }

    if (Array.isArray(linkedTableIds) && linkedTableIds.length > 0) {
      try {
        await applyLinkedTablesToSession({
          session,
          linkedTableIds,
          restaurantId: request.restaurant,
          actorId: request.user.id,
          mergeGuestCount: false,
        });
        session.guestCount = guestCount || 1;
        session.effectiveSeatCount = await sumSeatsForTableIds(
          collectSessionTableIds(session),
        );
        await session.save();
      } catch (linkError) {
        await freeSessionTables(session);
        session.status = "RELEASED";
        session.isSessionOpen = false;
        session.closedAt = new Date();
        await session.save();
        if (linkError instanceof SessionTableError) {
          return sendError(linkError, linkError.message, linkError.statusCode);
        }
        throw linkError;
      }
    }

    logger.info(`Table session ${session.sessionId} opened for table ${table.tableNumber} by ${request.user.id}`);

    // Populate the newly created session
    const populatedSession = await TableSession.findById(session._id)
      .populate("primaryTable", "tableNumber shape seats")
      .populate("linkedTables", "tableNumber seats")
      .lean();

    // Audit Log
    await OperationalAuditLog.create({
      restaurantId: request.restaurant,
      actorId: request.user.id,
      actorType: actorTypeFromRequest(request),
      actorName: request.user.name || request.user.firstName,
      action: 'TABLE_ASSIGNED',
      floorId: table.floor,
      tableId: table._id,
      tableSessionId: session._id,
      newValue: {
        guestCount: guestCount || 1,
        linkedTableIds: collectSessionTableIds(session),
      }
    });

    const assignedLabel =
      populatedSession
        ? joinTableNumbers([
            populatedSession.primaryTable?.tableNumber,
            ...(populatedSession.linkedTables || []).map((t) => t.tableNumber),
          ])
        : table.tableNumber;

    emitFloorTableEvent(
      "table:assigned",
      request.restaurant,
      table.floor,
      {
        sessionId: session._id,
        tableId: table._id,
        tableIds: collectSessionTableIds(session),
      },
    );

    await createNotification({
      restaurantId: request.restaurant,
      type: "TABLE_ASSIGNED",
      title: "Table Assigned",
      message: `Table ${assignedLabel} opened${guestCount ? ` • ${guestCount} guests` : ""}`,
      tableId: table._id,
      tableSessionId: session._id,
      employeeId: request.user.id,
      floorId: table.floor,
      priority: "normal",
      metadata: {
        tableNo: assignedLabel,
        guestCount: guestCount || 1,
      },
    });

    return sendSuccess(populatedSession, "Table session opened successfully", 201);
  } catch (error) {
    logger.error("Failed to open table session", error);
    return sendError(error, "Failed to open table session", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);

// PUT - Update or Release Session
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { sessionId, action, guestCount, notes, newEmployeeId, effectiveSeatCount, adminOverride, releaseReason, linkedTableIds } = data;

    if (!sessionId) {
      return sendError(new Error("Missing ID"), "sessionId is required", 400);
    }

    const session = await TableSession.findOne({ _id: sessionId, restaurant: request.restaurant });
    if (!session) {
      return sendError(new Error("Not Found"), "Session not found", 404);
    }

    if (action === "UPDATE_GUESTS") {
      if (guestCount === undefined || guestCount === null || guestCount === "") {
        return sendError(new Error("Missing field"), "guestCount is required", 400);
      }
      const nextGuests = Number(guestCount);
      if (!Number.isFinite(nextGuests) || nextGuests < 1) {
        return sendError(new Error("Invalid"), "guestCount must be a positive number", 400);
      }

      session.guestCount = Math.floor(nextGuests);
      if (notes !== undefined) session.notes = notes;

      await session.save();
      logger.info(`Session ${session.sessionId} updated guests to ${session.guestCount}`);
      
      // Audit Log
      await OperationalAuditLog.create({
        restaurantId: request.restaurant,
        actorId: request.user.id,
        actorType: actorTypeFromRequest(request),
        actorName: request.user.name || request.user.firstName,
        action: 'GUEST_COUNT_CHANGED',
        floorId: session.floor,
        tableId: session.primaryTable,
        tableSessionId: session._id,
        newValue: { guestCount: session.guestCount }
      });

      emitFloorTableEvent("table:updated", request.restaurant, session.floor, {
        sessionId: session._id,
        guestCount: session.guestCount,
      });
      
      return sendSuccess(session, "Session updated successfully");
    }

    if (action === "RELEASE") {
      if (!session.isSessionOpen) {
        return sendError(new Error("Already Closed"), "This session is already released", 400);
      }

      // Backend verification: Do not silently release an unpaid active order
      const unpaidOrdersCount = await Order.countDocuments({
        _id: { $in: session.activeOrders },
        paymentStatus: { $ne: "PAID" },
        status: { $nin: ["CANCELLED", "WAIVED"] }
      });

      if (unpaidOrdersCount > 0) {
        if (adminOverride && (isSalesAdminRole(request.role || request.user?.role) || request.role === "Manager" || request.user?.role === "Manager")) {
          logger.info(`Admin ${request.user.id} forced release of session ${session.sessionId} with unpaid orders. Reason: ${releaseReason}`);
          session.notes = session.notes ? session.notes + ` | Admin Override Release: ${releaseReason}` : `Admin Override Release: ${releaseReason}`;
        } else {
          return sendError(new Error("Unpaid Orders Exist"), "Cannot release table with unpaid active orders", 400);
        }
      }

      session.status = "RELEASED";
      session.isSessionOpen = false; // RELEASES THE DATABASE LOCK
      session.closedAt = new Date();
      await session.save();

      const releasedIds = await freeSessionTables(session);

      logger.info(`Session ${session.sessionId} released by ${request.user.id}`);
      
      // Audit Log for Release
      await OperationalAuditLog.create({
        restaurantId: request.restaurant,
        actorId: request.user.id,
        actorType: actorTypeFromRequest(request),
        actorName: request.user.name || request.user.firstName,
        action: 'TABLE_RELEASED',
        floorId: session.floor,
        tableId: session.primaryTable,
        tableSessionId: session._id
      });

      // Audit Log if Admin Override was used
      if (adminOverride && unpaidOrdersCount > 0) {
        await OperationalAuditLog.create({
          restaurantId: request.restaurant,
          actorId: request.user.id,
          actorType: 'Admin',
          actorName: request.user.name || request.user.firstName,
          action: 'ADMIN_OVERRIDE',
          floorId: session.floor,
          tableId: session.primaryTable,
          tableSessionId: session._id,
          reason: releaseReason
        });
      }
      
      emitFloorTableEvent("table:released", request.restaurant, session.floor, {
        sessionId: session._id,
        tableId: session.primaryTable,
        tableIds: releasedIds,
      });

      const releasedTables = await Table.find({ _id: { $in: releasedIds } }).select("tableNumber").lean();
      const releasedLabel = joinTableNumbers(releasedTables.map((t) => t.tableNumber));
      await createNotification({
        restaurantId: request.restaurant,
        type: "TABLE_RELEASED",
        title: "Table Released",
        message: `Table ${releasedLabel || ""} was released`,
        tableId: session.primaryTable,
        tableSessionId: session._id,
        employeeId: request.user.id,
        floorId: session.floor,
        priority: "low",
        metadata: { tableNo: releasedLabel || null },
      });

      return sendSuccess(session, "Table released successfully");
    }

    if (action === "PAYMENT_PENDING") {
      session.status = "PAYMENT_PENDING";
      await session.save();
      
      emitFloorTableEvent("table:updated", request.restaurant, session.floor, {
        sessionId: session._id,
        status: "PAYMENT_PENDING",
      });
      
      return sendSuccess(session, "Session status updated to payment pending");
    }

    if (action === "TRANSFER") {
      if (!newEmployeeId) return sendError(new Error("Missing ID"), "newEmployeeId is required for transfer", 400);

      const targetEmployee = await Employee.findOne({
        _id: newEmployeeId,
        restaurant: request.restaurant,
        isActive: true,
        status: { $in: ["Active", "Approved"] },
      })
        .select("_id")
        .lean();

      if (!targetEmployee) {
        return sendError(new Error("Not Found"), "Target employee not found in this restaurant", 404);
      }

      const previousEmployeeId = session.assignedEmployee;
      session.transferHistory.push({
        fromTable: session.primaryTable,
        toTable: session.primaryTable,
        transferredBy: request.user.id,
        transferredAt: new Date()
      });
      // Reassign who can serve the table. Order.processedBy (sales/tip credit) is unchanged.
      session.assignedEmployee = newEmployeeId;
      await session.save();
      logger.info(`Session ${session.sessionId} transferred to ${newEmployeeId}`);
      
      // Audit Log
      await OperationalAuditLog.create({
        restaurantId: request.restaurant,
        actorId: request.user.id,
        actorType: actorTypeFromRequest(request),
        actorName: request.user.name || request.user.firstName,
        action: 'TABLE_TRANSFERRED',
        floorId: session.floor,
        tableId: session.primaryTable,
        tableSessionId: session._id,
        newValue: { newEmployeeId, previousEmployeeId }
      });

      emitFloorTableEvent(
        "table:transferred",
        request.restaurant,
        session.floor,
        { sessionId: session._id, newEmployeeId },
      );

      const transferredTable = await Table.findById(session.primaryTable).select("tableNumber").lean();
      await createNotification({
        restaurantId: request.restaurant,
        type: "TABLE_TRANSFERRED",
        title: "Table Transferred",
        message: `Table ${transferredTable?.tableNumber || ""} was reassigned`,
        tableId: session.primaryTable,
        tableSessionId: session._id,
        employeeId: request.user.id,
        floorId: session.floor,
        priority: "normal",
        metadata: {
          tableNo: transferredTable?.tableNumber || null,
          newEmployeeId,
        },
      });

      return sendSuccess(session, "Session transferred successfully");
    }

    if (action === "RECONFIGURE") {
      const primaryId = resolveDocumentId(session.primaryTable);
      const requestedLinked = Array.isArray(linkedTableIds)
        ? [...new Set(linkedTableIds.map(resolveDocumentId).filter((id) => id && id !== primaryId))]
        : null;

      if (requestedLinked) {
        try {
          await applyLinkedTablesToSession({
            session,
            linkedTableIds: requestedLinked,
            restaurantId: request.restaurant,
            actorId: request.user.id,
            mergeGuestCount: true,
          });
        } catch (linkError) {
          if (linkError instanceof SessionTableError) {
            return sendError(linkError, linkError.message, linkError.statusCode);
          }
          throw linkError;
        }
      }

      const combinedSeats = await sumSeatsForTableIds(collectSessionTableIds(session));
      const nextSeatCount =
        effectiveSeatCount === undefined || effectiveSeatCount === null || effectiveSeatCount === ""
          ? combinedSeats
          : Number(effectiveSeatCount);
      if (!Number.isFinite(nextSeatCount) || nextSeatCount < 1) {
        return sendError(new Error("Missing field"), "effectiveSeatCount is required", 400);
      }

      session.effectiveSeatCount = nextSeatCount;
      await session.save();

      const combinedTableNo = await syncSessionOrderTableLabels(session);
      logger.info(`Session ${session.sessionId} reconfigured to ${nextSeatCount} seats tables=${combinedTableNo || ""}`);

      await OperationalAuditLog.create({
        restaurantId: request.restaurant,
        actorId: request.user.id,
        actorType: actorTypeFromRequest(request),
        actorName: request.user.name || request.user.firstName,
        action: 'TABLE_RECONFIGURED',
        floorId: session.floor,
        tableId: session.primaryTable,
        tableSessionId: session._id,
        newValue: {
          effectiveSeatCount: nextSeatCount,
          linkedTableIds: collectSessionTableIds(session),
        }
      });

      emitFloorTableEvent("table:updated", request.restaurant, session.floor, {
        sessionId: session._id,
        effectiveSeatCount: nextSeatCount,
        linkedTableIds: (session.linkedTables || []).map((id) => String(id)),
      });

      return sendSuccess(session, "Table reconfigured successfully");
    }

    return sendError(new Error("Invalid Action"), "Valid actions are UPDATE_GUESTS, PAYMENT_PENDING, RELEASE, TRANSFER, RECONFIGURE", 400);
  } catch (error) {
    logger.error("Failed to update table session", error);
    return sendError(error, "Failed to update table session", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);
