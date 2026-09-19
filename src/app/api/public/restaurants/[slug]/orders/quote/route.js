import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { resolveRestaurantBySlug } from "@/lib/public/resolveRestaurant";
import { quoteOnlineOrder } from "@/lib/public/createOnlineOrder";

export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const restaurant = await resolveRestaurantBySlug(slug);
    if (!restaurant) {
      return sendError(new Error("Restaurant not found"), "Restaurant not found", 404);
    }

    const body = await request.json();
    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(new Error("Empty cart"), "Cart cannot be empty", 400);
    }

    const quote = await quoteOnlineOrder({
      restaurantId: restaurant._id,
      items,
    });

    return sendSuccess(quote, "Quote calculated");
  } catch (error) {
    return sendError(
      error,
      error.message || "Failed to calculate quote",
      error.status || 500
    );
  }
}
