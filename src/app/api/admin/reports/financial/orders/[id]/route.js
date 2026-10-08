import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import { fetchFinancialOrderDetail } from "@/lib/reports/financial/orderDetail";

export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) {
      return sendError(new Error("Missing ID"), "Order ID is required", 400);
    }

    const data = await fetchFinancialOrderDetail({
      restaurantId: request.restaurant,
      orderId: id,
    });

    return sendSuccess(data, "Financial order detail retrieved");
  } catch (error) {
    logger.error("Financial order detail failed", error);
    return sendError(
      error,
      error.message || "Failed to retrieve order detail",
      error.status || 500
    );
  }
}, ["ADMIN", "SUPER ADMIN"]);
