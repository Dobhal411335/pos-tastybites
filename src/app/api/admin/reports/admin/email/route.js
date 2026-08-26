import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { parseAdminReportQuery } from "@/lib/reports/admin/query";
import { buildAdminExportPayload } from "@/lib/reports/admin/exportPayload";
import { exportAdminExcel } from "@/lib/reports/admin/exportExcel";
import { exportAdminPdf } from "@/lib/reports/admin/exportPdf";
import { sendAdminReportEmail } from "@/lib/brevo/sendAdminReportEmail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function rowCountFromPayload(payload) {
  const data = payload?.data || {};
  if (Array.isArray(data.rows)) return data.rows.length;
  if (Array.isArray(data.byDay)) return data.byDay.length;
  if (Array.isArray(data.byEmployee)) return data.byEmployee.length;
  if (data.kpis?.orderCount != null) return data.kpis.orderCount;
  return 0;
}

/**
 * POST /api/admin/reports/admin/email
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

    const filters = parseAdminReportQuery(url.searchParams, { paginate: true });
    const payload = await buildAdminExportPayload({
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
      exportAdminPdf(payload),
      exportAdminExcel(payload),
    ]);

    await sendAdminReportEmail({
      to,
      restaurantName: payload.restaurantName,
      section: payload.section,
      meta: payload.data?.meta || {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        preset: filters.preset,
      },
      pdfBuffer,
      excelBuffer,
      rowCount: rowCountFromPayload(payload),
    });

    return sendSuccess(
      {
        to,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        section: payload.section,
      },
      "Admin report emailed"
    );
  } catch (error) {
    console.error("Admin report email error:", error);
    const status = Number(error?.status) || 500;
    return sendError(
      error,
      error.message || "Failed to email admin report",
      status
    );
  }
}, ["ADMIN", "MANAGER"]);
