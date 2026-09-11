import {
  isCashPaymentMethod,
  resolveTenders,
  r2,
} from "@/lib/eod/eodHelpers";

export const CASH_ONLY_DELETE_ERROR =
  "Orders paid by Card, Gift Card, or split tenders that include Card/Gift Card cannot be deleted. Only cash-only orders can be deleted.";

/**
 * Pure cash (or unpaid with no card/gift trail) orders may be soft-deleted.
 * Card, Gift Card, and any split involving those are blocked.
 */
export function isCashOnlyDeletable(order) {
  if (!order) return false;
  if (order.isActive === false) return false;

  const method = String(order.paymentMethod || "").trim();
  const giftUsed = r2(order.giftcardUsedAmount);
  const explicitCard =
    order.cardAmount != null ? r2(order.cardAmount) : null;
  const explicitCash =
    order.cashAmount != null ? r2(order.cashAmount) : null;

  if (giftUsed > 0) return false;
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
    // Unpaid / open ticket: allow only when no card/gift amounts are recorded.
    if (giftUsed > 0) return false;
    if (explicitCard != null && explicitCard > 0) return false;
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
