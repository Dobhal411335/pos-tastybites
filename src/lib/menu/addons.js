import { normalizeChoiceOptions } from "@/utils/productChoices";

export function normalizeIngredients(ingredients = []) {
  return [
    ...new Set(
      (Array.isArray(ingredients) ? ingredients : [])
        .map((i) => {
          if (i == null) return "";
          if (typeof i === "string" || typeof i === "number") {
            return String(i).trim();
          }
          if (typeof i === "object") {
            return String(i.name || i.label || i.title || "").trim();
          }
          return String(i).trim();
        })
        .filter(Boolean),
    ),
  ];
}

export function normalizeAddons(addons = []) {
  return (Array.isArray(addons) ? addons : [])
    .filter((a) => a && String(a.name || "").trim())
    .map((a) => ({
      name: String(a.name).trim(),
      price: Number(a.price) || 0,
      size: a.size || "Regular",
      status: a.status !== false,
      choiceOptions: normalizeChoiceOptions(a.choiceOptions),
      ingredients: normalizeIngredients(a.ingredients),
    }));
}

export function mergeAddons(existing = [], incoming = []) {
  const map = new Map();
  for (const addon of normalizeAddons(existing)) {
    map.set(addon.name.toLowerCase(), { ...addon });
  }
  for (const addon of normalizeAddons(incoming)) {
    const key = addon.name.toLowerCase();
    const prev = map.get(key);
    if (prev) {
      const prevHasChoices = (prev.choiceOptions || []).length > 0;
      const prevHasIngredients = (prev.ingredients || []).length > 0;
      map.set(key, {
        ...prev,
        ...addon,
        name: addon.name,
        choiceOptions: prevHasChoices ? prev.choiceOptions : addon.choiceOptions,
        ingredients: prevHasIngredients ? prev.ingredients : addon.ingredients,
      });
    } else {
      map.set(key, { ...addon });
    }
  }
  return Array.from(map.values());
}

export function markCategoryAddons(productAddons = [], categoryAddons = []) {
  const categoryNames = new Set(
    normalizeAddons(categoryAddons).map((a) => a.name.toLowerCase())
  );
  return mergeAddons(productAddons, categoryAddons).map((addon) => ({
    ...addon,
    fromCategory: categoryNames.has(addon.name.toLowerCase()),
  }));
}

export function stripAddonClientFields(addons = []) {
  return normalizeAddons(addons).map(({ fromCategory, ...addon }) => addon);
}
