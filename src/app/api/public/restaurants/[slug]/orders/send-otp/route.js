import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import { sendOrderEmailOtp } from "@/lib/public/orderEmailOtp";

export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const profile = await getPublicRestaurantProfile(slug);
    if (!profile) {
      return sendError(new Error("Restaurant not found"), "Restaurant not found", 404);
    }

    const body = await request.json();
    const email = body?.email || body?.guestEmail;
    const guestName = body?.fullName || body?.partyName || body?.guestName;

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
