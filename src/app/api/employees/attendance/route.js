import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import EmployeeLog from "@/models/employee/EmployeeLog";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query = { restaurant: request.restaurant };
    if (employeeId) query.employee = employeeId;
    if (status) query.attendanceStatus = status;
    if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const rows = await EmployeeLog.find(query)
      .populate("employee", "firstName lastName employeeId role")
      .populate("shift")
      .populate("dutyChange")
      .populate("device", "deviceName deviceType")
      .populate("floor", "name")
      .populate("tablesAssigned", "tableNumber name")
      .sort({ date: -1, loginTime: -1 })
      .lean();

    return sendSuccess(rows, "Attendance records retrieved successfully");
  } catch (error) {
    return sendError(error, "Failed to fetch attendance records", 500);
  }
}, ["ADMIN", "MANAGER"]);
