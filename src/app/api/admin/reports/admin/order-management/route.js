import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { buildOrderManagement } from "@/lib/reports/admin/orderManagement";
import { PAYMENT_FILTERS } from "@/lib/reports/financial/match";
import { ensureOrderSoftDeleteIndexes } from "@/lib/orders/ensureOrderSoftDeleteIndexes";
import { resolveDatePreset } from "@/lib/reports/financial/datePresets";

export const GET = withAuth(async (request) => {
  try {
    await ensureOrderSoftDeleteIndexes();
    const { searchParams } = new URL(request.url);
    const view =
      String(searchParams.get("view") || "active").toLowerCase() === "deleted"
        ? "deleted"
        : "active";
    const presetRaw = String(searchParams.get("preset") || "").toUpperCase();
    const hasCustomDates =
      Boolean(searchParams.get("dateFrom")) ||
      Boolean(searchParams.get("dateTo"));
    const preset = presetRaw
      ? presetRaw
      : hasCustomDates
        ? "CUSTOM"
        : "TODAY";
    const resolved = resolveDatePreset(
      preset,
      searchParams.get("dateFrom"),
      searchParams.get("dateTo")
    );

    const paymentMethod = String(
      searchParams.get("paymentMethod") || "ALL"
    ).toUpperCase();
    const search = String(searchParams.get("search") || "").trim();
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 25);

    const data = await buildOrderManagement({
      restaurantId: request.restaurant,
      preset: resolved.preset,
      dateFrom: resolved.dateFrom,
      dateTo: resolved.dateTo,
      paymentMethod:
        paymentMethod === "ALL" || PAYMENT_FILTERS.includes(paymentMethod)
          ? paymentMethod
          : "ALL",
      search,
      view,
      page,
      pageSize,
    });

    return sendSuccess(data, "Order management list retrieved");
  } catch (error) {
    logger.error("Order management list failed", error);
    return sendError(
      error,
      error.message || "Failed to load order management",
      error.status || 500
    );
  }
}, ["ADMIN", "MANAGER"]);
