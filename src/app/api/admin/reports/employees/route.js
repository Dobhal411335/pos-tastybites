import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  buildEmployeeReport,
  parseEmployeeReportQuery,
} from "@/lib/reports/employeeReports";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseEmployeeReportQuery(searchParams);
    const data = await buildEmployeeReport({
      restaurantId: request.restaurant,
      ...filters,
    });
    return sendSuccess(data, "Employee report retrieved");
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 400 && status < 500) {
      return sendError(error, error.message || "Invalid report filters", status);
    }
    logger.error("Failed to build employee report", error);
    return sendError(error, "Failed to retrieve employee report", 500);
  }
}, ["ADMIN", "MANAGER"]);
