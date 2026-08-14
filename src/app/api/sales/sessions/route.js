import { withAuth } from "@/utils/auth";
import TableSession from "@/models/floor/TableSession";
import Table from "@/models/floor/Table";
import Order from "@/models/Order";
import OperationalAuditLog from "@/models/OperationalAuditLog";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { v4 as uuidv4 } from "uuid";
import { createNotification } from "@/lib/notifications/notificationService";
import { isSalesAdminRole } from "@/utils/roles";

function actorTypeFromRequest(request) {
  const role = request.role || request.user?.role;
  return isSalesAdminRole(role) || role === "Manager" ? "Admin" : "Employee";
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
      .populate("floor", "name")
      .populate("assignedEmployee", "firstName lastName name")
      .populate("openedBy", "firstName lastName name")
      .lean();

    if (sessionId && sessions.length === 0) {
      return sendError(new Error("Not Found"), "Session not found", 404);
    }

    return sendSuccess(sessionId ? sessions[0] : sessions, "Sessions retrieved successfully");
  } catch (error) {
    logger.error("Failed to retrieve sessions", error);
    return sendError(error, "Failed to retrieve sessions", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);

// POST - Create/Open a Table Session
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { tableId, guestCount, notes } = data;

    if (!tableId) {
      return sendError(new Error("Missing fields"), "tableId is required", 400);
    }

    const table = await Table.findOne({ _id: tableId, restaurant: request.restaurant });
    if (!table) {
      return sendError(new Error("Not Found"), "Physical table not found", 404);
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

    logger.info(`Table session ${session.sessionId} opened for table ${table.tableNumber} by ${request.user.id}`);

    // Populate the newly created session
    const populatedSession = await TableSession.findById(session._id)
      .populate("primaryTable", "tableNumber shape seats")
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
      newValue: { guestCount: guestCount || 1 }
    });

    if (global.io) {
      global.io.to(`floor:${table.floor}`).emit('table:assigned', { sessionId: session._id, tableId: table._id });
    }

    await createNotification({
      restaurantId: request.restaurant,
      type: "TABLE_ASSIGNED",
      title: "Table Assigned",
      message: `Table ${table.tableNumber} opened${guestCount ? ` • ${guestCount} guests` : ""}`,
      tableId: table._id,
      tableSessionId: session._id,
      employeeId: request.user.id,
      floorId: table.floor,
      priority: "normal",
      metadata: {
        tableNo: table.tableNumber,
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
    const { sessionId, action, guestCount, notes, newEmployeeId, effectiveSeatCount, adminOverride, releaseReason } = data;

    if (!sessionId) {
      return sendError(new Error("Missing ID"), "sessionId is required", 400);
    }

    const session = await TableSession.findOne({ _id: sessionId, restaurant: request.restaurant });
    if (!session) {
      return sendError(new Error("Not Found"), "Session not found", 404);
    }

    if (action === "UPDATE_GUESTS") {
      if (guestCount !== undefined) session.guestCount = guestCount;
      if (notes !== undefined) session.notes = notes;

      await session.save();
      logger.info(`Session ${session.sessionId} updated guests to ${guestCount}`);
      
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
        newValue: { guestCount }
      });

      if (global.io) global.io.to(`floor:${session.floor}`).emit('table:updated', { sessionId: session._id, guestCount });
      
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

      // Free the physical table
      await Table.findByIdAndUpdate(session.primaryTable, { status: "Available" });

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
      
      if (global.io) global.io.to(`floor:${session.floor}`).emit('table:released', { sessionId: session._id, tableId: session.primaryTable });

      const releasedTable = await Table.findById(session.primaryTable).select("tableNumber").lean();
      await createNotification({
        restaurantId: request.restaurant,
        type: "TABLE_RELEASED",
        title: "Table Released",
        message: `Table ${releasedTable?.tableNumber || ""} was released`,
        tableId: session.primaryTable,
        tableSessionId: session._id,
        employeeId: request.user.id,
        floorId: session.floor,
        priority: "low",
        metadata: { tableNo: releasedTable?.tableNumber || null },
      });

      return sendSuccess(session, "Table released successfully");
    }

    if (action === "PAYMENT_PENDING") {
      session.status = "PAYMENT_PENDING";
      await session.save();
      
      if (global.io) global.io.to(`floor:${session.floor}`).emit('table:updated', { sessionId: session._id, status: "PAYMENT_PENDING" });
      
      return sendSuccess(session, "Session status updated to payment pending");
    }

    if (action === "TRANSFER") {
      if (!newEmployeeId) return sendError(new Error("Missing ID"), "newEmployeeId is required for transfer", 400);

      session.transferHistory.push({
        fromTable: session.primaryTable,
        toTable: session.primaryTable,
        transferredBy: request.user.id,
        transferredAt: new Date()
      });
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
        newValue: { newEmployeeId }
      });

      if (global.io) global.io.to(`floor:${session.floor}`).emit('table:transferred', { sessionId: session._id, newEmployeeId });

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
      if (effectiveSeatCount === undefined) return sendError(new Error("Missing field"), "effectiveSeatCount is required", 400);
      
      session.effectiveSeatCount = effectiveSeatCount;
      await session.save();
      logger.info(`Session ${session.sessionId} reconfigured to ${effectiveSeatCount} seats`);
      
      // Audit Log
      await OperationalAuditLog.create({
        restaurantId: request.restaurant,
        actorId: request.user.id,
        actorType: actorTypeFromRequest(request),
        actorName: request.user.name || request.user.firstName,
        action: 'TABLE_RECONFIGURED',
        floorId: session.floor,
        tableId: session.primaryTable,
        tableSessionId: session._id,
        newValue: { effectiveSeatCount }
      });

      if (global.io) global.io.to(`floor:${session.floor}`).emit('table:updated', { sessionId: session._id, effectiveSeatCount });
      
      return sendSuccess(session, "Table reconfigured successfully");
    }

    return sendError(new Error("Invalid Action"), "Valid actions are UPDATE_GUESTS, PAYMENT_PENDING, RELEASE, TRANSFER, RECONFIGURE", 400);
  } catch (error) {
    logger.error("Failed to update table session", error);
    return sendError(error, "Failed to update table session", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER"]);
