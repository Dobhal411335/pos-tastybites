/**
 * Convert public cart lines into the shape expected by repricePosCartItems.
 */
export function cartItemsToRepricePayload(cartItems = []) {
  return (Array.isArray(cartItems) ? cartItems : []).map((item, index) => {
    const sizes = [];
    if (item.size || item.selectedSize) {
      const sizeName = item.size || item.selectedSize;
      if (sizeName && !/^standard$/i.test(sizeName) && !/^regular(\s+size)?$/i.test(sizeName)) {
        sizes.push(sizeName);
      }
    }
    if (Array.isArray(item.sizes)) {
      for (const s of item.sizes) {
        if (s && !sizes.includes(s)) sizes.push(s);
      }
    }

    const options = Array.isArray(item.options)
      ? item.options.filter(Boolean)
      : Array.isArray(item.selectedAddons)
        ? item.selectedAddons.map((a) => (typeof a === "string" ? a : a.name)).filter(Boolean)
        : [];

    return {
      id: item.id || item.menuItemId,
      menuItemId: item.id || item.menuItemId,
      name: item.name,
      qty: Math.max(1, Math.floor(Number(item.quantity ?? item.qty) || 1)),
      size: sizes.length ? sizes.join(", ") : item.size || "Standard",
      sizes,
      options,
      choiceSelections: item.choiceSelections || [],
      addonChoiceSelections: item.addonChoiceSelections || [],
      preparationStyle: item.preparationStyle || null,
      isOffer: Boolean(item.isOffer),
      inclusions: item.inclusions || [],
      choices: item.choices || [],
      drinks: item.drinks || [],
      category: item.isOffer
        ? "Offers"
        : item.categoryName || item.category || "",
      cartId: item.cartKey || item.cartId || `online-${index}`,
    };
  });
}

export function normalizeGuestPhone(phone) {
  return String(phone || "").replace(/\D/g, "").slice(0, 15);
}
