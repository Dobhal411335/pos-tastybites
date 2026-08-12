import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import EodReport from "@/models/EodReport";
import { buildEodReport } from "@/lib/eod/buildEodReport";
import { EOD_ALLOWED_ROLES, resolveActorName } from "@/lib/eod/getEodReportForDate";
import { isValidBusinessDate, r2, todayBusinessDate } from "@/lib/eod/eodHelpers";

/**
 * POST /api/eod/save
 * Body: { date, actualDeposit? }
 */
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const date = body.date || todayBusinessDate();
    if (!isValidBusinessDate(date)) {
      return sendError(new Error("Bad Request"), "Invalid date. Use YYYY-MM-DD.", 400);
    }

    const actualDeposit =
      body.actualDeposit !== undefined && body.actualDeposit !== null && body.actualDeposit !== ""
        ? r2(body.actualDeposit)
        : null;

    const generatedByName = await resolveActorName(request.user?.id);
    const report = await buildEodReport({
      restaurantId: request.restaurant,
      businessDate: date,
      actualDeposit,
      generatedBy: request.user?.id,
      generatedByName,
    });
    report.meta.source = "saved";

    const expectedDeposit = r2(report.cashDeposit?.expectedDeposit);
    const actual =
      actualDeposit != null
        ? actualDeposit
        : r2(report.cashDeposit?.actualDeposit ?? 0);
    const overShort = r2(actual - expectedDeposit);
    report.cashDeposit = {
      ...report.cashDeposit,
      expectedDeposit,
      actualDeposit: actual,
      overShort,
      createdBy: generatedByName || report.cashDeposit?.createdBy || "",
    };

    const doc = await EodReport.findOneAndUpdate(
      { restaurant: request.restaurant, businessDate: date },
      {
        restaurant: request.restaurant,
        businessDate: date,
        status: "SAVED",
        generatedAt: new Date(),
        generatedBy: request.user?.id || null,
        expectedDeposit,
        actualDeposit: actual,
        overShort,
        reconciliation: report.reconciliation,
        snapshot: report,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(
      {
        id: doc._id,
        businessDate: date,
        report,
        reconciliation: report.reconciliation,
      },
      report.reconciliation?.ok
        ? "End-of-Day report saved"
        : "End-of-Day report saved with reconciliation warnings",
      200
    );
  } catch (error) {
    console.error("EOD save error:", error);
    return sendError(error, "Failed to save End-of-Day report", 500);
  }
}, EOD_ALLOWED_ROLES);
