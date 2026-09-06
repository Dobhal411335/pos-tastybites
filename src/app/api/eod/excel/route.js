import { withAuth } from "@/utils/auth";
import { sendError } from "@/utils/errorHandler";
import {
  EOD_ALLOWED_ROLES,
  getEodReportForDate,
} from "@/lib/eod/getEodReportForDate";
import { exportEodExcel, eodExcelFilename } from "@/lib/eod/exportEodExcel";
import { isValidBusinessDate, todayBusinessDate } from "@/lib/eod/eodHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/eod/excel?date=YYYY-MM-DD&preferSaved=0
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || todayBusinessDate();
    const preferSaved = searchParams.get("preferSaved") === "1";

    if (!isValidBusinessDate(date)) {
      return sendError(new Error("Bad Request"), "Invalid date. Use YYYY-MM-DD.", 400);
    }

    const { report } = await getEodReportForDate({
      restaurantId: request.restaurant,
      businessDate: date,
      preferSaved,
      userId: request.user?.id,
    });

    const buffer = await exportEodExcel(report);
    const filename = eodExcelFilename(date);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("EOD excel error:", error);
    return sendError(error, "Failed to export Excel", 500);
  }
}, EOD_ALLOWED_ROLES);
