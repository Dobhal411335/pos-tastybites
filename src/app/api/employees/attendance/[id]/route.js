import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import EmployeeLog from "@/models/employee/EmployeeLog";
import { recalculateAttendanceLog } from "@/lib/attendance";

export const PUT = withAuth(async (request, context) => {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const log = await EmployeeLog.findOne({ _id: id, restaurant: request.restaurant });

    if (!log) {
      return sendError(new Error("Not Found"), "Attendance record not found", 404);
    }

    if (body.loginTime !== undefined) {
      log.loginTime = new Date(body.loginTime);
    }

    if (body.logoutTime !== undefined) {
      log.logoutTime = body.logoutTime ? new Date(body.logoutTime) : null;
    }

    await recalculateAttendanceLog(log);
    return sendSuccess(log, "Attendance record updated successfully");
  } catch (error) {
    return sendError(error, "Failed to update attendance record", 500);
  }
}, ["ADMIN", "MANAGER"]);
