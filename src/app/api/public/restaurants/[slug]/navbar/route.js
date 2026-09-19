import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { getPublicRestaurantProfile } from "@/lib/public/resolveRestaurant";
import connectDB from "@/lib/db";
import NavbarSection from "@/models/Web/NavbarSection";

/**
 * Public navbar menu: active sections + active subsections only.
 */
export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const profile = await getPublicRestaurantProfile(slug);
    if (!profile) {
      return sendError(new Error("Restaurant not found"), "Restaurant not found", 404);
    }

    await connectDB();
    const sections = await NavbarSection.find({
      restaurant: profile.id,
      active: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const data = sections.map((section) => ({
      _id: String(section._id),
      title: section.title,
      url: section.url || "#",
      active: section.active !== false,
      order: section.order || 0,
      subSections: (section.subSections || [])
        .filter((sub) => sub?.active !== false && sub?.title)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((sub) => ({
          _id: sub._id ? String(sub._id) : undefined,
          title: sub.title,
          url: sub.url || "#",
          active: true,
          order: sub.order || 0,
        })),
    }));

    return sendSuccess(data, "Navbar sections retrieved", 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    });
  } catch (error) {
    return sendError(error, "Failed to load navbar sections", 500);
  }
}
