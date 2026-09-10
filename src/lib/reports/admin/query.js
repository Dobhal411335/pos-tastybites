import {
  parseFinancialQuery,
  reportMeta,
} from "@/lib/reports/financial/query";

export const ACTIVITY_ACTIONS = [
  "TABLE_ASSIGNED",
  "TABLE_RELEASED",
  "TABLE_TRANSFERRED",
  "GUEST_COUNT_CHANGED",
  "TABLE_RECONFIGURED",
  "ORDER_CREATED",
  "ORDER_UPDATED",
  "ORDER_CANCELLED",
  "PAYMENT_COMPLETED",
  "ADMIN_OVERRIDE",
];

export const AUDIT_EVENT_TYPES = [
  "ORDER_CANCELLED",
  "DISCOUNT_APPLIED",
  "GIFT_CARD_USED",
];

export const KOT_STATUSES = [
  "QUEUED",
  "PRINTING",
  "PRINTED",
  "FAILED",
  "CANCELLED",
];

export const ADMIN_SECTIONS = [
  "activity",
  "revenue",
  "daily-summary",
  "today-order",
  "eod",
  "audit",
  "kitchen",
  "bar",
];

export const ORDER_STATUS_FILTERS = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "PAID",
  "CANCELLED",
  "WAIVED",
];

export function parseAdminReportQuery(searchParams, { paginate = false } = {}) {
  const filters = parseFinancialQuery(searchParams, { paginate });

  const eventType = String(searchParams.get("eventType") || "ALL").toUpperCase();
  const kotStatus = String(searchParams.get("kotStatus") || "ALL").toUpperCase();
  const orderStatus = String(
    searchParams.get("orderStatus") || searchParams.get("status") || "ALL"
  ).toUpperCase();
  const section = String(searchParams.get("section") || "").toLowerCase();
  const search = String(searchParams.get("search") || "").trim();

  filters.eventType =
    eventType === "ALL" ||
    ACTIVITY_ACTIONS.includes(eventType) ||
    AUDIT_EVENT_TYPES.includes(eventType)
      ? eventType
      : "ALL";
  filters.kotStatus =
    kotStatus === "ALL" || KOT_STATUSES.includes(kotStatus)
      ? kotStatus
      : "ALL";
  filters.orderStatus =
    orderStatus === "ALL" || ORDER_STATUS_FILTERS.includes(orderStatus)
      ? orderStatus
      : "ALL";
  if (filters.orderStatus !== "ALL") {
    filters.status = filters.orderStatus;
  }
  filters.search = search.slice(0, 80);
  filters.section = ADMIN_SECTIONS.includes(section) ? section : "daily-summary";

  return filters;
}

export function adminReportMeta(filters) {
  return {
    ...reportMeta(filters),
    eventType: filters.eventType || "ALL",
    kotStatus: filters.kotStatus || "ALL",
    orderStatus: filters.orderStatus || filters.status || "ALL",
    search: filters.search || "",
    section: filters.section || "daily-summary",
  };
}
