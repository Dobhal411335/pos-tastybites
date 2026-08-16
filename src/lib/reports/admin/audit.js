import Order from "@/models/Order";
import { r2 } from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import { baseOrderMatch } from "@/lib/reports/financial/match";
import {
  formatRestaurantDate,
  formatRestaurantTime,
} from "@/lib/reports/financial/format";
import { EMPLOYEE_LOOKUP } from "@/lib/reports/financial/metrics";
import { adminReportMeta } from "./query";

const REASON_MISSING = "Reason not recorded";

function eventAmount(eventType, order) {
  if (eventType === "DISCOUNT_APPLIED") return r2(order.discountTotal);
  if (eventType === "GIFT_CARD_USED") return r2(order.giftcardUsedAmount);
  return r2(order.totalAmount);
}

function eventReason(eventType, order) {
  if (eventType === "ORDER_CANCELLED") {
    if (order.status === "WAIVED") {
      return order.waiveReason?.trim() || REASON_MISSING;
    }
    return REASON_MISSING;
  }
  if (eventType === "DISCOUNT_APPLIED") {
    return order.discountCode?.trim() || REASON_MISSING;
  }
  if (eventType === "GIFT_CARD_USED") {
    return order.giftcardCode?.trim() || REASON_MISSING;
  }
  return REASON_MISSING;
}

export async function buildAdminAudit({ restaurantId, ...filters }) {
  const tz = filters.timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const eventType = filters.eventType && filters.eventType !== "ALL"
    ? filters.eventType
    : null;

  const match = baseOrderMatch({ restaurantId, ...filters });
  const exceptionOr = [];
  if (!eventType || eventType === "ORDER_CANCELLED") {
    exceptionOr.push({ status: { $in: ["CANCELLED", "WAIVED"] } });
  }
  if (!eventType || eventType === "DISCOUNT_APPLIED") {
    exceptionOr.push({ discountTotal: { $gt: 0 } });
  }
  if (!eventType || eventType === "GIFT_CARD_USED") {
    exceptionOr.push({ giftcardUsedAmount: { $gt: 0 } });
  }
  if (!exceptionOr.length) {
    return {
      meta: adminReportMeta(filters),
      empty: true,
      notes: {
        unsupported:
          "Payment failures, refunds, voids, and manual adjustments are not recorded as separate events.",
      },
      summary: {
        total: 0,
        cancelled: 0,
        discounted: 0,
        giftCard: 0,
        refunds: 0,
        voids: 0,
        paymentFailures: 0,
        manualAdjustments: 0,
      },
      page,
      pageSize,
      total: 0,
      pageCount: 1,
      rows: [],
    };
  }
  match.$and = [...(match.$and || []), { $or: exceptionOr }];

  const [facet] = await Order.aggregate([
    { $match: match },
    ...EMPLOYEE_LOOKUP,
    {
      $addFields: {
        events: {
          $concatArrays: [
            {
              $cond: [
                { $in: ["$status", ["CANCELLED", "WAIVED"]] },
                ["ORDER_CANCELLED"],
                [],
              ],
            },
            {
              $cond: [
                { $gt: [{ $ifNull: ["$discountTotal", 0] }, 0] },
                ["DISCOUNT_APPLIED"],
                [],
              ],
            },
            {
              $cond: [
                { $gt: [{ $ifNull: ["$giftcardUsedAmount", 0] }, 0] },
                ["GIFT_CARD_USED"],
                [],
              ],
            },
          ],
        },
      },
    },
    { $unwind: "$events" },
    ...(eventType ? [{ $match: { events: eventType } }] : []),
    {
      $facet: {
        total: [{ $count: "count" }],
        typeCounts: [{ $group: { _id: "$events", count: { $sum: 1 } } }],
        rows: [
          { $sort: { updatedAt: -1, _id: -1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
        ],
      },
    },
  ]);

  const total = facet?.total?.[0]?.count || 0;
  const typeCounts = {
    ORDER_CANCELLED: 0,
    DISCOUNT_APPLIED: 0,
    GIFT_CARD_USED: 0,
  };
  for (const row of facet?.typeCounts || []) {
    if (Object.prototype.hasOwnProperty.call(typeCounts, row._id)) {
      typeCounts[row._id] = row.count;
    }
  }

  const rows = (facet?.rows || []).map((order) => ({
    id: `${order._id}:${order.events}`,
    date: formatRestaurantDate(order.updatedAt, tz),
    time: formatRestaurantTime(order.updatedAt, tz),
    orderNumber: order.orderNumber || "—",
    employee: order.employeeName || "Unknown",
    eventType: order.events,
    amount: eventAmount(order.events, order),
    reason: eventReason(order.events, order),
    status: order.status,
  }));

  return {
    meta: adminReportMeta(filters),
    empty: total === 0,
    notes: {
      unsupported:
        "Payment failures, refunds, voids, and manual adjustments are not recorded as separate events.",
    },
    summary: {
      total,
      cancelled: typeCounts.ORDER_CANCELLED,
      discounted: typeCounts.DISCOUNT_APPLIED,
      giftCard: typeCounts.GIFT_CARD_USED,
      refunds: 0,
      voids: 0,
      paymentFailures: 0,
      manualAdjustments: 0,
    },
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    rows,
  };
}
