export const OFFER_CATEGORY = "Offers";

export function isOfferItem(item) {
  if (!item) return false;
  if (item.isOffer) return true;
  return /^offers?$/i.test(String(item.category || ""));
}

export function cleanOfferList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((value) => String(value).trim()).filter(Boolean);
}

export function offerNeedsOptions(offer) {
  return (
    cleanOfferList(offer?.inclusions).length > 0 ||
    cleanOfferList(offer?.choices).length > 0 ||
    cleanOfferList(offer?.drinks).length > 0
  );
}

export function filterOfferSelections(selected, allowed) {
  const allow = new Set(cleanOfferList(allowed));
  return cleanOfferList(selected).filter((value) => allow.has(value));
}

export function buildOfferCartModifier({ inclusions, choices, drinks } = {}) {
  const parts = [];
  const selectedInclusions = cleanOfferList(inclusions);
  const selectedChoices = cleanOfferList(choices);
  const selectedDrinks = cleanOfferList(drinks);
  if (selectedInclusions.length) parts.push(selectedInclusions.join(", "));
  if (selectedChoices.length) parts.push(selectedChoices.join(", "));
  if (selectedDrinks.length) parts.push(selectedDrinks.join(", "));
  return parts.join(" | ") || undefined;
}

export function getOfferDetailLines(item) {
  const inclusions = cleanOfferList(item?.inclusions);
  const choices = cleanOfferList(item?.choices);
  const drinks = cleanOfferList(item?.drinks);
  const lines = [];

  if (inclusions.length) lines.push({ label: "Includes", value: inclusions.join(", ") });
  if (choices.length) lines.push({ label: "Choices", value: choices.join(", ") });
  if (drinks.length) lines.push({ label: "Drinks", value: drinks.join(", ") });
  if (lines.length) return lines;

  return (item?.options || [])
    .map((opt) => String(opt).trim())
    .filter(Boolean)
    .filter((opt) => /^(includes|choices|drinks)\s*:/i.test(opt))
    .map((opt) => {
      const idx = opt.indexOf(":");
      return {
        label: opt.slice(0, idx).trim(),
        value: opt.slice(idx + 1).trim(),
      };
    })
    .filter((line) => line.value);
}

export function buildOfferOptions(item) {
  return getOfferDetailLines(item).map((line) => `${line.label}: ${line.value}`);
}
