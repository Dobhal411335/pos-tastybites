import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  buildGuestDirectoryReport,
  parseGuestReportQuery,
} from "@/lib/reports/guestDirectory";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseGuestReportQuery(searchParams);
    const data = await buildGuestDirectoryReport({
      restaurantId: request.restaurant,
      ...filters,
    });
    return sendSuccess(data, "Guest directory report retrieved");
  } catch (error) {
    logger.error("Failed to build guest directory report", error);
    return sendError(error, "Failed to retrieve guest directory report", 500);
  }
}, ["ADMIN", "MANAGER"]);
