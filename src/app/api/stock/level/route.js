import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { getStockLevels } from "@/lib/stock/getStockLevels";

// GET - Get aggregated stock levels
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    const result = await getStockLevels({
      restaurantId: request.restaurant,
      category,
      type,
    });

    return sendSuccess(result, "Stock levels retrieved successfully");
  } catch (error) {
    logger.error("Failed to calculate stock levels", error);
    return sendError(error, "Failed to retrieve stock levels", 500);
  }
}, ["ADMIN", "MANAGER"]);
