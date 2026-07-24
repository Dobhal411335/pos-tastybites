import { withAuth } from "@/utils/auth";
import Product from "@/models/menu/Product";
import Coupon from "@/models/menu/Coupon";
import Category from "@/models/menu/Category";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// POST - Apply discount (coupon) to a single product or all products in a category
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { couponId, targetType, targetId } = data; // targetType: 'menu' or 'product'

    if (!couponId || !targetType || !targetId) {
      return sendError(new Error("Missing fields"), "Coupon, target type, and target selection are required", 400);
    }

    const coupon = await Coupon.findOne({ _id: couponId, restaurant: request.restaurant });
    if (!coupon) {
      return sendError(new Error("Invalid Coupon"), "Coupon not found", 404);
    }

    let updatedCount = 0;

    if (targetType === "product") {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: targetId, restaurant: request.restaurant },
        { $set: { discount: coupon._id, updatedBy: request.user.id } },
        { new: true }
      );
      if (!updatedProduct) {
        return sendError(new Error("Invalid Product"), "Product not found", 404);
      }
      updatedCount = 1;
    } else if (targetType === "menu") {
      const result = await Product.updateMany(
        { category: targetId, restaurant: request.restaurant },
        { $set: { discount: coupon._id, updatedBy: request.user.id } }
      );
      updatedCount = result.modifiedCount;
    } else {
      return sendError(new Error("Invalid Target Type"), "Target type must be 'menu' or 'product'", 400);
    }

    logger.info(`Discount ${coupon.code} applied to ${updatedCount} products`);
    return sendSuccess({ updatedCount }, `Successfully applied discount to ${updatedCount} product(s)`, 200);
  } catch (error) {
    logger.error("Failed to apply discount", error);
    return sendError(error, "Failed to apply discount", 500);
  }
}, ["ADMIN", "MANAGER"]);
