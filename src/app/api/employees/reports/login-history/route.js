import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import EmployeeSession from "@/models/employee/EmployeeSession";

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const query = { restaurant: request.restaurant };
  if (employeeId) query.employee = employeeId;
  const rows = await EmployeeSession.find(query)
    .populate("employee", "firstName lastName employeeId role")
    .populate("device", "deviceName deviceType browserFingerprint")
    .populate("shift", "startTime endTime")
    .sort({ loginTime: -1 })
    .lean();
  return sendSuccess(rows, "Login history retrieved successfully");
}, ["ADMIN", "MANAGER"]);
