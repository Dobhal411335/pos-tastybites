import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { resolveRestaurantBySlug } from "@/lib/public/resolveRestaurant";
import { mapMenuForPublic } from "@/lib/public/mapMenuForPublic";
import Category from "@/models/menu/Category";
import Product from "@/models/menu/Product";
import Offer from "@/models/menu/Offer";
import connectDB from "@/lib/db";

export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const restaurant = await resolveRestaurantBySlug(slug);
    if (!restaurant) {
      return sendError(new Error("Restaurant not found"), "Restaurant not found", 404);
    }

    await connectDB();

    const categories = await Category.find({
      restaurant: restaurant._id,
      status: "Active",
    }).lean();

    const categoryIds = categories.map((c) => c._id);

    const [products, offers] = await Promise.all([
      Product.find({
        restaurant: restaurant._id,
        status: "Active",
        category: { $in: categoryIds },
      })
        .populate("category", "name status")
        .lean(),
      Offer.find({
        restaurant: restaurant._id,
        status: true,
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const menu = mapMenuForPublic({ categories, products, offers });

    return sendSuccess(
      {
        restaurant: {
          id: String(restaurant._id),
          slug: restaurant.slug,
          name: restaurant.name,
        },
        ...menu,
      },
      "Menu retrieved",
      200,
      {
        // Menu items are mostly write-once; long CDN/browser cache is fine.
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      }
    );
  } catch (error) {
    return sendError(error, "Failed to load menu", 500);
  }
}
