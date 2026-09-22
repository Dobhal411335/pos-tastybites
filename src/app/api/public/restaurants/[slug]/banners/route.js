import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import connectDB from "@/lib/db";
import ManageBanner from "@/models/Web/ManageBanners";

/**
 * Public hero banners: image + click-through link.
 */
export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const profile = await getPublicRestaurantProfile(slug);
    if (!profile) {
      return sendError(new Error("Restaurant not found"), "Restaurant not found", 404);
    }

    await connectDB();
    const banners = await ManageBanner.find({
      restaurant: profile.id,
      "image.url": { $exists: true, $ne: "" },
      link: { $exists: true, $ne: "" },
    })
      .sort({ createdAt: -1 })
      .select("image link title createdAt")
      .lean();

    const data = banners.map((b) => ({
      id: String(b._id),
      imageUrl: b.image?.url || "",
      link: b.link || "",
      title: b.title || "",
    }));

    return sendSuccess(data, "Banners retrieved", 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    });
  } catch (error) {
    return sendError(error, "Failed to load banners", 500);
  }
}
