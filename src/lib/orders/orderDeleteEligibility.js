import {
  isCashPaymentMethod,
  resolveTenders,
  resolveSplitTenders,
  r2,
} from "@/lib/eod/eodHelpers";

export const CASH_ONLY_DELETE_ERROR =
  "Orders paid by Card, Gift Card, or split tenders that include Card/Gift Card cannot be deleted. Only cash-only orders (including multi-payer / seat cash splits) can be deleted.";

/**
 * Aggregate cash/card/gift from named paymentSplits (authoritative for split orders).
 */
function resolveSplitAggregate(order) {
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

/**
 * Pure cash (or unpaid with no card/gift trail) orders may be soft-deleted.
 * Multi-payer / seat cash splits are allowed. Card, Gift Card, and any split
 * involving those are blocked.
 */
export function isCashOnlyDeletable(order) {
  if (!order) return false;
  if (order.isActive === false) return false;
  if (order.permanentlyDeletedAt) return false;
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

export function assertCashOnlyDeletable(order) {
  if (!isCashOnlyDeletable(order)) {
    const err = new Error(CASH_ONLY_DELETE_ERROR);
    err.status = 400;
    err.code = "CASH_ONLY_DELETE_REQUIRED";
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
