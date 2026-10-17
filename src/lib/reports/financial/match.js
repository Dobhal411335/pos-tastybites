import mongoose from "mongoose";
import { businessDateBounds } from "@/lib/eod/eodHelpers";
import { ACTIVE_ORDER_FILTER } from "@/lib/orders/activeOrderFilter";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  businessDayOrderTimeClause,
  reportDateRangeOrderTimeClause,
} from "@/lib/public/offerFulfillment";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "PAID",
  "CANCELLED",
  "WAIVED",
];

export const PAYMENT_FILTERS = ["CASH", "CARD", "GIFT_CARD"];

export const ORDER_SORT_FIELDS = new Set([
  "updatedAt",
  "createdAt",
  "orderNumber",
  "invoiceNumber",
  "totalAmount",
  "subTotal",
  "status",
  "paymentMethod",
]);

export function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(String(id));
}

export function dateRangeBounds(dateFrom, dateTo) {
  const start = businessDateBounds(dateFrom).start;
  const end = businessDateBounds(dateTo).end;
  return { start, end };
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Paid revenue for a restaurant business-day window: active + paid + not cancelled/waived.
 * Shared by Financial reports and EOD so Overview and Day Closing reconcile.
 * Treats either paymentStatus or status as PAID (covers POS / takeaway / staff / online).
 * Does not filter by source — WALK_IN, STAFF, ONLINE, and POS all count.
 * Uses createdAt OR updatedAt so same-day create/pay always lands on the day.
 * Future offerFulfillmentDate bookings are excluded until their fulfillment day;
 * pass businessDate (single day) or dateFrom+dateTo (range).
 */
export function paidRevenueOrderMatch({
  restaurantId,
  start,
  end,
  businessDate = null,
  dateFrom = null,
  dateTo = null,
}) {
  const rid = toObjectId(restaurantId);
  let timeClause;
  if (businessDate) {
    timeClause = businessDayOrderTimeClause(businessDate, start, end);
  } else if (dateFrom && dateTo) {
    timeClause = reportDateRangeOrderTimeClause(dateFrom, dateTo, start, end);
  } else {
    // Fallback: still exclude bookings scheduled after the window end day.
    const endDay =
      end instanceof Date && !Number.isNaN(end.getTime())
        ? end.toISOString().slice(0, 10)
        : null;
    timeClause = {
      $and: [
        {
          $or: [
            { updatedAt: { $gte: start, $lt: end } },
            { createdAt: { $gte: start, $lt: end } },
          ],
        },
        {
          $or: [
            { offerFulfillmentDate: null },
            { offerFulfillmentDate: { $exists: false } },
            { offerFulfillmentDate: "" },
            ...(endDay ? [{ offerFulfillmentDate: { $lte: endDay } }] : []),
          ],
        },
      ],
    };
  }
  return {
    restaurantId: rid,
    ...ACTIVE_ORDER_FILTER,
    status: { $nin: ["CANCELLED", "WAIVED"] },
    $and: [
      { $or: [{ paymentStatus: "PAID" }, { status: "PAID" }] },
      timeClause,
    ],
  };
}

/**
 * Base match on restaurant + report window (payment / last financial event).
 * Uses offer-aware date matching so future-dated offer bookings stay out of
 * admin/financial lists until their fulfillment day.
 */
export function baseOrderMatch({
  restaurantId,
  dateFrom,
  dateTo,
  employeeId,
  status,
  table,
  guest,
  search,
}) {
  const rid = toObjectId(restaurantId);
  const { start, end } = dateRangeBounds(dateFrom, dateTo);
  const timeClause = reportDateRangeOrderTimeClause(
    dateFrom,
    dateTo,
    start,
    end,
  );
  const match = {
    restaurantId: rid,
    ...ACTIVE_ORDER_FILTER,
    $and: [timeClause],
  };

  const emp = toObjectId(employeeId);
  if (emp) match.processedBy = emp;

  if (status && status !== "ALL") {
    match.status = status;
  }

  if (table) {
    match.tableNo = { $regex: escapeRegex(table), $options: "i" };
  }

  const guestOrSearch = [];
  if (guest) {
    const g = escapeRegex(guest);
    guestOrSearch.push(
      { partyName: { $regex: g, $options: "i" } },
      { guestName: { $regex: g, $options: "i" } },
      { contactNumber: { $regex: g, $options: "i" } }
    );
  }
  if (search) {
    const s = escapeRegex(search);
    guestOrSearch.push(
      { orderNumber: { $regex: s, $options: "i" } },
      { invoiceNumber: { $regex: s, $options: "i" } },
      { originalInvoiceNumber: { $regex: s, $options: "i" } },
      { partyName: { $regex: s, $options: "i" } },
      { guestName: { $regex: s, $options: "i" } },
      { contactNumber: { $regex: s, $options: "i" } }
    );
  }
  if (guestOrSearch.length) {
    match.$and.push({ $or: guestOrSearch });
  }

  return match;
}

/**
 * Paid orders that count toward sales (same rule as EOD / guest directory).
 */
export function paidRevenueMatch(filters) {
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);
  const businessDate =
    filters.dateFrom &&
    filters.dateTo &&
    String(filters.dateFrom) === String(filters.dateTo)
      ? String(filters.dateFrom)
      : null;
  const match = paidRevenueOrderMatch({
    restaurantId: filters.restaurantId,
    start,
    end,
    businessDate,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  const emp = toObjectId(filters.employeeId);
  if (emp) match.processedBy = emp;

  if (filters.status && filters.status !== "ALL" && filters.status !== "PAID") {
    match.status = filters.status;
  }

  if (filters.table) {
    match.tableNo = { $regex: escapeRegex(filters.table), $options: "i" };
  }

  const guestOrSearch = [];
  if (filters.guest) {
    const g = escapeRegex(filters.guest);
    guestOrSearch.push(
      { partyName: { $regex: g, $options: "i" } },
      { guestName: { $regex: g, $options: "i" } },
      { contactNumber: { $regex: g, $options: "i" } }
    );
  }
  if (filters.search) {
    const s = escapeRegex(filters.search);
    guestOrSearch.push(
      { orderNumber: { $regex: s, $options: "i" } },
      { invoiceNumber: { $regex: s, $options: "i" } },
      { originalInvoiceNumber: { $regex: s, $options: "i" } },
      { partyName: { $regex: s, $options: "i" } },
      { guestName: { $regex: s, $options: "i" } },
      { contactNumber: { $regex: s, $options: "i" } }
    );
  }
  if (guestOrSearch.length) {
    // Keep paid/date $and clauses; nest guest search as an extra $and entry.
    match.$and = [...(match.$and || []), { $or: guestOrSearch }];
  }

  return match;
}

export function paymentTenderMatch(paymentMethod) {
  if (!paymentMethod || paymentMethod === "ALL") return null;
  if (paymentMethod === "CASH") return { tenderCash: { $gt: 0 } };
  if (paymentMethod === "CARD") return { tenderCard: { $gt: 0 } };
  if (paymentMethod === "GIFT_CARD") return { tenderGift: { $gt: 0 } };
  return null;
}

export function dayKeyExpr(timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  return {
    $dateToString: {
      format: "%Y-%m-%d",
      date: "$updatedAt",
      timezone: timeZone,
    },
  };
}
