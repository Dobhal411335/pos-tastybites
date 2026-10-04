import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { resolveRestaurantBySlug } from "@/lib/public/resolveRestaurant";
import { serializePublicOrder } from "@/lib/public/createOnlineOrder";
import { findPublicOnlineOrder } from "@/lib/public/findPublicOnlineOrder";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rateLimit";

/**
 * GET /api/public/restaurants/:slug/orders/track/:orderNumber
 * Public online-order tracker (JSON). Prefer this over /orders/:orderNumber —
 * nested dynamic [orderNumber] under /orders was not always registered by Turbopack.
 */
export async function GET(request, { params }) {
  try {
    const { slug, orderNumber } = await params;
    const ticket = String(orderNumber || "").trim().replace(/^#/, "");
    if (!ticket) {
      return sendError(
        new Error("Order number is required"),
        "Order number is required",
        400,
      );
    }

    const ip = clientIpFromRequest(request);

    const ipLimit = checkRateLimit({
      key: `public-order-track:ip:${ip}`,
      limit: 180,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return rateLimitResponse(
        ipLimit.retryAfterSec,
        "Too many track attempts. Please try again shortly.",
      );
    }

    const orderLimit = checkRateLimit({
      key: `public-order-track:order:${ip}:${ticket}`,
      limit: 120,
      windowMs: 15 * 60 * 1000,
    });
    if (!orderLimit.ok) {
      return rateLimitResponse(
        orderLimit.retryAfterSec,
        "Too many lookups for this order. Please try again shortly.",
      );
    }

    const restaurant = await resolveRestaurantBySlug(slug);
    if (!restaurant) {
      return sendError(
        new Error("Restaurant not found"),
        "Restaurant not found",
        404,
      );
    }

    const order = await findPublicOnlineOrder({
      restaurantId: restaurant._id,
      orderNumber: ticket,
    });

    if (!order) {
      return sendError(new Error("Order not found"), "Order not found", 404);
    }

    return sendSuccess(serializePublicOrder(order), "Order retrieved", 200, {
      "Cache-Control": "no-store",
    });
  } catch (error) {
    return sendError(error, "Failed to load order", 500);
  }
}
