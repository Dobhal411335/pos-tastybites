import Order from "@/models/Order";
import { r2 } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  formatRestaurantDate,
  formatRestaurantTime,
} from "@/lib/reports/financial/format";
import {
  baseOrderMatch,
  ORDER_STATUSES,
} from "@/lib/reports/financial/match";
import {
  EMPLOYEE_LOOKUP,
  financialPipeline,
} from "@/lib/reports/financial/metrics";
import { adminReportMeta } from "./query";

const ORDER_LIST_PROJECT = {
  _id: 1,
  orderNumber: 1,
  createdAt: 1,
  updatedAt: 1,
  status: 1,
  paymentStatus: 1,
  paymentMethod: 1,
  source: 1,
  tableNo: 1,
  partyName: 1,
  guestName: 1,
  guestCount: 1,
  totalAmount: 1,
  tipAmount: 1,
  employeeName: 1,
};

function mapOrderRow(order, tz) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    date: formatRestaurantDate(order.updatedAt || order.createdAt, tz),
    time: formatRestaurantTime(order.updatedAt || order.createdAt, tz),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod || "—",
    source: order.source || "POS",
    table: order.tableNo || "—",
    guest: order.partyName || order.guestName || "—",
    guestCount: order.guestCount == null ? null : Number(order.guestCount),
    total: r2(order.totalAmount),
    tips: r2(order.tipAmount),
    employee: order.employeeName || "Unknown",
  };
}

export async function buildAdminTodayOrders({ restaurantId, ...filters }) {
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const match = baseOrderMatch({ restaurantId, ...filters });
  const pipeline = financialPipeline(match, filters.paymentMethod);

  const [facet] = await Order.aggregate([
    ...pipeline,
    ...EMPLOYEE_LOOKUP,
    {
      $facet: {
        statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        total: [{ $count: "count" }],
        rows: [
          { $sort: { updatedAt: -1, _id: -1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          { $project: ORDER_LIST_PROJECT },
        ],
      },
    },
  ]);

  const statusCounts = {
    total: 0,
    PENDING: 0,
    CONFIRMED: 0,
    COMPLETED: 0,
    PAID: 0,
    CANCELLED: 0,
    WAIVED: 0,
  };
  for (const row of facet?.statusCounts || []) {
    if (ORDER_STATUSES.includes(row._id)) {
      statusCounts[row._id] = row.count;
    }
    statusCounts.total += row.count;
  }

  const total = facet?.total?.[0]?.count || 0;
  const openCount =
    statusCounts.PENDING + statusCounts.CONFIRMED + statusCounts.COMPLETED;

  return {
    meta: adminReportMeta(filters),
    empty: total === 0,
    counts: {
      total,
      open: openCount,
      paid: statusCounts.PAID,
      cancelled: statusCounts.CANCELLED,
      waived: statusCounts.WAIVED,
      pending: statusCounts.PENDING,
      confirmed: statusCounts.CONFIRMED,
      completed: statusCounts.COMPLETED,
    },
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    rows: (facet?.rows || []).map((row) => mapOrderRow(row, tz)),
  };
}
