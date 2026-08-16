import { withAuth } from "@/utils/auth";
import { sendError } from "@/utils/errorHandler";
import { parseInventoryQuery } from "@/lib/reports/inventory/query";
import { buildInventoryExportPayload } from "@/lib/reports/inventory/exportPayload";
import {
  exportInventoryExcel,
  inventoryExcelFilename,
} from "@/lib/reports/inventory/exportExcel";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseInventoryQuery(searchParams);
    const payload = await buildInventoryExportPayload({
      restaurantId: request.restaurant,
      ...filters,
    });
    const buffer = await exportInventoryExcel(payload);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${inventoryExcelFilename(
          filters.dateFrom,
          filters.dateTo
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Inventory excel error:", error);
    return sendError(error, "Failed to export Excel", 500);
  }
}, ["ADMIN", "MANAGER"]);
