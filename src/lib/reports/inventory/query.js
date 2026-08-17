import { resolveDatePreset } from "@/lib/reports/financial/datePresets";
import { toObjectId } from "@/lib/reports/financial/match";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";

export const STOCK_STATUSES = ["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"];
export const MOVEMENT_TYPES = ["ALL", "STOCK_IN", "STOCK_OUT"];
export const TOP_SORT_FIELDS = ["quantity", "value"];

function parseIntSafe(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function parseInventoryQuery(searchParams, { paginate = false } = {}) {
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

  const categoryRaw = searchParams.get("categoryId") || searchParams.get("category");
  const productRaw = searchParams.get("productId") || searchParams.get("product");
  const statusRaw = String(searchParams.get("stockStatus") || "ALL").toUpperCase();
  const movementRaw = String(searchParams.get("movementType") || "ALL").toUpperCase();
  const sortByRaw = String(searchParams.get("sortBy") || "quantity").toLowerCase();

  const result = {
    preset: resolveDatePreset(preset, dateFrom, dateTo).preset,
    dateFrom,
    dateTo,
    categoryId: toObjectId(categoryRaw) ? String(categoryRaw) : null,
    productId: toObjectId(productRaw) ? String(productRaw) : null,
    stockStatus: STOCK_STATUSES.includes(statusRaw) ? statusRaw : "ALL",
    movementType: MOVEMENT_TYPES.includes(movementRaw) ? movementRaw : "ALL",
    search: String(searchParams.get("search") || "").trim(),
    sortBy: TOP_SORT_FIELDS.includes(sortByRaw) ? sortByRaw : "quantity",
    timezone: DEFAULT_RESTAURANT_TIMEZONE,
  };

  if (paginate) {
    result.page = Math.max(1, parseIntSafe(searchParams.get("page"), 1));
    result.pageSize = Math.min(
      100,
      Math.max(1, parseIntSafe(searchParams.get("pageSize"), 25))
    );
  }

  return result;
}

export function inventoryReportMeta(filters) {
  return {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    preset: filters.preset,
    timezone: filters.timezone || DEFAULT_RESTAURANT_TIMEZONE,
    categoryId: filters.categoryId,
    productId: filters.productId,
    stockStatus: filters.stockStatus,
    movementType: filters.movementType,
    search: filters.search,
    generatedAt: new Date().toISOString(),
  };
}
