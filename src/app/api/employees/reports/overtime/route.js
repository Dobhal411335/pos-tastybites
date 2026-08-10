import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import EmployeeLog from "@/models/employee/EmployeeLog";

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const query = {
    restaurant: request.restaurant,
    overtimeMinutes: { $gt: 0 },
    isIncomplete: false,
    shiftStatus: { $ne: "Cancelled" },
    attendanceStatus: { $ne: "Absent" },
  };
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }

  const rows = await EmployeeLog.find(query)
    .populate("employee", "firstName lastName employeeId role hourlyPaid")
    .sort({ date: -1 })
    .lean();

  const enriched = rows.map((row) => {
    const hourlyRate = row.employee?.hourlyPaid?.amountPerHour || 0;
    const overtimeRate = row.employee?.hourlyPaid?.overtimeAmountPerHour ?? hourlyRate;
    const overtimeHours = Number((row.overtimeMinutes / 60).toFixed(2));
    const estimatedOvertimePay = Number((overtimeHours * overtimeRate).toFixed(2));

    return {
      ...row,
      overtimeHours,
      hourlyRate,
      overtimeRate,
      estimatedOvertimePay,
    };
  });

  return sendSuccess(enriched, "Overtime report retrieved successfully");
}, ["ADMIN", "MANAGER"]);
