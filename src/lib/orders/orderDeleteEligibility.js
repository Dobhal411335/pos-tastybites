import {
  isCashPaymentMethod,
  resolveTenders,
  resolveSplitTenders,
  r2,
} from "@/lib/eod/eodHelpers";

export const CASH_ONLY_DELETE_ERROR =
  "Orders paid by Card or Gift Card only cannot be deleted. Cash-only orders can be fully deleted; mixed cash+card/gift orders can have cash removed only.";

export const CASH_TENDER_REMOVE_ERROR =
  "This order has no removable cash tender (needs cash plus card and/or gift).";

export const DELETE_MODE_FULL = "full";
export const DELETE_MODE_CASH_TENDER = "cash_tender";

/**
 * Aggregate cash/card/gift from named paymentSplits (authoritative for split orders).
 */
export function resolveSplitAggregate(order) {
  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];
  let cash = 0;
  let card = 0;
  let giftCard = 0;
  for (const split of splits) {
    const t = resolveSplitTenders(split);
    cash = r2(cash + t.cash);
    card = r2(card + t.card);
    giftCard = r2(giftCard + t.giftCard);
  }
  return { cash, card, giftCard, splitCount: splits.length };
}

function splitsImplyNonCash(order) {
  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];
  for (const split of splits) {
    const method = String(split?.method || "").trim();
    if (!method) continue;
    if (/gift/i.test(method)) return true;
    if (/card/i.test(method) && !isCashPaymentMethod(method)) return true;
  }
  return false;
}

function resolveOrderTenderTotals(order) {
  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];
  if (splits.length > 0) {
    const agg = resolveSplitAggregate(order);
    const giftUsed = r2(order.giftcardUsedAmount);
    return {
      cash: agg.cash,
      card: agg.card,
      giftCard: r2(Math.max(agg.giftCard, giftUsed)),
    };
  }
  const tenders = resolveTenders(order);
  return {
    cash: tenders.cash,
    card: tenders.card,
    giftCard: tenders.giftCard,
  };
}

/**
 * Pure cash (or unpaid with no card/gift trail) orders may be soft-deleted.
 * Multi-payer / seat cash splits are allowed. Card, Gift Card, and any split
 * involving those are blocked.
 */
export function isCashOnlyDeletable(order) {
  if (!order) return false;
  if (order.isActive === false) return false;
  if (order.permanentlyDeletedAt) return false;
  if (order.cashTenderRemovedAt) return false;
  if (String(order.paymentStatus || "").toUpperCase() === "REFUNDED") {
    return false;
  }

  const giftUsed = r2(order.giftcardUsedAmount);
  if (giftUsed > 0) return false;

  const splits = Array.isArray(order.paymentSplits) ? order.paymentSplits : [];

  // Named splits: use per-split tenders (not the order-level paymentMethod string,
  // which often looks like "Split (2) · Cash" / "Split (2) · Cash + Card").
  if (splits.length > 0) {
    const agg = resolveSplitAggregate(order);
    if (agg.giftCard > 0 || agg.card > 0) return false;
    if (splitsImplyNonCash(order)) return false;

    // Cash collected on splits, or cash-only settlement with no card/gift trail.
    if (agg.cash > 0) return true;

    // Unpaid / partial with cash-only split rows that have not recorded amounts yet.
    const unpaidLike =
      order.paymentStatus === "UNPAID" ||
      order.paymentStatus === "PARTIAL" ||
      !["PAID", "COMPLETED"].includes(String(order.status || "").toUpperCase());
    if (unpaidLike) return true;

    // Paid but zero tender amounts: allow only when every split method is cash.
    return splits.every((s) => isCashPaymentMethod(s.method));
  }

  const method = String(order.paymentMethod || "").trim();
  const explicitCard =
    order.cardAmount != null ? r2(order.cardAmount) : null;
  const explicitCash =
    order.cashAmount != null ? r2(order.cashAmount) : null;

  if (explicitCard != null && explicitCard > 0) return false;

  if (/gift\s*card/i.test(method)) return false;
  // Any "card" token that isn't pure cash (includes "Card - Visa", "Cash + Card", etc.)
  if (/card/i.test(method) && !isCashPaymentMethod(method)) return false;
  if (/\+/i.test(method) && !isCashPaymentMethod(method)) return false;

  const paid =
    order.paymentStatus === "PAID" ||
    order.status === "PAID" ||
    order.status === "COMPLETED";

  if (!paid) {
    if (method && !isCashPaymentMethod(method) && /card|gift/i.test(method)) {
      return false;
    }
    return true;
  }

  const tenders = resolveTenders(order);
  if (tenders.giftCard > 0) return false;
  if (tenders.card > 0) return false;

  // Paid cash-only: must have cash tender (or cash method with zero card/gift).
  if (tenders.cash > 0) return true;
  if (isCashPaymentMethod(method) && (explicitCash == null || explicitCash >= 0)) {
    return true;
  }

  return false;
}

/**
 * Active order with cash plus at least one non-cash tender (card and/or gift).
 * Cash can be soft-stripped while card/gift remain.
 */
export function hasRemovableCashTender(order) {
  if (!order) return false;
  if (order.isActive === false) return false;
  if (order.permanentlyDeletedAt) return false;
  if (order.cashTenderRemovedAt) return false;
  if (String(order.paymentStatus || "").toUpperCase() === "REFUNDED") {
    return false;
  }

  const totals = resolveOrderTenderTotals(order);
  if (totals.cash <= 0) return false;
  if (totals.card <= 0 && totals.giftCard <= 0) return false;
  return true;
}

export function hasRemovedCashTender(order) {
  if (!order) return false;
  if (order.isActive === false) return false;
  // Snapshot may be missing on older failed writes; timestamp is the source of truth.
  return Boolean(order.cashTenderRemovedAt);
}

export function canDeleteOrder(order) {
  return isCashOnlyDeletable(order) || hasRemovableCashTender(order);
}

/** @returns {"full"|"cash_tender"|null} */
export function getDeleteMode(order) {
  if (isCashOnlyDeletable(order)) return DELETE_MODE_FULL;
  if (hasRemovableCashTender(order)) return DELETE_MODE_CASH_TENDER;
  return null;
}

export function assertCashOnlyDeletable(order) {
  if (!isCashOnlyDeletable(order)) {
    const err = new Error(CASH_ONLY_DELETE_ERROR);
    err.status = 400;
    err.code = "CASH_ONLY_DELETE_REQUIRED";
    throw err;
  }
}

export function assertRemovableCashTender(order) {
  if (!hasRemovableCashTender(order)) {
    const err = new Error(CASH_TENDER_REMOVE_ERROR);
    err.status = 400;
    err.code = "CASH_TENDER_REMOVE_REQUIRED";
    throw err;
  }
}

/** Display label for payment column: Cash | Card | Gift Card | Split */
export function paymentDisplayLabel(order) {
  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];

  if (splits.length > 0) {
    const agg = resolveSplitAggregate(order);
    const parts = [];
    if (agg.cash > 0) parts.push("Cash");
    if (agg.card > 0) parts.push("Card");
    if (agg.giftCard > 0) parts.push("Gift Card");
    // Multi-payer / seat splits always surface as Split (incl. all-cash).
    if (splits.length > 1 || parts.length > 1) return "Split";
    if (parts.length === 1) return parts[0];
    if (splits.every((s) => isCashPaymentMethod(s.method))) return "Cash";
    return "Split";
  }

  const tenders = resolveTenders(order);
  const parts = [];
  if (tenders.cash > 0) parts.push("Cash");
  if (tenders.card > 0) parts.push("Card");
  if (tenders.giftCard > 0) parts.push("Gift Card");
  if (parts.length > 1) return "Split";
  if (parts.length === 1) return parts[0];
  if (isCashPaymentMethod(order.paymentMethod)) return "Cash";
  const method = String(order.paymentMethod || "").trim();
  if (/gift\s*card/i.test(method)) return "Gift Card";
  if (/card/i.test(method)) return "Card";
  return method || "—";
}

/**
 * Rebuild paymentMethod after cash tender removal from remaining splits / tenders.
 */
export function rebuildPaymentMethodAfterCashRemoval(order) {
  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];
  if (splits.length > 0) {
    const methodParts = splits.map((s) =>
      s.method === "Card" && s.cardType
        ? `Card - ${s.cardType}`
        : s.method || "Card"
    );
    const uniqueParts = [...new Set(methodParts.filter(Boolean))];
    if (splits.length === 1) {
      return uniqueParts[0] || "Card";
    }
    return uniqueParts.length <= 3
      ? `Split (${splits.length}) · ${uniqueParts.join(" + ")}`
      : `Split (${splits.length})`;
  }

  const gift = r2(order?.giftcardUsedAmount);
  const card = order?.cardAmount != null ? r2(order.cardAmount) : 0;
  const parts = [];
  if (card > 0) {
    const prev = String(order?.paymentMethod || "");
    const cardMatch = prev.match(/Card\s*-\s*[^+\s]+/i);
    parts.push(cardMatch ? cardMatch[0] : "Card");
  }
  if (gift > 0) parts.push("Gift Card");
  if (parts.length === 0) return "Card";
  if (parts.length === 1) return parts[0];
  return parts.join(" + ");
}

/**
 * Strip "Cash" tokens from a payment / split method label after cash tender removal.
 */
export function scrubCashFromMethodLabel(method, { cardType = null, hasCard = false, hasGift = false } = {}) {
  let next = String(method || "")
    .replace(/\s*\+\s*Cash/gi, "")
    .replace(/Cash\s*\+\s*/gi, "")
    .replace(/\bCash\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[·+]\s*|\s*[·+]\s*$/g, "")
    .trim();
  if (next) return next;
  if (hasCard) {
    return cardType ? `Card - ${cardType}` : "Card";
  }
  if (hasGift) return "Gift Card";
  return "Card";
}

/**
 * Return updated receipt metadata with cash tender removed, or null if unchanged.
 * Used by lifecycle scrub and print-job detail self-heal.
 */
export function stripCashFromReceiptMetadata(metadata) {
  const meta = metadata && typeof metadata === "object" ? { ...metadata } : {};
  const cash = r2(meta.cashAmount);
  const card = r2(meta.cardAmount);
  const gift = r2(meta.giftAmount ?? meta.giftcardUsedAmount);
  const methodStr = String(meta.splitMethod || meta.paymentMethod || "");
  const mentionsCash = /\bcash\b/i.test(methodStr);

  if (cash <= 0 && !mentionsCash) return null;
  if (card <= 0 && gift <= 0 && cash > 0) {
    // Cash-only slip — caller should soft-hide, not scrub.
    return { hide: true, metadata: meta };
  }
  if (cash <= 0 && !mentionsCash) return null;
  if (card <= 0 && gift <= 0 && !cash) {
    // Method says cash but no card/gift amounts — treat as cash-only hide.
    if (mentionsCash && isCashPaymentMethod(methodStr)) {
      return { hide: true, metadata: meta };
    }
    if (mentionsCash) {
      // Ambiguous "Card + Cash" with no amounts — scrub label only.
      const cleaned = scrubCashFromMethodLabel(methodStr, {
        cardType: meta.splitCardType || null,
        hasCard: /card/i.test(methodStr),
        hasGift: /gift/i.test(methodStr),
      });
      return {
        hide: false,
        metadata: {
          ...meta,
          cashAmount: 0,
          paymentMethod: cleaned,
          splitMethod: cleaned,
        },
      };
    }
    return null;
  }

  const cleaned = scrubCashFromMethodLabel(methodStr, {
    cardType: meta.splitCardType || null,
    hasCard: card > 0 || /card/i.test(methodStr),
    hasGift: gift > 0,
  });
  const tipMethod = String(meta.tipMethod || "").trim();
  const tipIsCashOnly =
    /cash/i.test(tipMethod) &&
    !/card/i.test(tipMethod) &&
    !/gift/i.test(tipMethod);

  return {
    hide: false,
    metadata: {
      ...meta,
      cashAmount: 0,
      paymentMethod: cleaned,
      splitMethod: cleaned,
      ...(tipIsCashOnly
        ? { tipAmount: 0, tipMethod: null }
        : tipMethod
          ? {
              tipMethod: scrubCashFromMethodLabel(tipMethod, { hasCard: true }),
            }
          : {}),
    },
  };
}

/**
 * Whether a print-job metadata blob is a cash-only receipt slip (safe to hide on cash strip).
 * Tender amounts are authoritative — ignore misleading "Card + Cash" method strings when
 * cardAmount/gift are zero.
 */
export function isCashOnlyReceiptPrintMeta(metadata) {
  const meta = metadata || {};
  const cash = r2(meta.cashAmount);
  const card = r2(meta.cardAmount);
  const gift = r2(meta.giftAmount ?? meta.giftcardUsedAmount);
  if (cash > 0 && card <= 0 && gift <= 0) return true;

  // Legacy jobs without explicit tender amounts: pure cash method only.
  if (cash <= 0 && card <= 0 && gift <= 0) {
    const method = String(
      meta.splitMethod || meta.paymentMethod || ""
    ).trim();
    if (method && isCashPaymentMethod(method)) return true;
  }
  return false;
}
