import { withAuth } from "@/utils/auth";
import Coupon from "@/models/menu/Coupon";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// POST - Check and apply a discount coupon
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { code } = data;

    if (!code) {
      return sendError(new Error("Code missing"), "Please provide a coupon code", 400);
    }

    // Find active coupon for this restaurant
    const coupon = await Coupon.findOne({ 
      restaurant: request.restaurant, 
      code: code.trim().toUpperCase(),
      status: "Active" 
    });

    if (!coupon) {
      return sendError(new Error("Invalid Coupon"), "Coupon is invalid or inactive", 404);
    }

    // Check dates if they exist
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return sendError(new Error("Coupon not yet valid"), "This coupon is not active yet", 400);
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return sendError(new Error("Coupon expired"), "This coupon has expired", 400);
    }

    return sendSuccess({
      code: coupon.code,
      discountType: coupon.discountType, // 'amount' or 'percent'
      value: coupon.value
    }, "Coupon applied successfully");

  } catch (error) {
    logger.error("Failed to apply discount", error);
    return sendError(error, "Failed to apply discount", 500);
  }
}, ["ADMIN", "MANAGER", "STAFF"]);
