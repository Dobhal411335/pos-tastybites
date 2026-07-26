import { withAuth } from "@/utils/auth";
import Order from "@/models/Order";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const { status, guestName, callNumber, tableNo } = await request.json();

    if (!id) return sendError(new Error("Missing ID"), "Order ID is required", 400);

    const updateData = { updatedBy: request.user.id };
    if (status) updateData.status = status;
    if (guestName) updateData.guestName = guestName;
    if (callNumber) updateData.callNumber = callNumber;
    if (tableNo) updateData.tableNo = tableNo;

    const order = await Order.findOneAndUpdate(
      { _id: id, restaurantId: request.restaurant, source: "ADMIN" },
      { $set: updateData },
      { new: true }
    );

    if (!order) {
      return sendError(new Error("Not Found"), "Order not found", 404);
    }

    logger.info(`Admin order ${id} status updated to ${status}`);
    return sendSuccess(order, "Order updated successfully");
  } catch (error) {
    logger.error(`Failed to update admin order ${params?.id}`, error);
    return sendError(error, "Failed to update order", 500);
  }
}, ["ADMIN", "MANAGER"]);

export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Order ID is required", 400);

    const deletedOrder = await Order.findOneAndDelete({
      _id: id,
      restaurantId: request.restaurant,
      source: "ADMIN"
    });

    if (!deletedOrder) {
      return sendError(new Error("Not Found"), "Order not found", 404);
    }

    logger.info(`Admin order ${id} deleted`);
    return sendSuccess(null, "Order deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete admin order ${params?.id}`, error);
    return sendError(error, "Failed to delete order", 500);
  }
}, ["ADMIN", "MANAGER"]);
