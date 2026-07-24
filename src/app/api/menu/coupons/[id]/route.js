import { withAuth } from "@/utils/auth";
import Coupon from "@/models/menu/Coupon";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// PUT - Update a coupon
export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Coupon ID is required", 400);

    const data = await request.json();
    const updateData = { updatedBy: request.user.id };

    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.discountType !== undefined) updateData.discountType = data.discountType;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.status !== undefined) updateData.status = data.status;

    const updatedCoupon = await Coupon.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      return sendError(new Error("Not Found"), "Coupon not found", 404);
    }

    logger.info(`Coupon updated: ${id}`);
    return sendSuccess(updatedCoupon, "Coupon updated successfully");
  } catch (error) {
    logger.error(`Failed to update coupon ${params?.id}`, error);
    if (error.code === 11000) {
      return sendError(error, "Coupon code already exists", 400);
    }
    return sendError(error, "Failed to update coupon", 500);
  }
}, ["ADMIN", "MANAGER"]);

// DELETE - Remove coupon
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    if (!id) return sendError(new Error("Missing ID"), "Coupon ID is required", 400);

    const deleted = await Coupon.findOneAndDelete({ _id: id, restaurant: request.restaurant });
    
    if (!deleted) {
      return sendError(new Error("Not Found"), "Coupon not found", 404);
    }

    logger.info(`Coupon deleted: ${id}`);
    return sendSuccess(null, "Coupon deleted successfully");
  } catch (error) {
    logger.error(`Failed to delete coupon ${params?.id}`, error);
    return sendError(error, "Failed to delete coupon", 500);
  }
}, ["ADMIN", "MANAGER"]);
