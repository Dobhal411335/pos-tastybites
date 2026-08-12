import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import Restaurant from "@/models/Restaurant";
import {
  EOD_ALLOWED_ROLES,
  getEodReportForDate,
} from "@/lib/eod/getEodReportForDate";
import { exportEodExcel } from "@/lib/eod/exportEodExcel";
import { exportEodPdf } from "@/lib/eod/exportEodPdf";
import { sendEodReportEmail } from "@/lib/brevo/sendEodReportEmail";
import { isValidBusinessDate, todayBusinessDate } from "@/lib/eod/eodHelpers";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/eod/email
 * Body: { date, to?, preferSaved? }
 */
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const date = body.date || todayBusinessDate();
    if (!isValidBusinessDate(date)) {
      return sendError(new Error("Bad Request"), "Invalid date. Use YYYY-MM-DD.", 400);
    }

    const restaurant = await Restaurant.findById(request.restaurant)
      .select("email name")
      .lean();

    const to = String(body.to || restaurant?.email || "").trim();
    if (!to || !EMAIL_RE.test(to)) {
      return sendError(new Error("Bad Request"), "A valid email address is required", 400);
    }

    const preferSaved = body.preferSaved !== false;
    const { report } = await getEodReportForDate({
      restaurantId: request.restaurant,
      businessDate: date,
      preferSaved,
      userId: request.user?.id,
    });

    const [pdfBuffer, excelBuffer] = await Promise.all([
      exportEodPdf(report),
      exportEodExcel(report),
    ]);

    await sendEodReportEmail({
      to,
      report,
      pdfBuffer,
      excelBuffer,
    });

    return sendSuccess({ to, businessDate: date }, "End-of-Day report emailed");
  } catch (error) {
    console.error("EOD email error:", error);
    return sendError(error, error.message || "Failed to email End-of-Day report", 500);
  }
}, EOD_ALLOWED_ROLES);
