import OperationalAuditLog from "@/models/OperationalAuditLog";
import {
  dateRangeBounds,
  toObjectId,
} from "@/lib/reports/financial/match";
import {
  formatRestaurantDate,
  formatRestaurantTime,
} from "@/lib/reports/financial/format";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import { adminReportMeta } from "./query";

const FLOOR_ACTIONS = new Set([
  "TABLE_ASSIGNED",
  "TABLE_RELEASED",
  "TABLE_TRANSFERRED",
  "GUEST_COUNT_CHANGED",
  "TABLE_RECONFIGURED",
  "ADMIN_OVERRIDE",
]);

const ORDER_ACTIONS = new Set([
  "ORDER_CREATED",
  "ORDER_UPDATED",
  "ORDER_CANCELLED",
]);

function moduleForAction(action) {
  if (FLOOR_ACTIONS.has(action)) return "Floor";
  if (ORDER_ACTIONS.has(action)) return "Orders";
  if (action === "PAYMENT_COMPLETED") return "Payments";
  return "Operations";
}

function describeActivity(doc) {
  if (doc.reason) return String(doc.reason);
  const value = doc.newValue;
  if (!value || typeof value !== "object") return "—";
  if (value.method) return `Payment method: ${value.method}`;
  if (value.guestCount != null) return `Guest count: ${value.guestCount}`;
  if (value.status && value.orderNumber) {
    return `Order ${value.orderNumber} set to ${value.status}`;
  }
  if (value.status) return `Status: ${value.status}`;
  if (value.orderNumber) return `Order ${value.orderNumber}`;
  if (value.newEmployeeId) return "Table reassigned to another employee";
  if (value.effectiveSeatCount != null) {
    return `Seat count: ${value.effectiveSeatCount}`;
  }
  if (value.linkedTableIds) return "Linked tables updated";
  return "—";
}

function targetLabel(doc) {
  const parts = [];
  const orderNumber = doc.orderDoc?.orderNumber;
  const tableNo = doc.tableDoc?.tableNumber;
  if (orderNumber) parts.push(`Order ${orderNumber}`);
  if (tableNo) parts.push(`Table ${tableNo}`);
  if (!parts.length && doc.orderId) parts.push("Order");
  if (!parts.length && doc.tableId) parts.push("Table");
  return parts.join(" · ") || "—";
}

export async function buildAdminActivity({ restaurantId, ...filters }) {
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;

  const match = {
    restaurantId: toObjectId(restaurantId),
    timestamp: { $gte: start, $lt: end },
  };
  if (filters.eventType && filters.eventType !== "ALL") {
    match.action = filters.eventType;
  }

  const [facet] = await OperationalAuditLog.aggregate([
    { $match: match },
    {
      $facet: {
        total: [{ $count: "count" }],
        actionCounts: [{ $group: { _id: "$action", count: { $sum: 1 } } }],
        rows: [
          { $sort: { timestamp: -1, _id: -1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          {
            $lookup: {
              from: "orders",
              localField: "orderId",
              foreignField: "_id",
              as: "orderDoc",
            },
          },
          {
            $lookup: {
              from: "tables",
              localField: "tableId",
              foreignField: "_id",
              as: "tableDoc",
            },
          },
          {
            $addFields: {
              orderDoc: { $arrayElemAt: ["$orderDoc", 0] },
              tableDoc: { $arrayElemAt: ["$tableDoc", 0] },
            },
          },
        ],
      },
    },
  ]);

  const total = facet?.total?.[0]?.count || 0;
  const actionCounts = {};
  for (const row of facet?.actionCounts || []) {
    actionCounts[row._id] = row.count;
  }

  const rows = (facet?.rows || []).map((doc) => ({
    id: String(doc._id),
    date: formatRestaurantDate(doc.timestamp, tz),
    time: formatRestaurantTime(doc.timestamp, tz),
    timestamp: doc.timestamp,
    admin: doc.actorName?.trim() || "Name not recorded",
    actorType: doc.actorType || "—",
    action: doc.action,
    module: moduleForAction(doc.action),
    description: describeActivity(doc),
    target: targetLabel(doc),
    ip: "Not stored",
  }));

  return {
    meta: adminReportMeta(filters),
    empty: total === 0,
    note: "Only floor and POS events are recorded. Back-office admin actions (employees, prices, taxes, settings, login) are not logged. IP and device are not stored.",
    summary: {
      total,
      actionCounts,
    },
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    rows,
  };
}
