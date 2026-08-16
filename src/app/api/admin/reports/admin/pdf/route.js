import { withAuth } from "@/utils/auth";
import { sendError } from "@/utils/errorHandler";
import { parseAdminReportQuery } from "@/lib/reports/admin/query";
import { buildAdminExportPayload } from "@/lib/reports/admin/exportPayload";
import {
  exportAdminPdf,
  adminPdfFilename,
} from "@/lib/reports/admin/exportPdf";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseAdminReportQuery(searchParams, { paginate: true });
    const payload = await buildAdminExportPayload({
      restaurantId: request.restaurant,
      ...filters,
    });
    const buffer = await exportAdminPdf(payload);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${adminPdfFilename(
          payload.section,
          filters.dateFrom,
          filters.dateTo
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin report pdf error:", error);
    return sendError(error, "Failed to export PDF", 500);
  }
}, ["ADMIN", "MANAGER"]);
