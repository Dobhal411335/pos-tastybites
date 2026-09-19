import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import { verifyOrderEmailOtp } from "@/lib/public/orderEmailOtp";

export async function POST(request, { params }) {
  try {
    const { slug } = await params;
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
    });

    return sendSuccess(result, "Email verified");
  } catch (error) {
    return sendError(
      error,
      error.message || "Failed to verify code",
      error.status || 500
    );
  }
}
