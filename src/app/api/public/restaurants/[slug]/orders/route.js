import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import {
  getPublicRestaurantProfile,
  resolveRestaurantBySlug,
} from "@/lib/public/resolveRestaurant";
import {
  createOnlineOrder,
  serializePublicOrder,
} from "@/lib/public/createOnlineOrder";
import { findPublicOnlineOrder } from "@/lib/public/findPublicOnlineOrder";
import { verifyOrderEmailOtp } from "@/lib/public/orderEmailOtp";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rateLimit";

/**
 * GET /api/public/restaurants/:slug/orders?orderNumber=0032
 * Fallback tracker endpoint (always on the registered /orders route).
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const ticket = String(
      request.nextUrl.searchParams.get("orderNumber") || "",
    )
      .trim()
      .replace(/^#/, "");

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

export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const profile = await getPublicRestaurantProfile(slug);
    if (!profile) {
      return sendError(new Error("Restaurant not found"), "Restaurant not found", 404);
    }

    const body = await request.json();
    const {
      items,
      partyName,
      fullName,
      contactNumber,
      phone,
      guestCountryCode,
      guestEmail,
      email,
      pickupTime,
      specialNote,
      customerNote,
      message,
      otp,
      verificationCode,
    } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(new Error("Empty cart"), "Cart cannot be empty", 400);
    }

    const orderEmail = String(guestEmail || email || "").trim();
    if (!orderEmail) {
      return sendError(new Error("Email is required"), "Email is required", 400);
    }

    await verifyOrderEmailOtp({
      restaurantId: profile.id,
      email: orderEmail,
      otp: otp || verificationCode,
    });

    const { order } = await createOnlineOrder({
      restaurantId: profile.id,
      restaurantName: profile.name,
      restaurantAddress: profile.address || "",
      items,
      partyName: partyName || fullName,
      contactNumber: contactNumber || phone,
      guestCountryCode: guestCountryCode || "+1",
      guestEmail: orderEmail,
      pickupTime,
      customerNote: customerNote || specialNote || message || "",
    });

    return sendSuccess(
      serializePublicOrder(order.toObject ? order.toObject() : order),
      "Order placed successfully",
      201
    );
  } catch (error) {
    return sendError(
      error,
      error.message || "Failed to place order",
      error.status || 500
    );
  }
}
