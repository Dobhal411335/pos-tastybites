import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import EmployeeLog from "@/models/employee/EmployeeLog";
import {
  buildDateRangeMatch,
  buildWorkingHoursSummaryPipeline,
} from "@/lib/payEstimate";

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const match = buildDateRangeMatch(
    request.restaurant,
    searchParams.get("startDate"),
    searchParams.get("endDate")
  );

  const rows = await EmployeeLog.aggregate(buildWorkingHoursSummaryPipeline(match));

  const totals = rows.reduce(
    (acc, row) => ({
      totalWorkedMinutes: acc.totalWorkedMinutes + (row.totalWorkedMinutes || 0),
      totalOvertimeMinutes: acc.totalOvertimeMinutes + (row.totalOvertimeMinutes || 0),
      regularPay: acc.regularPay + (row.regularPay || 0),
      overtimePay: acc.overtimePay + (row.overtimePay || 0),
      estimatedTotalPay: acc.estimatedTotalPay + (row.estimatedTotalPay || 0),
    }),
    {
      totalWorkedMinutes: 0,
      totalOvertimeMinutes: 0,
      regularPay: 0,
      overtimePay: 0,
      estimatedTotalPay: 0,
    }
  );

  return sendSuccess(
    {
      period: {
        startDate: searchParams.get("startDate") || null,
        endDate: searchParams.get("endDate") || null,
      },
      employees: rows,
      totals: {
        ...totals,
        regularPay: Number(totals.regularPay.toFixed(2)),
        overtimePay: Number(totals.overtimePay.toFixed(2)),
        estimatedTotalPay: Number(totals.estimatedTotalPay.toFixed(2)),
      },
    },
    "Pay estimate retrieved successfully"
  );
}, ["ADMIN", "MANAGER"]);
