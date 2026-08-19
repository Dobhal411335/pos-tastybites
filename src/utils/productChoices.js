import { getOfferDetailLines, isOfferItem } from "./offerDetails";

export function cleanChoiceList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((value) => String(value).trim()).filter(Boolean);
}

export function normalizeChoiceOptions(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((group) => ({
      name: String(group?.name || "").trim(),
      subChoices: cleanChoiceList(group?.subChoices),
    }))
    .filter((group) => group.name && group.subChoices.length > 0);
}

export function normalizeChoiceSelections(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((group) => ({
      name: String(group?.name || "").trim(),
      subChoices: cleanChoiceList(group?.subChoices),
    }))
    .filter((group) => group.name && group.subChoices.length > 0);
}

export function productHasChoiceOptions(product) {
  return normalizeChoiceOptions(product?.choiceOptions).length > 0;
}

export function filterProductChoiceSelections(selected, allowed) {
  const allowedGroups = normalizeChoiceOptions(allowed);
  return normalizeChoiceSelections(selected)
    .map((sel) => {
      const match = allowedGroups.find(
        (group) => group.name.toLowerCase() === sel.name.toLowerCase(),
      );
      if (!match) return null;
      const allowByLower = new Map(
        match.subChoices.map((value) => [value.toLowerCase(), value]),
      );
      const subChoices = sel.subChoices
        .map((value) => allowByLower.get(value.toLowerCase()))
        .filter(Boolean);
      if (!subChoices.length) return null;
      return { name: match.name, subChoices };
    })
    .filter(Boolean);
}

export function getProductChoiceDetailLines(item) {
  return normalizeChoiceSelections(item?.choiceSelections).map((group) => ({
    label: group.name,
    value: group.subChoices.join(", "),
  }));
}

export function getAddonChoiceDetailLines(item) {
  return normalizeChoiceSelections(item?.addonChoiceSelections).map((group) => ({
    label: group.name,
    value: group.subChoices.join(", "),
  }));
}

export function isStyleOption(opt, preparationStyle) {
  const value = String(opt || "").trim();
  const lower = value.toLowerCase();
  if (lower.startsWith("style:")) return true;
  if (
    preparationStyle &&
    lower === String(preparationStyle).trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

/** Addon / extra labels stored on `item.options`, excluding preparation style. */
export function getItemExtraOptions(item) {
  return (item?.options || []).filter(
    (opt) => !isStyleOption(opt, item?.preparationStyle),
  );
}

/**
 * Kitchen + customer tickets share this so extras, addons, and choices
 * print the same way on both.
 */
export function getReceiptModifierLines(item) {
  const lines = [];
  const style = String(item?.preparationStyle || "").trim();
  if (style) {
    lines.push({ kind: "style", text: `+ ${style}` });
  }

  if (isOfferItem(item)) {
    for (const line of getOfferDetailLines(item)) {
      lines.push({ kind: "offer", text: `${line.label}: ${line.value}` });
    }
    return lines;
  }

  for (const line of getProductChoiceDetailLines(item)) {
    lines.push({ kind: "choice", text: `${line.label}: ${line.value}` });
  }
  for (const line of getAddonChoiceDetailLines(item)) {
    lines.push({ kind: "addon-choice", text: `${line.label}: ${line.value}` });
  }
  for (const opt of getItemExtraOptions(item)) {
    const label = String(opt || "").trim();
    if (label) lines.push({ kind: "extra", text: `+ ${label}` });
  }
  return lines;
}

export function cartChoiceSelectionsKey(selections) {
  return JSON.stringify(
    normalizeChoiceSelections(selections).map((group) => ({
      name: group.name,
      subChoices: [...group.subChoices].sort(),
    })),
  );
}
