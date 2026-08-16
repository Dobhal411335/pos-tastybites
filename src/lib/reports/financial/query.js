import { resolveDatePreset } from "./datePresets.js";
import {
  ORDER_SORT_FIELDS,
  ORDER_STATUSES,
  PAYMENT_FILTERS,
  toObjectId,
} from "./match.js";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";

function parseIntSafe(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function parseFinancialQuery(searchParams, { paginate = false } = {}) {
  const presetRaw = String(searchParams.get("preset") || "").toUpperCase();
  const hasCustomDates =
    Boolean(searchParams.get("dateFrom")) || Boolean(searchParams.get("dateTo"));
  const preset = presetRaw
    ? presetRaw
    : hasCustomDates
      ? "CUSTOM"
      : "TODAY";

  const { dateFrom, dateTo } = resolveDatePreset(
    preset,
    searchParams.get("dateFrom"),
    searchParams.get("dateTo")
  );

  const employeeRaw = searchParams.get("employeeId");
  const employeeId = toObjectId(employeeRaw) ? String(employeeRaw) : null;

  const statusRaw = String(
    searchParams.get("status") || searchParams.get("orderStatus") || "ALL"
  ).toUpperCase();
  const status =
    statusRaw === "ALL" || ORDER_STATUSES.includes(statusRaw) ? statusRaw : "ALL";

  const paymentRaw = String(searchParams.get("paymentMethod") || "ALL").toUpperCase();
  const paymentMethod =
    paymentRaw === "ALL" || PAYMENT_FILTERS.includes(paymentRaw)
      ? paymentRaw
      : "ALL";

  const result = {
    preset: resolveDatePreset(preset, dateFrom, dateTo).preset,
    dateFrom,
    dateTo,
    employeeId,
    status,
    paymentMethod,
    table: String(searchParams.get("table") || "").trim(),
    guest: String(searchParams.get("guest") || "").trim(),
    search: String(searchParams.get("search") || "").trim(),
    timezone: DEFAULT_RESTAURANT_TIMEZONE,
  };

  if (paginate) {
    result.page = Math.max(1, parseIntSafe(searchParams.get("page"), 1));
    result.pageSize = Math.min(
      100,
      Math.max(1, parseIntSafe(searchParams.get("pageSize"), 25))
    );
    const sortByRaw = String(searchParams.get("sortBy") || "updatedAt");
    result.sortBy = ORDER_SORT_FIELDS.has(sortByRaw) ? sortByRaw : "updatedAt";
    result.sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;
  }

  return result;
}

export function reportMeta(filters) {
  return {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    preset: filters.preset,
    timezone: filters.timezone || DEFAULT_RESTAURANT_TIMEZONE,
    employeeId: filters.employeeId,
    status: filters.status,
    paymentMethod: filters.paymentMethod,
    generatedAt: new Date().toISOString(),
  };
}
