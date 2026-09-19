/** Landing shows a capped product set; full catalog lives on /menu. */
export const LANDING_PRODUCT_LIMIT = 12;
export const LANDING_FAVORITES_LIMIT = 8;
export const LANDING_CATEGORY_LIMIT = 12;

export function pickLandingProducts(products = []) {
  const available = (products || []).filter((p) => p.available !== false);
  const withImages = available.filter(
    (p) => p.imageUrl && !String(p.image || "").includes("BannerImage")
  );
  const pool = withImages.length >= 6 ? withImages : available;
  return pool.slice(0, LANDING_PRODUCT_LIMIT);
}

export function pickLandingFavorites(products = []) {
  return pickLandingProducts(products).slice(0, LANDING_FAVORITES_LIMIT);
}

export function lowestMenuPrice(products = []) {
  const prices = (products || [])
    .filter((p) => p.available !== false)
    .map((p) => Number(p.price) || 0)
    .filter((n) => n > 0);
  if (!prices.length) return null;
  return Math.min(...prices);
}
