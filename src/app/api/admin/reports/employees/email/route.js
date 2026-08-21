import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { buildEmployeeExportPayload } from "@/lib/reports/employee/exportPayload";
import { exportEmployeeReportExcel } from "@/lib/reports/employee/exportExcel";
import { exportEmployeeReportPdf } from "@/lib/reports/employee/exportPdf";
import { sendEmployeeReportEmail } from "@/lib/brevo/sendEmployeeReportEmail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/admin/reports/employees/email
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

    const payload = await buildEmployeeExportPayload({
      restaurantId: request.restaurant,
      searchParams: url.searchParams,
    });

    const to = String(body.to || payload.employeeEmail || payload.restaurantEmail || "").trim();
    if (!to || !EMAIL_RE.test(to)) {
      return sendError(
        new Error("Bad Request"),
        "A valid email address is required",
        400
      );
    }

    const [pdfBuffer, excelBuffer] = await Promise.all([
      exportEmployeeReportPdf(payload),
      exportEmployeeReportExcel(payload),
    ]);

    await sendEmployeeReportEmail({
      to,
      restaurantName: payload.restaurantName,
      labels: payload.labels,
      overview: payload.overview,
      pdfBuffer,
      excelBuffer,
      rowCount:
        (payload.rows || []).length ||
        (payload.methods || []).length ||
        (payload.earnedByEmployee || []).length ||
        0,
    });

    return sendSuccess(
      { to, dateFrom: payload.labels.dateFrom, dateTo: payload.labels.dateTo },
      "Employee report emailed"
    );
  } catch (error) {
    console.error("Employee report email error:", error);
    const status = Number(error?.status) || 500;
    return sendError(error, error.message || "Failed to email employee report", status);
  }
}, ["ADMIN", "MANAGER"]);
