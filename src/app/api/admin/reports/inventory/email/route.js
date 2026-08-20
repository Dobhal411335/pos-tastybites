import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { parseInventoryQuery } from "@/lib/reports/inventory/query";
import { buildInventoryExportPayload } from "@/lib/reports/inventory/exportPayload";
import { exportInventoryExcel } from "@/lib/reports/inventory/exportExcel";
import { exportInventoryPdf } from "@/lib/reports/inventory/exportPdf";
import { sendInventoryReportEmail } from "@/lib/brevo/sendInventoryReportEmail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/admin/reports/inventory/email
 * Body: { to, ...filter fields as query would use }
 */
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    for (const [key, value] of Object.entries(body)) {
      if (key === "to" || value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    const filters = parseInventoryQuery(url.searchParams);
    const payload = await buildInventoryExportPayload({
      restaurantId: request.restaurant,
      ...filters,
    });

    const to = String(body.to || "").trim();
    if (!to || !EMAIL_RE.test(to)) {
      return sendError(
        new Error("Bad Request"),
        "A valid email address is required",
        400
      );
    }

    const [pdfBuffer, excelBuffer] = await Promise.all([
      exportInventoryPdf(payload),
      exportInventoryExcel(payload),
    ]);

    await sendInventoryReportEmail({
      to,
      restaurantName: payload.restaurantName,
      meta: payload.overview?.meta,
      overview: payload.overview,
      pdfBuffer,
      excelBuffer,
      rowCount: payload.stock?.rows?.length ?? 0,
    });

    return sendSuccess(
      {
        to,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      },
      "Inventory report emailed"
    );
  } catch (error) {
    console.error("Inventory report email error:", error);
    const status = Number(error?.status) || 500;
    return sendError(error, error.message || "Failed to email inventory report", status);
  }
}, ["ADMIN", "MANAGER"]);
