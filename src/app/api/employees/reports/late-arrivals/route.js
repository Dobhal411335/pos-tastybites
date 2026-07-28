import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import EmployeeLog from "@/models/employee/EmployeeLog";

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const query = { restaurant: request.restaurant, lateMinutes: { $gt: 0 } };
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (startDate && endDate) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }
  const rows = await EmployeeLog.find(query).populate("employee", "firstName lastName employeeId role").sort({ date: -1 }).lean();
  return sendSuccess(rows, "Late arrival report retrieved successfully");
}, ["ADMIN", "MANAGER"]);
