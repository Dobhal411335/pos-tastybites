/** Client-safe restaurant slug used by ordering pages. */
export function getPublicRestaurantSlug() {
  if (typeof process !== "undefined") {
    const fromEnv = (
      process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG || ""
    ).trim();
    if (fromEnv) return fromEnv;
  }
  return "default";
}

export function publicApiBase(slug) {
  const s = slug || getPublicRestaurantSlug();
  return `/api/public/restaurants/${encodeURIComponent(s)}`;
}
