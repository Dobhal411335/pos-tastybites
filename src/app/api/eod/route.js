import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import {
  EOD_ALLOWED_ROLES,
  getEodReportForDate,
} from "@/lib/eod/getEodReportForDate";
import { isValidBusinessDate, todayBusinessDate } from "@/lib/eod/eodHelpers";

/**
 * GET /api/eod?date=YYYY-MM-DD&preferSaved=1
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || todayBusinessDate();
    const preferSaved = searchParams.get("preferSaved") !== "0";

    if (!isValidBusinessDate(date)) {
      return sendError(new Error("Bad Request"), "Invalid date. Use YYYY-MM-DD.", 400);
    }

    const { report, saved } = await getEodReportForDate({
      restaurantId: request.restaurant,
      businessDate: date,
      preferSaved,
      userId: request.user?.id,
    });

    return sendSuccess(
      { report, saved, businessDate: date },
      saved ? "Saved End-of-Day report" : "Live End-of-Day report"
    );
  } catch (error) {
    console.error("EOD GET error:", error);
    return sendError(error, error.message || "Failed to load End-of-Day report", error.status || 500);
  }
}, EOD_ALLOWED_ROLES);
