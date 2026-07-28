import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import OvertimeRecord from "@/models/employee/OvertimeRecord";

// GET — fetch overtime records with optional filters
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status     = searchParams.get("status");
    const startDate  = searchParams.get("startDate");
    const endDate    = searchParams.get("endDate");

    const query = { restaurant: request.restaurant };
    if (employeeId) query.employee = employeeId;
    if (status)     query.status   = status;
    if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);
      query.date  = { $gte: start, $lte: end };
    }

    const records = await OvertimeRecord.find(query)
      .populate("employee",     "firstName lastName employeeId role")
      .populate("plannedShift")
      .populate("dutyChange")
      .sort({ date: -1 })
      .lean();

    return sendSuccess(records, "Overtime records retrieved successfully");
  } catch (error) {
    logger.error("Failed to fetch overtime records", error);
    return sendError(error, "Failed to fetch overtime records", 500);
  }
}, ["ADMIN", "MANAGER"]);
