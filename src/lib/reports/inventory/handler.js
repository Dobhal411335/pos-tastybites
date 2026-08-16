import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { parseInventoryQuery } from "./query";

export function inventoryGetHandler(build, message, { paginate = false } = {}) {
  return withAuth(async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const filters = parseInventoryQuery(searchParams, { paginate });
      const data = await build({
        restaurantId: request.restaurant,
        ...filters,
      });
      return sendSuccess(data, message);
    } catch (error) {
      logger.error(message, error);
      return sendError(
        error,
        error.message || "Failed to retrieve inventory report",
        error.status || 500
      );
    }
  }, ["ADMIN", "MANAGER"]);
}
