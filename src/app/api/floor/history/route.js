import { withAuth } from "@/utils/auth";
import FloorHistory from "@/models/FloorHistory";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - Retrieve Floor History
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const floorId = searchParams.get("floorId");

    const query = { restaurant: request.restaurant };
    if (floorId) query.floor = floorId;

    const history = await FloorHistory.find(query)
      .populate("performedBy", "name email")
      .populate("floor", "name")
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(history, "Floor history retrieved successfully");
  } catch (error) {
    logger.error("Failed to retrieve floor history", error);
    return sendError(error, "Failed to retrieve floor history", 500);
  }
}, ["ADMIN", "MANAGER"]);
