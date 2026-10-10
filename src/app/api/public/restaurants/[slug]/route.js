import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import { buildSameDayPickupSlots } from "@/lib/public/pickup";
import { timeToMinutes } from "@/lib/public/restaurantHours";
import { getRestaurantTimezone } from "@/lib/restaurantTime";
import OfferDetails from "@/models/Web/OfferDetails";
import PopupBanner from "@/models/Web/popupBanner";
import ManageBanner from "@/models/Web/ManageBanners";
import connectDB from "@/lib/db";

export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const profile = await getPublicRestaurantProfile(slug);
    if (!profile) {
      return sendError(new Error("Restaurant not found"), "Restaurant not found", 404);
    }

    await connectDB();
    const [offerDetails, popupBanners, heroBanners] = await Promise.all([
      OfferDetails.findOne({ restaurant: profile.id }).lean(),
      PopupBanner.find({ restaurant: profile.id }).sort({ createdAt: -1 }).limit(5).lean(),
      ManageBanner.find({
        restaurant: profile.id,
        "image.url": { $exists: true, $ne: "" },
        link: { $exists: true, $ne: "" },
      })
        .sort({ createdAt: -1 })
        .select("image link title")
        .lean(),
    ]);

    const todayHours = profile.todayHours || null;
    const pickupOptions = {};
    // Whole day closed, or today's open window already ended → no pickup slots.
    // 24h restaurants never force-close on pastClose.
    if (
      todayHours?.closed ||
      (!todayHours?.is24Hours && todayHours?.pastClose)
    ) {
      pickupOptions.forceClosed = true;
    } else if (todayHours?.is24Hours) {
      pickupOptions.openMinutes = 0;
      pickupOptions.endMinutes = 23 * 60 + 45;
      pickupOptions.is24Hours = true;
    } else if (todayHours) {
      const openMin = timeToMinutes(todayHours.open);
      const closeMin = timeToMinutes(todayHours.close);
      if (openMin != null) pickupOptions.openMinutes = openMin;
      // Last slot must be before close (exclusive of closing minute).
      if (closeMin != null) {
        pickupOptions.endMinutes = Math.max(0, closeMin - 15);
      }
    }

    return sendSuccess(
      {
        ...profile,
        pickupSlots: pickupOptions.forceClosed
          ? []
          : buildSameDayPickupSlots(undefined, undefined, pickupOptions),
        timezone: getRestaurantTimezone(),
        todayHours,
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
        banners: (heroBanners || []).map((b) => ({
          id: String(b._id),
          imageUrl: b.image?.url || "",
          link: b.link || "",
          title: b.title || "",
        })),
      },
      "Restaurant retrieved",
      200,
      {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      }
    );
  } catch (error) {
    return sendError(error, "Failed to load restaurant", 500);
  }
}
