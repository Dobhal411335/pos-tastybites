import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import EmployeeLog from "@/models/employee/EmployeeLog";

const getDateQuery = (searchParams) => {
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!startDate || !endDate) return {};
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(23, 59, 59, 999);
  return { date: { $gte: start, $lte: end } };
};

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const rows = await EmployeeLog.find({ restaurant: request.restaurant, ...getDateQuery(searchParams) })
    .populate("employee", "firstName lastName employeeId role")
    .sort({ date: -1 })
    .lean();
  return sendSuccess(rows, "Attendance report retrieved successfully");
}, ["ADMIN", "MANAGER"]);
