import connectDB from "@/lib/db";
import Restaurant from "@/models/Restaurant";
import CompanyBasicInfo from "@/models/Web/CompanyBasicInfo";

export function getDefaultRestaurantSlug() {
  return (
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ||
    process.env.DEFAULT_RESTAURANT_SLUG ||
    ""
  ).trim();
}

/**
 * Resolve an active restaurant by slug, or fall back to the configured default /
 * first active restaurant (single-tenant).
 */
export async function resolveRestaurantBySlug(slug) {
  await connectDB();

  const requested = String(slug || "").trim().toLowerCase();
  const fallbackSlug = getDefaultRestaurantSlug().toLowerCase();

  let restaurant = null;

  if (requested && requested !== "default") {
    restaurant = await Restaurant.findOne({
      slug: requested,
      isActive: { $ne: false },
    }).lean();
  }

  if (!restaurant && fallbackSlug) {
    restaurant = await Restaurant.findOne({
      slug: fallbackSlug,
      isActive: { $ne: false },
    }).lean();
  }

  if (!restaurant) {
    restaurant = await Restaurant.findOne({ isActive: { $ne: false } })
      .sort({ createdAt: 1 })
      .lean();
  }

  return restaurant;
}

export async function getPublicRestaurantProfile(slug) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) return null;

  const company = await CompanyBasicInfo.findOne({
    restaurant: restaurant._id,
  })
    .sort({ updatedAt: -1 })
    .lean();

  const phoneFromCompany = company?.contactNumbers?.[0];
  const phoneDigits = phoneFromCompany?.number
    ? String(phoneFromCompany.number).replace(/\D/g, "")
    : String(restaurant.phone || "").replace(/\D/g, "");
  const phoneCode = phoneFromCompany?.code || "+1";

  const address =
    (Array.isArray(company?.officeAddresses) && company.officeAddresses[0]) ||
    company?.googleAddress ||
    restaurant.address ||
    "";

  const displayName = company?.companyName || restaurant.name || "Restaurant";

  return {
    id: String(restaurant._id),
    slug: restaurant.slug,
    name: displayName,
    email: restaurant.email || company?.emails?.[0] || "",
    phone: phoneDigits,
    phoneCode,
    phoneDisplay: formatPhoneDisplay(phoneDigits),
    address,
    googleMapLink: company?.googleMapLink || "",
    logos: {
      main: company?.mainLogo?.url || "",
      footer: company?.footerLogo?.url || "",
      mobile: company?.mobileUiLogo?.url || "",
    },
    social: {
      facebook: company?.facebookLink || "",
      instagram: company?.instagramLink || "",
      youtube: company?.youtubeLink || "",
    },
    seo: {
      title: company?.titleTagForMainLandingPage || "",
      keywords: company?.keywords || [],
    },
  };
}

export function formatPhoneDisplay(digits) {
  const d = String(digits || "").replace(/\D/g, "");
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return d || "";
}
