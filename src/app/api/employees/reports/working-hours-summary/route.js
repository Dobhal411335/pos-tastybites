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

  const summary = await EmployeeLog.aggregate(buildWorkingHoursSummaryPipeline(match));

  return sendSuccess(summary, "Working hours summary retrieved successfully");
}, ["ADMIN", "MANAGER"]);
