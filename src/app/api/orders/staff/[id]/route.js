import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

export const PATCH = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // In Mongoose models, pending is usually PENDING
    // UI might send "confirmed", "cancelled" etc. Let's make it uppercase.
    const status = body.status ? body.status.toUpperCase() : undefined;
    
    if (!status) {
      return sendError(new Error("Missing status"), "Status is required", 400);
    }
    
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, restaurantId: request.restaurant, source: "STAFF" },
      { $set: { status: status } },
      { new: true, runValidators: true }
    );
    
    if (!updatedOrder) {
      return sendError(new Error("Not found"), "Order not found", 404);
    }
    
    return sendSuccess(updatedOrder, "Order status updated");
  } catch (error) {
    logger.error("Failed to update staff order", error);
    return sendError(error, "Failed to update order", 500);
  }
}, ["ADMIN", "MANAGER"]);

export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    
    const deletedOrder = await Order.findOneAndDelete({
      _id: id, restaurantId: request.restaurant, source: "STAFF"
    });
    
    if (!deletedOrder) {
      return sendError(new Error("Not found"), "Order not found", 404);
    }
    
    return sendSuccess(null, "Order deleted successfully");
  } catch (error) {
    logger.error("Failed to delete staff order", error);
    return sendError(error, "Failed to delete order", 500);
  }
}, ["ADMIN", "MANAGER"]);
