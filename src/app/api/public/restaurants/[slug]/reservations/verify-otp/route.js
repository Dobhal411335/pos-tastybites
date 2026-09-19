import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import { verifyOrderEmailOtp } from "@/lib/public/orderEmailOtp";
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
      key: `public-reservation-verify:ip:${ip}`,
      limit: 20,
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
    const otp = body?.otp || body?.code;

    const result = await verifyOrderEmailOtp({
      restaurantId: profile.id,
      email,
      otp,
      mode: "mark",
    });

    return sendSuccess(result, "Email verified — you can submit your booking");
  } catch (error) {
    return sendError(
      error,
      error.message || "Failed to verify code",
      error.status || 500
    );
  }
}
