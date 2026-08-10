import Notification from "@/models/Notification";
import EmployeeSession from "@/models/employee/EmployeeSession";
import { logger } from "@/utils/logger";

const HIGH_PRIORITY_TYPES = new Set([
  "NEW_ORDER",
  "PAYMENT_COMPLETED",
  "KOT_READY",
  "PRINT_FAILED",
  "PAYMENT_FAILED",
  "ORDER_CANCELLED",
]);

export function isHighPriorityType(type) {
  return HIGH_PRIORITY_TYPES.has(type);
}

function toClientNotification(doc, userId) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const uid = String(userId);
  const isRead = (plain.readBy || []).some((r) => String(r.userId) === uid);
  const readAt =
    (plain.readBy || []).find((r) => String(r.userId) === uid)?.readAt || null;

  return {
    _id: plain._id,
    id: String(plain._id),
    type: plain.type,
    title: plain.title,
    message: plain.message,
    priority: plain.priority,
    orderId: plain.orderId ? String(plain.orderId) : null,
    tableId: plain.tableId ? String(plain.tableId) : null,
    tableSessionId: plain.tableSessionId ? String(plain.tableSessionId) : null,
    employeeId: plain.employeeId ? String(plain.employeeId) : null,
    printJobId: plain.printJobId ? String(plain.printJobId) : null,
    metadata: plain.metadata || {},
    recipientScope: plain.recipientScope,
    isRead,
    readAt,
    createdAt: plain.createdAt,
    category: categorizeType(plain.type),
  };
}

export function categorizeType(type) {
  if (
    [
      "NEW_ORDER",
      "ORDER_UPDATED",
      "ORDER_CANCELLED",
      "ORDER_COMPLETED",
      "KOT_CREATED",
      "KOT_READY",
    ].includes(type)
  ) {
    return "Orders";
  }
  if (["PAYMENT_COMPLETED", "PAYMENT_FAILED", "REFUND"].includes(type)) {
    return "Payments";
  }
  if (
    [
      "TABLE_ASSIGNED",
      "TABLE_RELEASED",
      "TABLE_TRANSFERRED",
      "TABLE_REASSIGNED",
    ].includes(type)
  ) {
    return "Tables";
  }
  if (
    ["EMPLOYEE_LOGIN", "EMPLOYEE_LOGOUT", "OVERTIME"].includes(type)
  ) {
    return "Employees";
  }
  return "System";
}

function audienceQuery(restaurantId, userId) {
  return {
    restaurantId,
    $or: [
      { recipientScope: "RESTAURANT" },
      { recipientScope: "USER", recipientId: userId },
    ],
  };
}

/** Same calendar-day window as today's sales orders (local midnight → end of day). */
function todayCreatedAtFilter() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

function emitNotification(event, restaurantId, floorId, recipientId, payload) {
  if (!global.io) return;

  // Emit to exactly one primary room so clients in multiple rooms
  // (restaurant + floor) do not receive the same event twice.
  if (recipientId) {
    global.io.to(`employee:${recipientId}`).emit(event, payload);
    return;
  }
  if (restaurantId) {
    global.io.to(`restaurant:${restaurantId}`).emit(event, payload);
  }
}

/**
 * Persist notification then emit realtime event.
 * DB is source of truth; socket is delivery only.
 */
export async function createNotification({
  restaurantId,
  type,
  title,
  message,
  priority,
  orderId = null,
  tableId = null,
  tableSessionId = null,
  employeeId = null,
  printJobId = null,
  metadata = {},
  recipientScope = "RESTAURANT",
  recipientId = null,
  floorId = null,
  silent = false,
}) {
  try {
    const resolvedPriority =
      priority || (isHighPriorityType(type) ? "high" : "normal");

    const doc = await Notification.create({
      restaurantId,
      type,
      title,
      message,
      priority: resolvedPriority,
      orderId,
      tableId,
      tableSessionId,
      employeeId,
      printJobId,
      metadata,
      recipientScope,
      recipientId: recipientScope === "USER" ? recipientId : null,
      recipientType: "SALES",
      readBy: [],
    });

    // Payload without full readBy — clients merge by id
    const payload = {
      id: String(doc._id),
      _id: doc._id,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      priority: doc.priority,
      orderId: doc.orderId,
      tableId: doc.tableId,
      tableSessionId: doc.tableSessionId,
      employeeId: doc.employeeId,
      printJobId: doc.printJobId,
      metadata: doc.metadata || {},
      recipientScope: doc.recipientScope,
      recipientId: doc.recipientId,
      isRead: false,
      createdAt: doc.createdAt,
      category: categorizeType(doc.type),
      playSound: isHighPriorityType(doc.type),
    };

    if (!silent) {
      emitNotification(
        "notification.created",
        restaurantId,
        floorId,
        recipientScope === "USER" ? recipientId : null,
        payload
      );
    }

    return doc;
  } catch (err) {
    logger.error("Failed to create notification", err);
    return null;
  }
}

/** Backfill today's clock-in/out events so the Employees tab shows existing sessions. */
export async function ensureTodayEmployeeActivityNotifications(restaurantId) {
  const createdAt = todayCreatedAtFilter();

  const sessions = await EmployeeSession.find({
    restaurant: restaurantId,
    loginTime: createdAt,
  })
    .populate("employee", "firstName lastName role employeeId")
    .lean();

  for (const session of sessions) {
    const employee = session.employee;
    if (!employee) continue;

    const employeeName = `${employee.firstName} ${employee.lastName || ""}`.trim();
    const sessionId = String(session._id);

    const loginExists = await Notification.exists({
      restaurantId,
      type: "EMPLOYEE_LOGIN",
      "metadata.sessionId": sessionId,
    });

    if (!loginExists) {
      await Notification.create({
        restaurantId,
        type: "EMPLOYEE_LOGIN",
        title: "Employee Clocked In",
        message: `${employeeName} logged in`,
        employeeId: employee._id,
        priority: "low",
        recipientScope: "RESTAURANT",
        recipientType: "SALES",
        metadata: {
          sessionId,
          employeeName,
          employeeRole: employee.role,
          employeeCode: employee.employeeId || "",
          loginTime: session.loginTime,
        },
        readBy: [],
        createdAt: session.loginTime,
        updatedAt: session.loginTime,
      });
    }

    if (!session.logoutTime) continue;

    const logoutExists = await Notification.exists({
      restaurantId,
      type: "EMPLOYEE_LOGOUT",
      "metadata.sessionId": sessionId,
    });

    if (!logoutExists) {
      const duration = session.duration || 0;
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const durationLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      await Notification.create({
        restaurantId,
        type: "EMPLOYEE_LOGOUT",
        title: "Employee Clocked Out",
        message: `${employeeName} logged out · ${durationLabel} on shift`,
        employeeId: employee._id,
        priority: "low",
        recipientScope: "RESTAURANT",
        recipientType: "SALES",
        metadata: {
          sessionId,
          employeeName,
          employeeRole: employee.role,
          employeeCode: employee.employeeId || "",
          logoutTime: session.logoutTime,
          durationSeconds: duration,
          durationLabel,
        },
        readBy: [],
        createdAt: session.logoutTime,
        updatedAt: session.logoutTime,
      });
    }
  }
}

export async function listNotifications({
  restaurantId,
  userId,
  filter = "ALL",
  page = 1,
  limit = 30,
}) {
  const query = {
    ...audienceQuery(restaurantId, userId),
    createdAt: todayCreatedAtFilter(),
  };

  if (filter === "UNREAD") {
    query.readBy = { $not: { $elemMatch: { userId } } };
  } else if (filter === "Orders") {
    query.type = {
      $in: [
        "NEW_ORDER",
        "ORDER_UPDATED",
        "ORDER_CANCELLED",
        "ORDER_COMPLETED",
        "KOT_CREATED",
        "KOT_READY",
      ],
    };
  } else if (filter === "Payments") {
    query.type = { $in: ["PAYMENT_COMPLETED", "PAYMENT_FAILED", "REFUND"] };
  } else if (filter === "Tables") {
    query.type = {
      $in: [
        "TABLE_ASSIGNED",
        "TABLE_RELEASED",
        "TABLE_TRANSFERRED",
        "TABLE_REASSIGNED",
      ],
    };
  } else if (filter === "Employees") {
    query.type = { $in: ["EMPLOYEE_LOGIN", "EMPLOYEE_LOGOUT", "OVERTIME"] };
  } else if (filter === "System") {
    query.type = { $in: ["PRINT_FAILED", "SYSTEM_ALERT"] };
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [rows, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
  ]);

  return {
    items: rows.map((r) => toClientNotification(r, userId)),
    total,
    page,
    limit,
    hasMore: skip + rows.length < total,
  };
}

export async function countUnread({ restaurantId, userId }) {
  const query = {
    ...audienceQuery(restaurantId, userId),
    createdAt: todayCreatedAtFilter(),
    readBy: { $not: { $elemMatch: { userId } } },
  };
  return Notification.countDocuments(query);
}

export async function markNotificationRead({
  restaurantId,
  userId,
  notificationId,
}) {
  const query = {
    _id: notificationId,
    ...audienceQuery(restaurantId, userId),
  };

  const doc = await Notification.findOne(query);
  if (!doc) return null;

  const already = doc.readBy.some((r) => String(r.userId) === String(userId));
  if (!already) {
    doc.readBy.push({ userId, readAt: new Date() });
    await doc.save();
  }

  const payload = {
    id: String(doc._id),
    userId: String(userId),
    readAt: new Date(),
  };
  emitNotification(
    "notification.read",
    restaurantId,
    null,
    userId,
    payload
  );

  return toClientNotification(doc, userId);
}

export async function markAllNotificationsRead({ restaurantId, userId }) {
  const query = {
    ...audienceQuery(restaurantId, userId),
    createdAt: todayCreatedAtFilter(),
    readBy: { $not: { $elemMatch: { userId } } },
  };

  const unread = await Notification.find(query).select("_id").lean();
  if (unread.length === 0) {
    return { modified: 0 };
  }

  const now = new Date();
  await Notification.updateMany(query, {
    $push: { readBy: { userId, readAt: now } },
  });

  emitNotification("notification.read_all", restaurantId, null, userId, {
    userId: String(userId),
    count: unread.length,
    readAt: now,
  });

  return { modified: unread.length };
}
