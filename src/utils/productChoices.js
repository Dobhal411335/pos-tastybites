import { getOfferDetailLines, isOfferItem } from "./offerDetails";

export function cleanChoiceList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((value) => String(value).trim()).filter(Boolean);
}

/** Parse "Ranch ×3" / "Ranch x3" into { name, qty }. */
export function parseChoiceLabelWithQty(raw) {
  const text = String(raw || "").trim();
  if (!text) return { name: "", qty: 0 };
  const match = text.match(/^(.*?)(?:\s*[×xX*]\s*(\d+))\s*$/);
  if (match && match[1] && match[2]) {
    return {
      name: String(match[1]).trim(),
      qty: Math.max(1, Math.floor(Number(match[2]) || 1)),
    };
  }
  return { name: text, qty: 1 };
}

export function formatChoiceLabelWithQty(name, qty = 1) {
  const label = String(name || "").trim();
  const count = Math.max(0, Math.floor(Number(qty) || 0));
  if (!label || count <= 0) return "";
  return count > 1 ? `${label} ×${count}` : label;
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

/**
 * Keep only allowed choice names. Preserves qty labels like "Ranch ×3"
 * so online/POS addon nested qtys survive reprice + Order save.
 */
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

      // Merge duplicate base names and keep qty
      const qtyByName = new Map();
      for (const value of sel.subChoices) {
        const parsed = parseChoiceLabelWithQty(value);
        if (!parsed.name) continue;
        const allowedName = allowByLower.get(parsed.name.toLowerCase());
        if (!allowedName) continue;
        qtyByName.set(
          allowedName,
          (qtyByName.get(allowedName) || 0) + parsed.qty,
        );
      }

      const subChoices = [...qtyByName.entries()]
        .map(([name, qty]) => formatChoiceLabelWithQty(name, qty))
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

/** Normalize nested addon choice qty map: { [subChoice]: qty }. Accepts legacy string[]. */
export function normalizeAddonChoiceQtyMap(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const map = {};
    for (const value of cleanChoiceList(raw)) {
      const parsed = parseChoiceLabelWithQty(value);
      if (!parsed.name || parsed.qty <= 0) continue;
      map[parsed.name] = (Number(map[parsed.name]) || 0) + parsed.qty;
    }
    return map;
  }
  if (typeof raw !== "object") return {};
  const map = {};
  for (const [name, qty] of Object.entries(raw)) {
    const label = String(name || "").trim();
    const count = Math.max(0, Math.floor(Number(qty) || 0));
    if (!label || count <= 0) continue;
    map[label] = count;
  }
  return map;
}

export function sumAddonChoiceQtyMap(raw) {
  return Object.values(normalizeAddonChoiceQtyMap(raw)).reduce(
    (sum, qty) => sum + qty,
    0,
  );
}

/** Cart / KOT facing labels, e.g. ["Ranch ×3", "BBQ ×1"]. */
export function formatAddonChoiceSubChoices(raw) {
  return Object.entries(normalizeAddonChoiceQtyMap(raw))
    .map(([name, qty]) => formatChoiceLabelWithQty(name, qty))
    .filter(Boolean);
}

export function buildAddonChoiceSelectionsFromQtyMaps(
  addon,
  choicesByGroup = {},
) {
  return normalizeChoiceOptions(addon?.choiceOptions)
    .map((group, index) => ({
      name: group.name,
      subChoices: formatAddonChoiceSubChoices(choicesByGroup[index]),
    }))
    .filter((group) => group.subChoices.length > 0);
}

/**
 * Validate nested addon choice groups against parent addon qty.
 * Each group total must equal addonQty when the addon has nested options.
 */
export function validateAddonNestedChoiceQtys(addon, addonQty, choicesByGroup = {}) {
  const groups = normalizeChoiceOptions(addon?.choiceOptions);
  if (!groups.length || !(Number(addonQty) > 0)) {
    return { ok: true, errors: [] };
  }
  const errors = [];
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const total = sumAddonChoiceQtyMap(choicesByGroup[index]);
    const required = Math.max(0, Math.floor(Number(addonQty) || 0));
    if (total !== required) {
      errors.push({
        groupName: group.name,
        total,
        required,
        message:
          total > required
            ? `${group.name}: selected ${total}, but addon qty is only ${required}.`
            : `${group.name}: selected ${total}, must equal addon qty (${required}).`,
      });
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Server-side check for saved/cart addonChoiceSelections vs line qty.
 * Used by public quote/order reprice so kitchen qty labels stay honest.
 */
export function validateAddonChoiceSelectionsAgainstLineQty({
  addon,
  lineQty,
  addonChoiceSelections,
  addonName = "Addon",
} = {}) {
  const groups = normalizeChoiceOptions(addon?.choiceOptions);
  const required = Math.max(0, Math.floor(Number(lineQty) || 0));
  if (!groups.length || required <= 0) {
    return { ok: true, errors: [] };
  }

  const selected = normalizeChoiceSelections(addonChoiceSelections);
  const errors = [];

  for (const group of groups) {
    const sel = selected.find(
      (entry) => entry.name.toLowerCase() === group.name.toLowerCase(),
    );
    const total = sumAddonChoiceQtyMap(sel?.subChoices || []);
    if (total !== required) {
      errors.push({
        groupName: group.name,
        total,
        required,
        message:
          total > required
            ? `${addonName} / ${group.name}: selected ${total}, but qty is only ${required}.`
            : `${addonName} / ${group.name}: selected ${total}, must equal qty (${required}).`,
      });
    }
  }

  return { ok: errors.length === 0, errors };
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

export function isStandaloneExtraLine(item) {
  return /^extra$/i.test(String(item?.size || ""));
}

/**
 * Standalone Extra lines store the addon name in both `name` and `options`
 * (options are required for pricing). Skip that label on tickets/cart UI.
 */
export function isRedundantStandaloneExtraOption(item, opt) {
  if (!isStandaloneExtraLine(item)) return false;
  const itemName = String(item?.name || "").trim().toLowerCase();
  const label = String(opt || "").trim().toLowerCase();
  return Boolean(itemName && label && itemName === label);
}

/** Addon / extra labels stored on `item.options`, excluding preparation style. */
export function getItemExtraOptions(item) {
  return (item?.options || []).filter((opt) => {
    if (isStyleOption(opt, item?.preparationStyle)) return false;
    if (isRedundantStandaloneExtraOption(item, opt)) return false;
    return true;
  });
}

/**
 * Hide cart modifier text that only repeats a standalone Extra line's name
 * (e.g. "Egg", "Addons: Egg", "Extras: Egg").
 */
export function getVisibleCartModifier(item) {
  const raw = String(item?.modifier || "").trim();
  if (!raw) return "";
  if (!isStandaloneExtraLine(item)) return raw;

  const itemName = String(item?.name || "").trim();
  if (!itemName) return raw;

  const escaped = itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exact = new RegExp(`^(?:addons|extras)\\s*:\\s*${escaped}$`, "i");
  if (raw.toLowerCase() === itemName.toLowerCase() || exact.test(raw)) {
    return "";
  }

  // "Addons: Egg · Cooked: Soft" → keep only the nested choice summary
  const prefixed = new RegExp(
    `^(?:addons|extras)\\s*:\\s*${escaped}\\s*[·|]\\s*`,
    "i",
  );
  const stripped = raw.replace(prefixed, "").trim();
  return stripped || raw;
}

/**
 * Kitchen + customer tickets share this so extras, addons, and choices
 * print the same way on both.
 * Nested addon qtys (e.g. "Hot Sauce ×3") are listed per sub-choice for chefs.
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

  for (const group of normalizeChoiceSelections(item?.choiceSelections)) {
    lines.push({ kind: "choice", text: `${group.name}:` });
    for (const sub of group.subChoices) {
      lines.push({ kind: "choice-item", text: `• ${sub}` });
    }
  }

  for (const group of normalizeChoiceSelections(item?.addonChoiceSelections)) {
    lines.push({ kind: "addon-choice", text: `${group.name}:` });
    for (const sub of group.subChoices) {
      // Preserves qty labels from Order.addonChoiceSelections, e.g. "Hot Sauce ×3"
      lines.push({ kind: "addon-choice-item", text: `• ${sub}` });
    }
  }

  for (const opt of getItemExtraOptions(item)) {
    const label = String(opt || "").trim();
    if (label) lines.push({ kind: "extra", text: `+ ${label}` });
  }

  for (const extra of normalizeCustomExtras(item?.customExtras)) {
    lines.push({
      kind: "custom-extra",
      text: `+ ${extra.name}`,
      price: extra.price,
    });
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

/** Normalize free-text POS custom extras: [{ name, price }]. */
export function normalizeCustomExtras(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      const name = String(entry?.name || "").trim();
      const price = Math.round((Number(entry?.price) || 0) * 100) / 100;
      return { name, price };
    })
    .filter(
      (entry) =>
        entry.name &&
        entry.name.length <= 80 &&
        Number.isFinite(entry.price) &&
        entry.price >= 0,
    );
}

export function customExtrasUnitTotal(list) {
  return normalizeCustomExtras(list).reduce((sum, entry) => sum + entry.price, 0);
}

export function cartCustomExtrasKey(list) {
  return JSON.stringify(normalizeCustomExtras(list));
}

/** Line total including nested custom extras (price × qty). */
export function getItemLineTotal(item) {
  const qty = Math.max(0, Number(item?.qty) || 0);
  const unit = (Number(item?.price) || 0) + customExtrasUnitTotal(item?.customExtras);
  return unit * qty;
}
