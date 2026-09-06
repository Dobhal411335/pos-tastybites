import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import {
  EOD_ALLOWED_ROLES,
  getEodReportForDate,
} from "@/lib/eod/getEodReportForDate";
import { isValidBusinessDate, todayBusinessDate } from "@/lib/eod/eodHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/eod?date=YYYY-MM-DD&preferSaved=0
 * Defaults to live current data unless preferSaved=1 is explicitly passed.
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || todayBusinessDate();
    const preferSaved = searchParams.get("preferSaved") === "1";

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
      saved ? "Saved End-of-Day report" : "Live End-of-Day report",
      200,
      NO_CACHE_HEADERS
    );
  } catch (error) {
    console.error("EOD GET error:", error);
    return sendError(error, error.message || "Failed to load End-of-Day report", error.status || 500);
  }
}, EOD_ALLOWED_ROLES);
