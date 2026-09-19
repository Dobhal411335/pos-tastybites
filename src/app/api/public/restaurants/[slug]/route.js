import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import { buildSameDayPickupSlots } from "@/lib/public/pickup";
import OfferDetails from "@/models/Web/OfferDetails";
import PopupBanner from "@/models/Web/popupBanner";
import connectDB from "@/lib/db";

export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const profile = await getPublicRestaurantProfile(slug);
    if (!profile) {
      return sendError(new Error("Restaurant not found"), "Restaurant not found", 404);
    }

    await connectDB();
    const [offerDetails, popupBanners] = await Promise.all([
      OfferDetails.findOne({ restaurant: profile.id }).lean(),
      PopupBanner.find({ restaurant: profile.id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return sendSuccess(
      {
        ...profile,
        pickupSlots: buildSameDayPickupSlots(),
        promotions: offerDetails
          ? {
              moreOffers: offerDetails.moreOffers || null,
              lastMinuteDeal: offerDetails.lastMinuteDeal || null,
              promoBanner: offerDetails.promoBanner || null,
            }
          : null,
        popups: (popupBanners || []).map((b) => ({
          id: String(b._id),
          heading: b.heading,
          paragraph: b.paragraph,
          buttonLink: b.buttonLink,
          image:
            typeof b.image === "string"
              ? b.image
              : b.image?.url
                ? { url: b.image.url, key: b.image.key || "" }
                : null,
        })),
      },
      "Restaurant retrieved",
      200,
      {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      }
    );
  } catch (error) {
    return sendError(error, "Failed to load restaurant", 500);
  }
}
