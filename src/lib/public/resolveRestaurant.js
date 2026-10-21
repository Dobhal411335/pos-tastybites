import connectDB from "@/lib/db";
import Restaurant from "@/models/Restaurant";
import CompanyBasicInfo from "@/models/Web/CompanyBasicInfo";
import {
  getTodayRestaurantHours,
  normalizeRestaurantHours,
} from "@/lib/public/restaurantHours";
import { getRestaurantTimezone } from "@/lib/restaurantTime";

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

  // Schema field is restaurantId; older writes used `restaurant`.
  let company = await CompanyBasicInfo.findOne({
    $or: [
      { restaurantId: restaurant._id },
      { restaurant: restaurant._id },
    ],
  })
    .sort({ updatedAt: -1 })
    .lean();

  // Legacy / single-tenant records may not have restaurant set on the doc.
  if (!company) {
    company = await CompanyBasicInfo.findOne().sort({ updatedAt: -1 }).lean();
  }

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
  const restaurantHours = normalizeRestaurantHours(company?.restaurantHours);
  const todayHours = getTodayRestaurantHours(
    restaurantHours,
    new Date(),
    getRestaurantTimezone(),
  );

  const officeAddresses =
    Array.isArray(company?.officeAddresses) &&
    company.officeAddresses.filter(Boolean).length > 0
      ? company.officeAddresses.filter(Boolean)
      : address
        ? [address]
        : [];

  const contactNumbers =
    Array.isArray(company?.contactNumbers) && company.contactNumbers.length > 0
      ? company.contactNumbers
          .map((c) => (typeof c === "object" && c ? c.number || c.label : c))
          .filter(Boolean)
      : phoneDigits
        ? [phoneDigits]
        : [];

  const emails =
    Array.isArray(company?.emails) && company.emails.filter(Boolean).length > 0
      ? company.emails.filter(Boolean)
      : (restaurant.email || company?.emails?.[0])
        ? [restaurant.email || company?.emails?.[0]]
        : [];

  const googleHref =
    company?.googleLink?.trim() ||
    company?.googleUrl?.trim() ||
    company?.googleMapLink?.trim() ||
    "";

  return {
    id: String(restaurant._id),
    slug: restaurant.slug,
    name: displayName,
    email: restaurant.email || company?.emails?.[0] || "",
    emails,
    phone: phoneDigits,
    phoneCode,
    phoneDisplay: formatPhoneDisplay(phoneDigits),
    contactNumbers,
    address,
    officeAddresses,
    googleMapLink: company?.googleMapLink || "",
    googleHref,
    logos: {
      main: company?.mainLogo?.url || "",
      footer: company?.footerLogo?.url || "",
      mobile: company?.mobileUiLogo?.url || "",
    },
    social: {
      facebook: company?.facebookLink || "",
      instagram: company?.instagramLink || "",
      youtube: company?.youtubeLink || "",
      google: googleHref,
    },
    seo: {
      title: company?.titleTagForMainLandingPage || "",
      keywords: company?.keywords || [],
    },
    restaurantHours,
    todayHours,
  };
}

export function formatPhoneDisplay(digits) {
  const d = String(digits || "").replace(/\D/g, "");
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return d || "";
}
