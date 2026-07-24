import { withAuth } from "@/utils/auth";
import Coupon from "@/models/menu/Coupon";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// GET - List all coupons
export const GET = withAuth(async (request) => {
  try {
    const coupons = await Coupon.find({ restaurant: request.restaurant })
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(coupons, "Coupons retrieved successfully");
  } catch (error) {
    logger.error("Failed to list coupons", error);
    return sendError(error, "Failed to retrieve coupons", 500);
  }
}, ["ADMIN", "MANAGER"]);

// POST - Create a new coupon
export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const { code, discountType, value, validFrom, validUntil } = data;

    if (!code || !discountType || !value) {
      return sendError(new Error("Missing fields"), "Code, discount type, and value are required", 400);
    }

    const newCoupon = await Coupon.create({
      restaurant: request.restaurant,
      code: code.toUpperCase(),
      discountType,
      value,
      validFrom,
      validUntil,
      status: "Active",
      createdBy: request.user.id
    });

    logger.info(`Coupon created: ${code}`);
    return sendSuccess(newCoupon, "Coupon created successfully", 201);
  } catch (error) {
    logger.error("Failed to create coupon", error);
    if (error.code === 11000) {
      return sendError(error, "Coupon code already exists", 400);
    }
    return sendError(error, "Failed to create coupon", 500);
  }
}, ["ADMIN", "MANAGER"]);
