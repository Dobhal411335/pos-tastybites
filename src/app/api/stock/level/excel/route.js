import { withAuth } from "@/utils/auth";
import { sendError } from "@/utils/errorHandler";
import { getStockLevels, getStockFilterLabels } from "@/lib/stock/getStockLevels";
import {
  exportStockLevelExcel,
  stockLevelExcelFilename,
} from "@/lib/stock/exportStockLevelExcel";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    const { levels, restaurantName } = await getStockLevels({
      restaurantId: request.restaurant,
      category,
      type,
    });
    const labels = await getStockFilterLabels(request.restaurant, category, type);
    const buffer = await exportStockLevelExcel({
      levels,
      restaurantName,
      ...labels,
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${stockLevelExcelFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Stock level excel error:", error);
    return sendError(error, "Failed to export Excel", 500);
  }
}, ["ADMIN", "MANAGER"]);
