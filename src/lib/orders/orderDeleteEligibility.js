import {
  isCashPaymentMethod,
  resolveTenders,
  resolveSplitTenders,
  r2,
} from "@/lib/eod/eodHelpers";
import {
  filterItemsBySeats,
  normalizeSeatNumber,
  normalizeSeatNumbersList,
  proportionalOrderTotalsForItems,
  seatKey,
} from "@/lib/orders/seatHelpers";

export const CASH_ONLY_DELETE_ERROR =
  "Orders paid by Card or Gift Card only cannot be deleted. Cash-only orders can be fully deleted; mixed cash+card/gift orders can have cash removed only.";

export const CASH_TENDER_REMOVE_ERROR =
  "Only pure cash seats on a split payment can be removed (not card or cash+card). The order must still keep a card or gift payment.";

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

/** True when a payment split is cash-only (no card/gift on that seat/payer). */
export function isPureCashSplit(split) {
  if (!split) return false;
  const t = resolveSplitTenders(split);
  return t.cash > 0 && t.card <= 0 && t.giftCard <= 0;
}

/**
 * Active split order with at least one pure-cash seat/payer, plus card and/or gift
 * elsewhere so the order can stay active after cash seat(s) are removed.
 * Card-only and cash+card seats are never removable.
 */
export function hasRemovableCashTender(order) {
  if (!order) return false;
  if (order.isActive === false) return false;
  if (order.permanentlyDeletedAt) return false;
  if (String(order.paymentStatus || "").toUpperCase() === "REFUNDED") {
    return false;
  }

  const splits = Array.isArray(order.paymentSplits) ? order.paymentSplits : [];
  // Seat/split cash delete only — never strip order-level cash+card mixed tenders.
  if (splits.length === 0) return false;
  if (!splits.some(isPureCashSplit)) return false;

  const totals = resolveOrderTenderTotals(order);
  // Something non-cash must remain after pure-cash seat(s) are removed.
  if (totals.card <= 0 && totals.giftCard <= 0) return false;
  return true;
}

/** Per-split rows for admin cash-delete picker. */
export function listRemovableCashSplits(order) {
  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];
  return splits.map((split, index) => {
    const t = resolveSplitTenders(split);
    const seatNumbers = Array.isArray(split?.seatNumbers)
      ? split.seatNumbers
      : split?.seatNumber != null
        ? [split.seatNumber]
        : [];
    const pureCash = isPureCashSplit(split);
    return {
      index,
      name: split?.name || `Payer ${index + 1}`,
      method: split?.method || null,
      cardType: split?.cardType || null,
      amount: r2(split?.amount),
      tipAmount: r2(split?.tipAmount),
      cashAmount: t.cash,
      cardAmount: t.card,
      giftCard: t.giftCard,
      seatNumbers,
      isPureCash: pureCash,
      // Only single cash seats — never card or cash+card.
      canRemoveCash: pureCash,
    };
  });
}

export function hasRemovedCashTender(order) {
  if (!order) return false;
  if (order.isActive === false) return false;
  // Snapshot may be missing on older failed writes; timestamp is the source of truth.
  return Boolean(order.cashTenderRemovedAt);
}

function reportSeatKeysForSplit(split) {
  const fromList = normalizeSeatNumbersList(split);
  if (fromList.length) {
    return fromList.map((n) => seatKey(n));
  }
  const name = String(split?.name || "");
  const match = name.match(/\bseat\s*(\d+)\b/i);
  if (match) return [seatKey(Number(match[1]))];
  return [];
}

/**
 * Plain order view for EOD / financial reports: only remaining active tenders & items.
 * Soft-removed pure-cash seats leave no write-off line and no cashTender* evidence fields.
 */
export function toActiveOrderReportView(order) {
  if (!order || order.isActive === false) return order;
  if (!order.cashTenderRemovedAt) return order;

  const snap = order.removedCashSnapshot;
  const entries = listRemovedCashEntries(order);
  if (!snap || typeof snap !== "object" || !entries.length) {
    const { removedCashSnapshot, cashTenderRemovedAt, cashTenderRemovedBy, cashTenderRemovalReason, ...rest } =
      order;
    return rest;
  }

  const origSplits = Array.isArray(snap.paymentSplits)
    ? snap.paymentSplits.map((s) => ({ ...s }))
    : [];
  const origItems = Array.isArray(snap.items)
    ? snap.items.map((i) => ({ ...i }))
    : [];

  const removedSeatKeys = new Set();
  for (const entry of entries) {
    const seats =
      Array.isArray(entry.seatNumbers) && entry.seatNumbers.length
        ? entry.seatNumbers
        : normalizeSeatNumbersList(entry.split || {});
    for (const n of seats) removedSeatKeys.add(seatKey(n));
    for (const k of reportSeatKeysForSplit(entry.split || { name: entry.name })) {
      removedSeatKeys.add(k);
    }
  }

  const nextSplits = origSplits.filter((split) => {
    const keys = reportSeatKeysForSplit(split);
    if (isPureCashSplit(split) && keys.length > 0) {
      return !keys.every((k) => removedSeatKeys.has(k));
    }
    if (isPureCashSplit(split) && keys.length === 0) {
      // No seat meta: drop if it matches a removed entry split by name/amount.
      return !entries.some((e) => {
        const es = e.split || {};
        return (
          String(es.name || e.name || "") === String(split.name || "") &&
          r2(es.cashAmount ?? e.removedCash) === r2(split.cashAmount)
        );
      });
    }
    return true;
  });

  const nextItems = origItems.filter((it) => {
    const k = seatKey(normalizeSeatNumber(it?.seatNumber ?? it?.seat));
    return !removedSeatKeys.has(k);
  });

  // Prefer snapshot items; if missing, filter the live order items the same way.
  let itemsForTotals = nextItems;
  let baseItems = origItems;
  let baseTotals = {
    subTotal: snap.subTotal,
    discountTotal: snap.discountTotal,
    taxTotal: snap.taxTotal,
    serviceChargeTotal: snap.serviceChargeTotal,
    totalAmount: snap.totalAmount,
    taxBreakdown: snap.taxBreakdown,
  };
  if (itemsForTotals.length === 0 && Array.isArray(order.items)) {
    baseItems = order.items.map((i) => ({ ...i }));
    itemsForTotals = baseItems.filter((it) => {
      const k = seatKey(normalizeSeatNumber(it?.seatNumber ?? it?.seat));
      return !removedSeatKeys.has(k);
    });
    baseTotals = {
      subTotal: order.subTotal ?? snap.subTotal,
      discountTotal: order.discountTotal ?? snap.discountTotal,
      taxTotal: order.taxTotal ?? snap.taxTotal,
      serviceChargeTotal: order.serviceChargeTotal ?? snap.serviceChargeTotal,
      totalAmount: order.totalAmount ?? snap.totalAmount,
      taxBreakdown: order.taxBreakdown ?? snap.taxBreakdown,
    };
  }

  let totals;
  if (itemsForTotals.length > 0 && baseItems.length > 0) {
    totals = proportionalOrderTotalsForItems(
      { items: baseItems, ...baseTotals },
      itemsForTotals
    );
  } else {
    // Last resort: food totals from remaining split amounts (excludes tip).
    let food = 0;
    for (const s of nextSplits) {
      food = r2(food + r2(s.amount));
    }
    totals = {
      subTotal: food,
      discountTotal: 0,
      taxTotal: 0,
      serviceChargeTotal: 0,
      totalAmount: food,
      taxBreakdown: [],
    };
  }

  let cashSum = 0;
  let cardSum = 0;
  let tipSum = 0;
  const tipMethods = [];
  for (const s of nextSplits) {
    const t = resolveSplitTenders(s);
    cashSum = r2(cashSum + t.cash);
    cardSum = r2(cardSum + t.card);
    const tipAmt = r2(s.tipAmount);
    tipSum = r2(tipSum + tipAmt);
    if (tipAmt > 0) {
      tipMethods.push(
        s.tipMethod || (isCashPaymentMethod(s.method) ? "Cash" : "Card")
      );
    }
  }

  const uniqueTipMethods = [...new Set(tipMethods.filter(Boolean))];
  const seatGuests = new Set();
  for (const it of itemsForTotals) {
    const n = normalizeSeatNumber(it?.seatNumber ?? it?.seat);
    if (n != null) seatGuests.add(n);
  }
  for (const s of nextSplits) {
    for (const n of normalizeSeatNumbersList(s)) {
      if (n != null) seatGuests.add(n);
    }
  }

  const view = {
    ...order,
    items: itemsForTotals,
    paymentSplits: nextSplits,
    subTotal: totals.subTotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    serviceChargeTotal: totals.serviceChargeTotal,
    totalAmount: totals.totalAmount,
    taxBreakdown: totals.taxBreakdown,
    cashAmount: cashSum,
    cardAmount: cardSum,
    tipAmount: tipSum,
    tipMethod:
      tipSum <= 0
        ? null
        : uniqueTipMethods.length === 1
          ? uniqueTipMethods[0]
          : uniqueTipMethods.join(" + ") || "Card",
    guestCount: seatGuests.size > 0 ? seatGuests.size : order.guestCount,
    cashTenderRemovedAt: undefined,
    cashTenderRemovedBy: undefined,
    cashTenderRemovalReason: undefined,
    removedCashSnapshot: undefined,
  };
  view.paymentMethod = rebuildPaymentMethodAfterCashRemoval(view);
  return view;
}

/**
 * Per-seat cash removals stored on removedCashSnapshot (stable across live re-index).
 * Falls back to legacy removedSplitIndices + original paymentSplits.
 */
export function listRemovedCashEntries(order) {
  const snap = order?.removedCashSnapshot;
  if (!snap || typeof snap !== "object") return [];

  if (Array.isArray(snap.removedCashEntries) && snap.removedCashEntries.length) {
    return snap.removedCashEntries.map((entry, i) => ({
      ...entry,
      entryId: entry.entryId || `legacy-entry-${i}`,
    }));
  }

  const allSplits = Array.isArray(snap.paymentSplits) ? snap.paymentSplits : [];
  const allItems = Array.isArray(snap.items) ? snap.items : [];
  const indexFilter =
    Array.isArray(snap.removedSplitIndices) && snap.removedSplitIndices.length > 0
      ? new Set(
          snap.removedSplitIndices
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n) && n >= 0)
        )
      : null;

  const out = [];
  for (let i = 0; i < allSplits.length; i++) {
    if (indexFilter && !indexFilter.has(i)) continue;
    const split = allSplits[i];
    if (!isPureCashSplit(split)) continue;
    const tenders = resolveSplitTenders(split);
    const seatNumbers = normalizeSeatNumbersList(split);
    const seatItems = filterItemsBySeats(allItems, seatNumbers);
    const totals =
      seatItems.length > 0
        ? proportionalOrderTotalsForItems(
            {
              items: allItems,
              subTotal: snap.subTotal,
              discountTotal: snap.discountTotal,
              taxTotal: snap.taxTotal,
              serviceChargeTotal: snap.serviceChargeTotal,
              totalAmount: snap.totalAmount,
              taxBreakdown: snap.taxBreakdown,
            },
            seatItems
          )
        : {
            subTotal: tenders.cash,
            taxTotal: 0,
            discountTotal: 0,
            serviceChargeTotal: 0,
            totalAmount: tenders.cash,
            taxBreakdown: [],
          };
    out.push({
      entryId: `legacy-${i}`,
      split,
      seatNumbers,
      items: seatItems,
      removedCash: tenders.cash,
      tipAmount: r2(split.tipAmount),
      removedAt: order.cashTenderRemovedAt || null,
      cashPrintJobIds: [],
      name: split?.name || `Cash seat ${i + 1}`,
      subTotal: totals.subTotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      serviceChargeTotal: totals.serviceChargeTotal,
      totalAmount: totals.totalAmount,
      taxBreakdown: totals.taxBreakdown,
    });
  }
  return out;
}

/**
 * Build OrderDetailBody props for a Deleted cash_tender row.
 * @param {object} order
 * @param {{ entryId?: string|null }} [opts] — when set, show only that removed cash seat.
 */
export function buildDeletedCashOrderDetailView(order, { entryId = null } = {}) {
  const snap = order?.removedCashSnapshot;
  if (!snap || typeof snap !== "object") return order;

  let entries = listRemovedCashEntries(order);
  if (entryId) {
    entries = entries.filter((e) => String(e.entryId) === String(entryId));
  }

  const displayNumber =
    order.originalOrderNumber &&
    !/^(DEL-|RST-)/i.test(String(order.originalOrderNumber))
      ? order.originalOrderNumber
      : order.orderNumber;

  // Legacy snapshots without split data: fall back to order cash.
  if (entries.length === 0) {
    const allItems = Array.isArray(snap.items) ? snap.items : [];
    const cash = r2(snap.cashAmount ?? snap.removedCash ?? 0);
    if (cash <= 0) return order;
    return {
      ...order,
      orderNumber: displayNumber,
      cashAmount: cash,
      cardAmount: 0,
      giftcardUsedAmount: 0,
      paymentMethod: "Cash",
      tipAmount: r2(snap.tipAmount),
      tipMethod: snap.tipMethod || "Cash",
      paymentSplits: [],
      items: allItems,
      subTotal: snap.subTotal ?? order.subTotal,
      taxTotal: snap.taxTotal ?? order.taxTotal,
      discountTotal: snap.discountTotal ?? order.discountTotal,
      serviceChargeTotal: snap.serviceChargeTotal ?? order.serviceChargeTotal,
      totalAmount: snap.totalAmount ?? order.totalAmount,
      taxBreakdown: Array.isArray(snap.taxBreakdown)
        ? snap.taxBreakdown
        : order.taxBreakdown,
      guestCount:
        snap.guestCount !== undefined ? snap.guestCount : order.guestCount,
      _viewingRemovedCashSnapshot: true,
      _cashEntryId: entryId || null,
    };
  }

  const pureCashSeatNumbers = [];
  const pureCashSeatKeys = new Set();
  let cashTotal = 0;
  let cashTipTotal = 0;
  const displaySplits = [];
  const filteredItems = [];
  const seenItemKeys = new Set();

  for (const entry of entries) {
    const split = entry.split || {};
    const tenders = resolveSplitTenders(split);
    const cash = r2(entry.removedCash ?? tenders.cash);
    cashTotal = r2(cashTotal + cash);
    const tipAmt = r2(entry.tipAmount ?? split.tipAmount);
    cashTipTotal = r2(cashTipTotal + tipAmt);

    for (const n of entry.seatNumbers || normalizeSeatNumbersList(split)) {
      const k = seatKey(n);
      if (k != null && !pureCashSeatKeys.has(k)) {
        pureCashSeatKeys.add(k);
        const num = normalizeSeatNumber(n);
        if (num != null) pureCashSeatNumbers.push(num);
      }
    }

    displaySplits.push({
      ...split,
      name: entry.name || split.name || "Cash",
      method: "Cash",
      cardType: null,
      cashAmount: cash,
      cardAmount: 0,
      giftcardUsedAmount: 0,
      amount: tipAmt > 0 ? r2(Math.max(0, cash - tipAmt)) : cash,
      tipAmount: tipAmt,
      tipMethod: tipAmt > 0 ? "Cash" : null,
    });

    for (const item of Array.isArray(entry.items) ? entry.items : []) {
      const key =
        item?._id != null
          ? String(item._id)
          : `${item?.productId || item?.name}-${item?.seatNumber}-${item?.qty}`;
      if (seenItemKeys.has(key)) continue;
      seenItemKeys.add(key);
      filteredItems.push(item);
    }
  }

  let totals;
  if (entries.length === 1 && entries[0].totalAmount != null) {
    const e = entries[0];
    totals = {
      subTotal: r2(e.subTotal),
      taxTotal: r2(e.taxTotal),
      discountTotal: r2(e.discountTotal),
      serviceChargeTotal: r2(e.serviceChargeTotal),
      totalAmount: r2(e.totalAmount),
      taxBreakdown: Array.isArray(e.taxBreakdown) ? e.taxBreakdown : [],
    };
  } else if (filteredItems.length > 0 && Array.isArray(snap.items)) {
    totals = proportionalOrderTotalsForItems(
      {
        items: snap.items,
        subTotal: snap.subTotal,
        discountTotal: snap.discountTotal,
        taxTotal: snap.taxTotal,
        serviceChargeTotal: snap.serviceChargeTotal,
        totalAmount: snap.totalAmount,
        taxBreakdown: snap.taxBreakdown,
      },
      filteredItems
    );
  } else {
    const foodCash = r2(Math.max(0, cashTotal - cashTipTotal));
    totals = {
      subTotal: foodCash,
      discountTotal: 0,
      taxTotal: 0,
      serviceChargeTotal: 0,
      totalAmount: foodCash,
      taxBreakdown: [],
    };
  }

  return {
    ...order,
    orderNumber: displayNumber,
    cashAmount: cashTotal,
    cardAmount: 0,
    giftcardUsedAmount: 0,
    paymentMethod: displaySplits.length > 1 ? "Cash (split)" : "Cash",
    tipAmount: cashTipTotal,
    tipMethod: cashTipTotal > 0 ? "Cash" : null,
    paymentSplits: displaySplits,
    items: filteredItems,
    subTotal: totals.subTotal,
    taxTotal: totals.taxTotal,
    discountTotal: totals.discountTotal,
    serviceChargeTotal: totals.serviceChargeTotal,
    totalAmount: totals.totalAmount,
    taxBreakdown: totals.taxBreakdown,
    guestCount:
      pureCashSeatNumbers.length > 0
        ? pureCashSeatNumbers.length
        : snap.guestCount !== undefined
          ? snap.guestCount
          : order.guestCount,
    releasedSeats: Array.isArray(snap.releasedSeats)
      ? snap.releasedSeats.filter((s) =>
          pureCashSeatKeys.has(seatKey(normalizeSeatNumber(s)))
        )
      : [],
    _viewingRemovedCashSnapshot: true,
    _cashEntryId: entryId || null,
  };
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
