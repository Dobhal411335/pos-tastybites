import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import {
  createOnlineOrder,
  serializePublicOrder,
} from "@/lib/public/createOnlineOrder";
import { verifyOrderEmailOtp } from "@/lib/public/orderEmailOtp";

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
