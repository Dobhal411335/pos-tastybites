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

export function cartChoiceSelectionsKey(selections) {
  return JSON.stringify(
    normalizeChoiceSelections(selections).map((group) => ({
      name: group.name,
      subChoices: [...group.subChoices].sort(),
    })),
  );
}
