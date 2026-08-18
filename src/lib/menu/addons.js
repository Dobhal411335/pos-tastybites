import { normalizeChoiceOptions } from "@/utils/productChoices";

export function normalizeAddons(addons = []) {
  return (Array.isArray(addons) ? addons : [])
    .filter((a) => a && String(a.name || "").trim())
    .map((a) => ({
      name: String(a.name).trim(),
      price: Number(a.price) || 0,
      size: a.size || "Regular",
      status: a.status !== false,
      choiceOptions: normalizeChoiceOptions(a.choiceOptions),
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
      map.set(key, {
        ...prev,
        ...addon,
        name: addon.name,
        choiceOptions: prevHasChoices ? prev.choiceOptions : addon.choiceOptions,
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
