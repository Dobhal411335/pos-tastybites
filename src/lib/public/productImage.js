/** Fallback when a menu product has no photo. */
export const PRODUCT_IMAGE_PLACEHOLDER = "https://placehold.net/400x400.png";

export function productImageSrc(productOrUrl) {
  if (!productOrUrl) return PRODUCT_IMAGE_PLACEHOLDER;
  if (typeof productOrUrl === "string") {
    const url = productOrUrl.trim();
    if (!url || url.includes("BannerImage")) return PRODUCT_IMAGE_PLACEHOLDER;
    return url;
  }
  const url = productOrUrl.imageUrl || productOrUrl.image || "";
  if (!url || String(url).includes("BannerImage")) return PRODUCT_IMAGE_PLACEHOLDER;
  return url;
}
