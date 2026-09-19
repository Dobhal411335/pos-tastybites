import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { resolveRestaurantBySlug } from "@/lib/public/resolveRestaurant";
import { serializePublicOrder } from "@/lib/public/createOnlineOrder";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rateLimit";
import Order from "@/models/Order";
import connectDB from "@/lib/db";

/**
 * Public order tracker (no auth, no phone gate).
 * Rate-limited per IP and per IP+orderNumber.
 */
export async function GET(request, { params }) {
  try {
    const { slug, orderNumber } = await params;
    const ticket = String(orderNumber || "").trim();
    if (!ticket) {
      return sendError(new Error("Missing order"), "Order number is required", 400);
    }

    const ip = clientIpFromRequest(request);

    const ipLimit = checkRateLimit({
      key: `public-order-track:ip:${ip}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return rateLimitResponse(
        ipLimit.retryAfterSec,
        "Too many track attempts. Please try again shortly."
      );
    }

    const orderLimit = checkRateLimit({
      key: `public-order-track:order:${ip}:${ticket}`,
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });
    if (!orderLimit.ok) {
      return rateLimitResponse(
        orderLimit.retryAfterSec,
        "Too many lookups for this order. Please try again shortly."
      );
    }

    const restaurant = await resolveRestaurantBySlug(slug);
    if (!restaurant) {
      return sendError(new Error("Not found"), "Restaurant not found", 404);
    }

    await connectDB();

    const order = await Order.findOne({
      restaurantId: restaurant._id,
      orderNumber: ticket,
      source: "ONLINE",
      isActive: { $ne: false },
    }).lean();

    if (!order) {
      return sendError(new Error("Not found"), "Order not found", 404);
    }

    return sendSuccess(serializePublicOrder(order), "Order retrieved", 200, {
      "Cache-Control": "no-store",
    });
  } catch (error) {
    return sendError(error, "Failed to load order", 500);
  }
}
