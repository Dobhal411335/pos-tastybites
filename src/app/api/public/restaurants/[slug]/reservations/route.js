import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import {
  createTableReservation,
  serializeReservation,
} from "@/lib/public/createTableReservation";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rateLimit";
import { normalizeGuestPhone } from "@/lib/public/cartPayload";
import { assertAndConsumeEmailVerified } from "@/lib/public/orderEmailOtp";

/**
 * Public same-day table booking.
 * Requires a recently verified email OTP. Rate-limited per IP and phone.
 */
export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const ip = clientIpFromRequest(request);

    const ipLimit = checkRateLimit({
      key: `public-reservation:ip:${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return rateLimitResponse(
        ipLimit.retryAfterSec,
        "Too many booking attempts from this network. Please try again later."
      );
    }

    const profile = await getPublicRestaurantProfile(slug);
    if (!profile) {
      return sendError(new Error("Not found"), "Restaurant not found", 404);
    }

    const body = await request.json();
    const email = body?.email || body?.guestEmail;

    await assertAndConsumeEmailVerified({
      restaurantId: profile.id,
      email,
    });

    const phoneDigits = normalizeGuestPhone(body?.phone);

    if (phoneDigits.length >= 7) {
      const phoneLimit = checkRateLimit({
        key: `public-reservation:phone:${profile.id}:${phoneDigits}`,
        limit: 3,
        windowMs: 60 * 60 * 1000,
      });
      if (!phoneLimit.ok) {
        return rateLimitResponse(
          phoneLimit.retryAfterSec,
          "Too many booking attempts for this phone. Please try again later."
        );
      }
    }

    const reservation = await createTableReservation({
      restaurantId: profile.id,
      restaurantName: profile.name,
      guestName: body?.name || body?.guestName,
      phone: body?.phone,
      email,
      date: body?.date,
      time: body?.time,
      guests: body?.guests,
      notes: body?.notes || body?.message,
    });

    return sendSuccess(
      serializeReservation(reservation),
      "Reservation request received",
      201
    );
  } catch (error) {
    return sendError(
      error,
      error.message || "Failed to submit reservation",
      error.status || 500
    );
  }
}
