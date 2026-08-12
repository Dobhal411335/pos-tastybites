import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import EodReport from "@/models/EodReport";
import { EOD_ALLOWED_ROLES } from "@/lib/eod/getEodReportForDate";

/**
 * GET /api/eod/history
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 60, 200);

    const rows = await EodReport.find({ restaurant: request.restaurant })
      .sort({ businessDate: -1 })
      .limit(limit)
      .populate("generatedBy", "firstName lastName name")
      .select(
        "businessDate status generatedAt generatedBy expectedDeposit actualDeposit overShort reconciliation snapshot.summary snapshot.meta"
      )
      .lean();

    const history = rows.map((r) => {
      const emp = r.generatedBy;
      const name =
        emp?.name ||
        [emp?.lastName, emp?.firstName].filter(Boolean).join(", ") ||
        r.snapshot?.meta?.generatedByName ||
        "";
      return {
        id: r._id,
        businessDate: r.businessDate,
        status: r.status,
        generatedAt: r.generatedAt,
        generatedByName: name,
        netSales: r.snapshot?.summary?.netSales ?? null,
        totalPayment: r.snapshot?.summary?.totalPayment ?? null,
        expectedDeposit: r.expectedDeposit,
        actualDeposit: r.actualDeposit,
        overShort: r.overShort,
        reconciliationOk: r.reconciliation?.ok ?? true,
      };
    });

    return sendSuccess({ history }, "EOD history");
  } catch (error) {
    console.error("EOD history error:", error);
    return sendError(error, "Failed to load EOD history", 500);
  }
}, EOD_ALLOWED_ROLES);
