import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import ShiftHistory from "@/models/employee/ShiftHistory";

// GET — fetch immutable shift history log
// No POST / PUT / DELETE — this collection is write-once from other handlers.
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const eventType  = searchParams.get("eventType");
    const startDate  = searchParams.get("startDate");
    const endDate    = searchParams.get("endDate");
    const limit      = Math.min(parseInt(searchParams.get("limit") || "100"), 200);

    const query = { restaurant: request.restaurant };
    if (employeeId) query.employee  = employeeId;
    if (eventType)  query.eventType = eventType;
    if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);
      query.date  = { $gte: start, $lte: end };
    }

    const history = await ShiftHistory.find(query)
      .populate("employee", "firstName lastName employeeId role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return sendSuccess(history, "Shift history retrieved successfully");
  } catch (error) {
    logger.error("Failed to fetch shift history", error);
    return sendError(error, "Failed to fetch shift history", 500);
  }
}, ["ADMIN", "MANAGER"]);
