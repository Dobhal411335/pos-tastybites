import EodReport from "@/models/EodReport";
import Employee from "@/models/employee/Employee";
import { buildEodReport } from "@/lib/eod/buildEodReport";
import { formatEmployeeName, isValidBusinessDate } from "@/lib/eod/eodHelpers";

export const EOD_ALLOWED_ROLES = [
  "ADMIN",
  "MANAGER",
  "SERVER",
  "BARTENDER",
  "EMPLOYEE",
  "STAFF",
];

export async function resolveActorName(userId) {
  if (!userId) return null;
  const emp = await Employee.findById(userId)
    .select("firstName lastName name")
    .lean();
  return formatEmployeeName(emp);
}

/**
 * Get live or saved EOD report for a date.
 * @param {{ restaurantId, businessDate, preferSaved?: boolean, actualDeposit?: number|null, userId?: string }} opts
 */
export async function getEodReportForDate({
  restaurantId,
  businessDate,
  preferSaved = true,
  actualDeposit = null,
  userId = null,
}) {
  if (!isValidBusinessDate(businessDate)) {
    throw Object.assign(new Error("Invalid business date"), { status: 400 });
  }

  if (preferSaved) {
    const saved = await EodReport.findOne({
      restaurant: restaurantId,
      businessDate,
      status: "SAVED",
    }).lean();
    if (saved?.snapshot) {
      return {
        report: {
          ...saved.snapshot,
          meta: {
            ...(saved.snapshot.meta || {}),
            source: "saved",
            savedAt: saved.generatedAt,
            savedId: String(saved._id),
          },
          cashDeposit: {
            ...(saved.snapshot.cashDeposit || {}),
            actualDeposit:
              saved.actualDeposit ?? saved.snapshot.cashDeposit?.actualDeposit,
            expectedDeposit:
              saved.expectedDeposit ??
              saved.snapshot.cashDeposit?.expectedDeposit,
            overShort:
              saved.overShort ?? saved.snapshot.cashDeposit?.overShort,
          },
          reconciliation: saved.reconciliation || saved.snapshot.reconciliation,
        },
        saved: true,
        savedRecord: saved,
      };
    }
  }

  const generatedByName = await resolveActorName(userId);
  const report = await buildEodReport({
    restaurantId,
    businessDate,
    actualDeposit,
    generatedBy: userId,
    generatedByName,
  });
  report.meta.source = "live";
  return { report, saved: false, savedRecord: null };
}
