import { withAuth } from "@/utils/auth";
import { sendError } from "@/utils/errorHandler";
import { parseInventoryQuery } from "@/lib/reports/inventory/query";
import { buildInventoryExportPayload } from "@/lib/reports/inventory/exportPayload";
import {
  exportInventoryPdf,
  inventoryPdfFilename,
} from "@/lib/reports/inventory/exportPdf";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseInventoryQuery(searchParams);
    const payload = await buildInventoryExportPayload({
      restaurantId: request.restaurant,
      ...filters,
    });
    const buffer = await exportInventoryPdf(payload);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${inventoryPdfFilename(
          filters.dateFrom,
          filters.dateTo
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Inventory pdf error:", error);
    return sendError(error, "Failed to export PDF", 500);
  }
}, ["ADMIN", "MANAGER"]);
