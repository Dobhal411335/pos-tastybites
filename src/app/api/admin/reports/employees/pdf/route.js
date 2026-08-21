import { withAuth } from "@/utils/auth";
import { sendError } from "@/utils/errorHandler";
import { buildEmployeeExportPayload } from "@/lib/reports/employee/exportPayload";
import {
  exportEmployeeReportPdf,
  employeePdfFilename,
} from "@/lib/reports/employee/exportPdf";

/**
 * GET /api/admin/reports/employees/pdf
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const payload = await buildEmployeeExportPayload({
      restaurantId: request.restaurant,
      searchParams,
    });
    const buffer = await exportEmployeeReportPdf(payload);
    const filename = employeePdfFilename(
      payload.labels.dateFrom,
      payload.labels.dateTo,
      payload.labels.employeeName,
      payload.exportView || "Staff"
    );

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Employee report pdf error:", error);
    const status = Number(error?.status) || 500;
    return sendError(error, error.message || "Failed to export PDF", status);
  }
}, ["ADMIN", "MANAGER"]);
