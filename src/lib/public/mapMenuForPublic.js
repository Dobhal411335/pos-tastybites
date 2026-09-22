import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/public/productImage";

/**
 * Map POS Product/Category documents into a safe public menu payload.
 */

function activeVariants(variants = []) {
  return (Array.isArray(variants) ? variants : [])
    .filter((v) => v && v.status !== false)
    .map((v) => ({
      size: v.size,
      price: Number(v.price) || 0,
    }));
}

function activeAddons(addons = []) {
  return (Array.isArray(addons) ? addons : [])
    .filter((a) => a && a.status !== false)
    .map((a) => ({
      name: a.name,
      price: Number(a.price) || 0,
      size: a.size || "Regular",
      choiceOptions: (a.choiceOptions || []).map((c) => ({
        name: c.name,
        subChoices: c.subChoices || [],
      })),
    }));
}

function mapChoiceOptions(choiceOptions = []) {
  return (Array.isArray(choiceOptions) ? choiceOptions : []).map((c) => ({
    name: c.name,
    subChoices: c.subChoices || [],
  }));
}

export function displayBasePrice(product) {
  const variants = activeVariants(product.variants);
  if (variants.length === 0) return 0;
  if (variants.length === 1) return variants[0].price;
  return Math.min(...variants.map((v) => v.price));
}

export function mapProductForPublic(product, categoryMap = new Map()) {
  const categoryId = product.category?._id
    ? String(product.category._id)
    : String(product.category || "");
  const categoryName =
    product.category?.name ||
    categoryMap.get(categoryId)?.name ||
    "";
  const categorySlug = slugify(categoryName) || categoryId;

  const variants = activeVariants(product.variants);
  const addons = activeAddons(product.addons);
  const choiceOptions = mapChoiceOptions(product.choiceOptions);
  const imageUrl = product.image?.url || "";

  return {
    id: String(product._id),
    name: product.name,
    description: product.description || "",
    desc: product.description || "",
    productCode: product.productCode || "",
    productType: product.productType || "KITCHEN",
    categoryId,
    category: categorySlug,
    categoryName,
    image: imageUrl || PRODUCT_IMAGE_PLACEHOLDER,
    imageUrl,
    available: product.status === "Active",
    price: displayBasePrice(product),
    variants,
    // Back-compat shape for existing ProductConfigModal (sizes as variants)
    sizes: variants.map((v) => ({
      name: v.size,
      price: 0,
      absolutePrice: v.price,
      tax: 0,
    })),
    addons: addons.map((a) => ({
      name: a.name,
      price: a.price,
      tax: 0,
      choiceOptions: a.choiceOptions,
    })),
    choiceOptions,
    preparationStyles: product.preparationStyles || [],
    hasModifiers:
      variants.length > 1 ||
      addons.length > 0 ||
      choiceOptions.length > 0 ||
      (product.preparationStyles || []).length > 0,
  };
}

function isOfferCurrentlyValid(offer, now = new Date()) {
  if (!offer || offer.status === false) return false;
  if (offer.validFrom && new Date(offer.validFrom) > now) return false;
  if (offer.validTo && new Date(offer.validTo) < now) return false;
  return true;
}

export function mapOfferForPublic(offer) {
  const imageUrl = offer.image?.url || "";
  const inclusions = Array.isArray(offer.inclusions)
    ? offer.inclusions.map((v) => String(v).trim()).filter(Boolean)
    : [];
  const choices = Array.isArray(offer.choices)
    ? offer.choices.map((v) => String(v).trim()).filter(Boolean)
    : [];
  const drinks = Array.isArray(offer.drinks)
    ? offer.drinks.map((v) => String(v).trim()).filter(Boolean)
    : [];

  return {
    id: String(offer._id),
    name: offer.name,
    slug:
      String(offer.slug || "").trim().toLowerCase() ||
      slugify(offer.name) ||
      String(offer._id),
    description: offer.description || "",
    price: Number(offer.price) || 0,
    totalPrice: Number(offer.totalPrice) || Number(offer.price) || 0,
    image: imageUrl || PRODUCT_IMAGE_PLACEHOLDER,
    imageUrl,
    inclusions,
    choices,
    drinks,
    validFrom: offer.validFrom || null,
    validTo: offer.validTo || null,
    status: offer.status !== false,
    isOffer: true,
    category: "Offers",
    categoryName: "Offers",
    hasOptions: inclusions.length > 0 || choices.length > 0 || drinks.length > 0,
  };
}

export function mapMenuForPublic({ categories = [], products = [], offers = [] }) {
  const categoryMap = new Map(
    categories.map((c) => [String(c._id), c])
  );

  const publicCategories = categories
    .filter((c) => c.status === "Active")
    .map((c) => {
      const categoryProducts = products.filter(
        (p) => String(p.category?._id || p.category) === String(c._id)
      );
      const withImage = categoryProducts.find((p) => p.image?.url);
      const imageUrl = withImage?.image?.url || "";
      return {
        id: String(c._id),
        name: c.name,
        slug: slugify(c.name) || String(c._id),
        items: categoryProducts.length,
        image: imageUrl || PRODUCT_IMAGE_PLACEHOLDER,
        imageUrl,
      };
    })
    .filter((c) => c.items > 0);

  const publicProducts = products
    .filter((p) => p.status === "Active")
    .map((p) => mapProductForPublic(p, categoryMap));

  const now = new Date();
  const publicOffers = offers
    .filter((o) => isOfferCurrentlyValid(o, now))
    .map(mapOfferForPublic);

  return {
    categories: publicCategories,
    products: publicProducts,
    offers: publicOffers,
  };
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
