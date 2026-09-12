import mongoose from "mongoose";
import { businessDateBounds } from "@/lib/eod/eodHelpers";
import { ACTIVE_ORDER_FILTER } from "@/lib/orders/activeOrderFilter";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";

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
 * Paid revenue for a UTC window: active + PAID + not cancelled/waived + updatedAt.
 * Shared by Financial reports and EOD so Overview and Day Closing reconcile.
 */
export function paidRevenueOrderMatch({ restaurantId, start, end }) {
  const rid = toObjectId(restaurantId);
  return {
    restaurantId: rid,
    ...ACTIVE_ORDER_FILTER,
    paymentStatus: "PAID",
    status: { $nin: ["CANCELLED", "WAIVED"] },
    updatedAt: { $gte: start, $lt: end },
  };
}

/**
 * Base match on restaurant + updatedAt window (payment / last financial event).
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
  const match = {
    restaurantId: rid,
    ...ACTIVE_ORDER_FILTER,
    updatedAt: { $gte: start, $lt: end },
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
    match.$or = guestOrSearch;
  }

  return match;
}

/**
 * Paid orders that count toward sales (same rule as EOD / guest directory).
 */
export function paidRevenueMatch(filters) {
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);
  const match = paidRevenueOrderMatch({
    restaurantId: filters.restaurantId,
    start,
    end,
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
    match.$or = guestOrSearch;
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
