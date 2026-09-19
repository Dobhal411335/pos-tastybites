import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import { sendOrderEmailOtp } from "@/lib/public/orderEmailOtp";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rateLimit";

export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const ip = clientIpFromRequest(request);
    const ipLimit = checkRateLimit({
      key: `public-reservation-otp:ip:${ip}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return rateLimitResponse(
        ipLimit.retryAfterSec,
        "Too many verification attempts. Please try again later."
      );
    }

    const profile = await getPublicRestaurantProfile(slug);
    if (!profile) {
      return sendError(new Error("Restaurant not found"), "Restaurant not found", 404);
    }

    const body = await request.json();
    const email = body?.email || body?.guestEmail;
    const guestName = body?.name || body?.fullName || body?.guestName;

    const emailKey = String(email || "")
      .trim()
      .toLowerCase();
    if (emailKey.includes("@")) {
      const emailLimit = checkRateLimit({
        key: `public-reservation-otp:email:${profile.id}:${emailKey}`,
        limit: 5,
        windowMs: 60 * 60 * 1000,
      });
      if (!emailLimit.ok) {
        return rateLimitResponse(
          emailLimit.retryAfterSec,
          "Too many codes sent to this email. Please try again later."
        );
      }
    }

    const result = await sendOrderEmailOtp({
      restaurantId: profile.id,
      email,
      guestName,
      restaurantName: profile.name,
    });

    return sendSuccess(
      {
        email: result.email,
        expiresInSeconds: result.expiresInSeconds,
        emailed: result.emailed,
        ...(result.devOtp ? { devOtp: result.devOtp } : {}),
      },
      result.emailed
        ? "Verification code sent to your email"
        : "Verification code ready (dev mode)"
    );
  } catch (error) {
    return sendError(
      error,
      error.message || "Failed to send verification code",
      error.status || 500
    );
  }
}
