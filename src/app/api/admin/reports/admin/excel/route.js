import { withAuth } from "@/utils/auth";
import { sendError } from "@/utils/errorHandler";
import { parseAdminReportQuery } from "@/lib/reports/admin/query";
import { buildAdminExportPayload } from "@/lib/reports/admin/exportPayload";
import {
  exportAdminExcel,
  adminExcelFilename,
} from "@/lib/reports/admin/exportExcel";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseAdminReportQuery(searchParams, { paginate: true });
    const payload = await buildAdminExportPayload({
      restaurantId: request.restaurant,
      ...filters,
    });
    const buffer = await exportAdminExcel(payload);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${adminExcelFilename(
          payload.section,
          filters.dateFrom,
          filters.dateTo
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin report excel error:", error);
    return sendError(error, "Failed to export Excel", 500);
  }
}, ["ADMIN", "MANAGER"]);
