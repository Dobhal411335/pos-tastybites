import { isOfferItem } from "@/utils/offerDetails";
import { todayBusinessDate } from "@/lib/eod/eodHelpers";
import { onlineOrderingTimezone } from "@/lib/public/pickup";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD from Date / ISO string in restaurant TZ (date-only calendar day). */
export function toOfferDateOnly(value, timeZone = onlineOrderingTimezone()) {
  if (!value) return null;
  if (typeof value === "string" && DATE_RE.test(value.trim())) {
    return value.trim();
  }
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(d);
  } catch {
    return null;
  }
}

export function cartItemsAreOfferOnly(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return false;
  return list.every((item) => isOfferItem(item));
}

/** Earliest offer validTo as YYYY-MM-DD; null if none. */
export function minOfferValidToDate(items, timeZone = onlineOrderingTimezone()) {
  let min = null;
  for (const item of Array.isArray(items) ? items : []) {
    if (!isOfferItem(item)) continue;
    const day = toOfferDateOnly(item.validTo, timeZone);
    if (!day) continue;
    if (!min || day < min) min = day;
  }
  return min;
}

export function isFutureOfferFulfillmentDate(
  dateStr,
  todayStr = todayBusinessDate(),
) {
  return Boolean(dateStr && DATE_RE.test(dateStr) && dateStr > todayStr);
}

/**
 * Mongo match for today’s sales list:
 * - created today and not a future offer booking, OR
 * - offerFulfillmentDate === today (rolls into pending today)
 */
export function todaySalesOrdersOrClause(todayStr, start, end) {
  return {
    $or: [
      {
        createdAt: { $gte: start, $lt: end },
        $or: [
          { offerFulfillmentDate: null },
          { offerFulfillmentDate: { $exists: false } },
          { offerFulfillmentDate: "" },
          { offerFulfillmentDate: { $lte: todayStr } },
        ],
      },
      { offerFulfillmentDate: todayStr },
    ],
  };
}

/**
 * Business-day time window for EOD / reports.
 * Includes offerFulfillmentDate === reportDate; excludes future bookings.
 */
export function businessDayOrderTimeClause(reportDate, start, end) {
  return {
    $or: [
      { offerFulfillmentDate: reportDate },
      {
        $and: [
          {
            $or: [
              { createdAt: { $gte: start, $lt: end } },
              { updatedAt: { $gte: start, $lt: end } },
            ],
          },
          {
            $or: [
              { offerFulfillmentDate: null },
              { offerFulfillmentDate: { $exists: false } },
              { offerFulfillmentDate: "" },
              { offerFulfillmentDate: { $lte: reportDate } },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Date-range time window for admin / financial reports.
 * - Includes offers whose fulfillment day falls inside [dateFrom, dateTo]
 * - Includes created/updated activity in [start, end) that is not booked after dateTo
 * - Single-day ranges use businessDayOrderTimeClause
 */
export function reportDateRangeOrderTimeClause(dateFrom, dateTo, start, end) {
  const from = String(dateFrom || "");
  const to = String(dateTo || "");
  if (DATE_RE.test(from) && from === to) {
    return businessDayOrderTimeClause(from, start, end);
  }
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return {
      $and: [
        {
          $or: [
            { createdAt: { $gte: start, $lt: end } },
            { updatedAt: { $gte: start, $lt: end } },
          ],
        },
        {
          $or: [
            { offerFulfillmentDate: null },
            { offerFulfillmentDate: { $exists: false } },
            { offerFulfillmentDate: "" },
            ...(DATE_RE.test(to) ? [{ offerFulfillmentDate: { $lte: to } }] : []),
          ],
        },
      ],
    };
  }
  return {
    $or: [
      {
        offerFulfillmentDate: { $gte: from, $lte: to },
      },
      {
        $and: [
          {
            $or: [
              { createdAt: { $gte: start, $lt: end } },
              { updatedAt: { $gte: start, $lt: end } },
            ],
          },
          {
            $or: [
              { offerFulfillmentDate: null },
              { offerFulfillmentDate: { $exists: false } },
              { offerFulfillmentDate: "" },
              { offerFulfillmentDate: { $lte: to } },
            ],
          },
        ],
      },
    ],
  };
}

/** Orders that may block day close (excludes future offer bookings). */
export function futureOfferFulfillmentExclusion(todayStr = todayBusinessDate()) {
  return {
    $or: [
      { offerFulfillmentDate: null },
      { offerFulfillmentDate: { $exists: false } },
      { offerFulfillmentDate: "" },
      { offerFulfillmentDate: { $lte: todayStr } },
    ],
  };
}

export function probeDateFromISO(dateStr) {
  if (!DATE_RE.test(String(dateStr || ""))) return new Date();
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}
