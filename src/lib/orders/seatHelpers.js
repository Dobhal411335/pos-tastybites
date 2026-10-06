/**
 * Per-seat ordering helpers.
 * seatNumber: 1..guestCount for a guest seat; null/undefined = shared Table bucket.
 */

export function normalizeSeatNumber(value) {
  if (value === undefined || value === null || value === "" || value === "table") {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

export function seatNumbersEqual(a, b) {
  return normalizeSeatNumber(a) === normalizeSeatNumber(b);
}

export function formatSeatLabel(seatNumber) {
  const n = normalizeSeatNumber(seatNumber);
  return n == null ? "Table" : `Seat ${n}`;
}

/** Print/UI field used by existing ticket helpers that read item.seat */
export function seatPrintLabel(seatNumber, { includeTable = false } = {}) {
  const n = normalizeSeatNumber(seatNumber);
  if (n != null) return n;
  return includeTable ? "Table" : null;
}

/**
 * Returns seats with items above maxGuestCount (for decrease guard).
 * @returns {number[]}
 */
export function seatsAboveGuestCount(items = [], maxGuestCount) {
  const max = Math.floor(Number(maxGuestCount));
  if (!Number.isFinite(max) || max < 1) return [];
  const bad = new Set();
  for (const item of items) {
    const seat = normalizeSeatNumber(item?.seatNumber ?? item?.seat);
    if (seat != null && seat > max) bad.add(seat);
  }
  return [...bad].sort((a, b) => a - b);
}

/**
 * Validate dine-in cart seats against session guestCount.
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateSeatNumbersForGuestCount(items = [], guestCount) {
  const max = Math.floor(Number(guestCount));
  if (!Number.isFinite(max) || max < 1) {
    for (const item of items) {
      const seat = normalizeSeatNumber(item?.seatNumber ?? item?.seat);
      if (seat != null) {
        return {
          ok: false,
          message: "Seat numbers require a guest count on the session",
        };
      }
    }
    return { ok: true };
  }

  for (const item of items) {
    const seat = normalizeSeatNumber(item?.seatNumber ?? item?.seat);
    if (seat != null && (seat < 1 || seat > max)) {
      return {
        ok: false,
        message: `Seat ${seat} is outside guest count (${max}). Move or remove those items first.`,
      };
    }
  }
  return { ok: true };
}

/**
 * Group items by seat for print/UI. Numbered seats first, Table last.
 * @returns {Array<{ seatNumber: number|null, label: string, items: any[] }>}
 */
export function groupItemsBySeat(items = []) {
  const map = new Map();
  for (const item of items) {
    const seat = normalizeSeatNumber(item?.seatNumber ?? item?.seat);
    const key = seat == null ? "table" : String(seat);
    if (!map.has(key)) {
      map.set(key, {
        seatNumber: seat,
        label: formatSeatLabel(seat),
        items: [],
      });
    }
    map.get(key).items.push(item);
  }

  const numbered = [...map.values()]
    .filter((g) => g.seatNumber != null)
    .sort((a, b) => a.seatNumber - b.seatNumber);
  const table = map.get("table");
  return table ? [...numbered, table] : numbered;
}

/**
 * Build proportional payment rows by seat from order items.
 * Distributes order due (subtotal + tax + service − discount − giftcard) by seat subtotal share.
 */
export function buildSeatSplitRows(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const groups = groupItemsBySeat(items);
  if (!groups.length) return [];

  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const lineSub = (item) => {
    const extras = (item.customExtras || []).reduce(
      (s, e) => s + (Number(e.price) || 0),
      0,
    );
    return ((Number(item.price) || 0) + extras) * (Number(item.qty) || 0);
  };

  const buckets = groups.map((g) => ({
    seatNumber: g.seatNumber,
    name: formatSeatLabel(g.seatNumber),
    subtotal: r2(g.items.reduce((s, it) => s + lineSub(it), 0)),
  }));

  const orderSub = buckets.reduce((s, b) => s + b.subtotal, 0) || 1;
  const taxTotal = Number(order?.taxTotal) || 0;
  const serviceChargeTotal = Number(order?.serviceChargeTotal) || 0;
  const discountTotal = Number(order?.discountTotal) || 0;
  const giftcardUsed = Number(order?.giftcardUsedAmount) || 0;
  const totalAmount = Number(order?.totalAmount);
  const due =
    Number.isFinite(totalAmount) && totalAmount >= 0
      ? r2(totalAmount)
      : r2(orderSub + taxTotal + serviceChargeTotal - discountTotal - giftcardUsed);

  const rows = buckets.map((b) => ({
    seatNumber: b.seatNumber,
    name: b.name,
    amount: r2(due * (b.subtotal / orderSub)),
    method: "Card",
    tipAmount: 0,
  }));

  if (rows.length) {
    const sumExceptLast = rows.slice(0, -1).reduce((s, r) => s + r.amount, 0);
    rows[rows.length - 1].amount = r2(Math.max(0, due - sumExceptLast));
  }

  return rows;
}

export function itemLineSubtotal(item) {
  const extras = (item.customExtras || []).reduce(
    (s, e) => s + (Number(e.price) || 0),
    0,
  );
  return ((Number(item.price) || 0) + extras) * (Number(item.qty) || 0);
}

/** Normalize seatNumbers[] from a split row (supports legacy singular seatNumber). */
export function normalizeSeatNumbersList(split) {
  if (!split || typeof split !== "object") return [];
  const raw = Array.isArray(split.seatNumbers) ? split.seatNumbers : null;
  if (raw && raw.length) {
    const out = [];
    const seen = new Set();
    for (const v of raw) {
      const n = normalizeSeatNumber(v);
      const key = n == null ? "table" : String(n);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
    return out;
  }
  if (split.seatNumber !== undefined && split.seatNumber !== null) {
    return [normalizeSeatNumber(split.seatNumber)];
  }
  return [];
}

/** True when payment splits are seat-scoped (1:1 or merged seats). */
export function isSeatBasedPaymentSplits(splits = [], items = []) {
  if (!Array.isArray(splits) || splits.length < 1) return false;
  const groups = groupItemsBySeat(items);
  if (groups.length < 1) return false;

  const covered = new Set();
  let anySeatMeta = false;
  for (const s of splits) {
    const seats = normalizeSeatNumbersList(s);
    if (seats.length) {
      anySeatMeta = true;
      for (const n of seats) covered.add(n == null ? "table" : String(n));
      continue;
    }
    // Legacy: match by seat label name
    const label = String(s?.name || "").trim();
    const match = groups.find((g) => g.label === label);
    if (match) {
      anySeatMeta = true;
      covered.add(match.seatNumber == null ? "table" : String(match.seatNumber));
    }
  }
  if (!anySeatMeta) return false;
  // Every split must map to at least one seat bucket
  return splits.every((s) => {
    const seats = normalizeSeatNumbersList(s);
    if (seats.length) return true;
    const label = String(s?.name || "").trim();
    return groups.some((g) => g.label === label);
  });
}

/** Items belonging to one seat bucket (null = shared Table items). */
export function filterItemsBySeat(items = [], seatNumber) {
  const target = normalizeSeatNumber(seatNumber);
  return (Array.isArray(items) ? items : []).filter(
    (item) => normalizeSeatNumber(item?.seatNumber ?? item?.seat) === target,
  );
}

/** Items belonging to any of the given seat numbers (null = Table). */
export function filterItemsBySeats(items = [], seatNumbers = []) {
  const targets = new Set(
    (Array.isArray(seatNumbers) ? seatNumbers : []).map((n) => {
      const v = normalizeSeatNumber(n);
      return v == null ? "table" : String(v);
    }),
  );
  if (!targets.size) return [];
  return (Array.isArray(items) ? items : []).filter((item) => {
    const seat = normalizeSeatNumber(item?.seatNumber ?? item?.seat);
    const key = seat == null ? "table" : String(seat);
    return targets.has(key);
  });
}

export function formatMergedSeatLabel(seatNumbers = []) {
  const seats = (Array.isArray(seatNumbers) ? seatNumbers : []).map((n) =>
    normalizeSeatNumber(n),
  );
  if (!seats.length) return "Seats";
  const numbered = seats.filter((n) => n != null).sort((a, b) => a - b);
  const hasTable = seats.some((n) => n == null);
  const parts = [];
  if (numbered.length) parts.push(`Seat ${numbered.join("+")}`);
  if (hasTable) parts.push("Table");
  return parts.join(" + ") || "Seats";
}

/**
 * Whether a split receipt should list only one seat's lines (preview + print).
 * Uses job metadata when present; otherwise matches order.paymentSplits by splitIndex.
 */
export function resolveSplitReceiptSeatFilter(jobMetadata, order) {
  const meta =
    jobMetadata && typeof jobMetadata === "object" ? jobMetadata : {};
  if (meta.filterReceiptBySeat) {
    const multi = Array.isArray(meta.splitSeatNumbers)
      ? meta.splitSeatNumbers.map((n) => normalizeSeatNumber(n))
      : null;
    if (multi && multi.length) {
      return {
        filter: true,
        seatNumber: multi.length === 1 ? multi[0] : null,
        seatNumbers: multi,
      };
    }
    return {
      filter: true,
      seatNumber:
        meta.splitSeatNumber !== undefined && meta.splitSeatNumber !== null
          ? normalizeSeatNumber(meta.splitSeatNumber)
          : null,
      seatNumbers: null,
    };
  }
  if (!meta.isSplitReceipt || !order) return { filter: false };
  const splits = order.paymentSplits;
  if (!isSeatBasedPaymentSplits(splits, order.items)) return { filter: false };
  const idx = Math.max(0, (Number(meta.splitIndex) || 1) - 1);
  const split = splits[idx];
  if (!split) return { filter: false };
  const seatNumbers = normalizeSeatNumbersList(split);
  return {
    filter: true,
    seatNumber:
      seatNumbers.length === 1
        ? seatNumbers[0]
        : normalizeSeatNumber(split.seatNumber),
    seatNumbers: seatNumbers.length ? seatNumbers : null,
  };
}

/** Seat key for maps/sets: "table" or "1", "2", … */
export function seatKey(seatNumber) {
  const n = normalizeSeatNumber(seatNumber);
  return n == null ? "table" : String(n);
}

/** Keys of seats already settled via paymentSplits. */
export function getSettledSeatKeys(paymentSplits = []) {
  const keys = new Set();
  for (const split of Array.isArray(paymentSplits) ? paymentSplits : []) {
    const seats = normalizeSeatNumbersList(split);
    if (seats.length) {
      for (const n of seats) keys.add(seatKey(n));
      continue;
    }
    if (split.seatNumber !== undefined && split.seatNumber !== null) {
      keys.add(seatKey(split.seatNumber));
    }
  }
  return keys;
}

export function isSeatSettled(paymentSplits, seatNumber, order = null) {
  // When order items/totals are available, settle = no remaining due.
  // Lets a previously paid seat show Pay again after new items / KOT.
  if (order && Array.isArray(order.items)) {
    const info = getSeatRemainingDue(
      {
        items: order.items,
        totalAmount: order.totalAmount,
        taxTotal: order.taxTotal,
        serviceChargeTotal: order.serviceChargeTotal,
        discountTotal: order.discountTotal,
        giftcardUsedAmount: order.giftcardUsedAmount,
        paymentSplits:
          paymentSplits != null ? paymentSplits : order.paymentSplits,
      },
      seatNumber,
    );
    if (info) return info.due <= 0.009;
  }
  return getSettledSeatKeys(paymentSplits).has(seatKey(seatNumber));
}

/** Sum of amounts already collected on paymentSplits. */
export function getOrderPaidAmount(paymentSplits = []) {
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  return r2(
    (Array.isArray(paymentSplits) ? paymentSplits : []).reduce(
      (s, row) => s + (Number(row?.amount) || 0),
      0,
    ),
  );
}

/**
 * Remaining check balance after prior seat/partial payments.
 * Empty seats (no items) never contribute — only seats with ordered items matter.
 */
export function getOrderRemainingDue(order) {
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const total = r2(Number(order?.totalAmount) || 0);
  const paid = getOrderPaidAmount(order?.paymentSplits);
  return r2(Math.max(0, total - paid));
}

/** Seat numbers that still have items and are not settled yet (null = Table). */
export function getUnsettledSeatNumbers(order) {
  const groups = groupItemsBySeat(order?.items || []);
  const splits = order?.paymentSplits;
  return groups
    .filter((g) => !isSeatSettled(splits, g.seatNumber, order))
    .map((g) => g.seatNumber);
}

/** Keys of seats marked released after payment (order.releasedSeats). */
export function getReleasedSeatKeys(releasedSeats = []) {
  const keys = new Set();
  for (const raw of Array.isArray(releasedSeats) ? releasedSeats : []) {
    if (raw === "table" || raw === 0 || raw === null || raw === "") {
      keys.add("table");
      continue;
    }
    const n = normalizeSeatNumber(raw);
    if (n != null) keys.add(seatKey(n));
  }
  return keys;
}

export function isSeatReleased(releasedSeats, seatNumber) {
  return getReleasedSeatKeys(releasedSeats).has(seatKey(seatNumber));
}

/** Amount already collected toward a seat (sum of matching split.amount). */
export function getSeatPaidAmount(paymentSplits = [], seatNumber) {
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const target = seatKey(seatNumber);
  let paid = 0;
  for (const split of Array.isArray(paymentSplits) ? paymentSplits : []) {
    const seats = normalizeSeatNumbersList(split);
    const keys = seats.length
      ? seats.map((n) => seatKey(n))
      : split.seatNumber !== undefined && split.seatNumber !== null
        ? [seatKey(split.seatNumber)]
        : [];
    if (keys.includes(target)) {
      // Merged multi-seat payment: attribute full amount only if single seat match
      if (keys.length === 1) paid = r2(paid + (Number(split.amount) || 0));
      else if (keys.length > 1 && keys.includes(target)) {
        // Merged group paid together — treat all seats in group as settled via isSeatSettled
        paid = r2(paid + (Number(split.amount) || 0) / keys.length);
      }
    }
  }
  return paid;
}

/**
 * Proportional due for one seat from current order totals, minus already paid.
 * @returns {{ due: number, share: number, paid: number, name: string } | null}
 */
export function getSeatRemainingDue(order, seatNumber) {
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const rows = buildSeatSplitRows(order);
  const target = normalizeSeatNumber(seatNumber);
  const row = rows.find(
    (r) => normalizeSeatNumber(r.seatNumber) === target,
  );
  if (!row) return null;
  const paid = getSeatPaidAmount(order?.paymentSplits, seatNumber);
  const share = r2(row.amount);
  return {
    due: r2(Math.max(0, share - paid)),
    share,
    paid,
    name: row.name || formatSeatLabel(seatNumber),
  };
}

/** Scale order totals by filtered items' share of line subtotal. */
export function proportionalOrderTotalsForItems(order, filteredItems) {
  const allItems = Array.isArray(order?.items) ? order.items : [];
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const orderSub = allItems.reduce((s, it) => s + itemLineSubtotal(it), 0);
  const seatSub = (Array.isArray(filteredItems) ? filteredItems : []).reduce(
    (s, it) => s + itemLineSubtotal(it),
    0,
  );
  const ratio = orderSub > 0 ? seatSub / orderSub : 1;
  const taxBreakdown = (Array.isArray(order?.taxBreakdown)
    ? order.taxBreakdown
    : []
  ).map((t) => ({
    ...t,
    amount: r2(Number(t.amount || 0) * ratio),
  }));
  return {
    subTotal: r2(seatSub),
    discountTotal: r2(Number(order?.discountTotal || 0) * ratio),
    taxTotal: r2(Number(order?.taxTotal || 0) * ratio),
    serviceChargeTotal: r2(Number(order?.serviceChargeTotal || 0) * ratio),
    totalAmount: r2(Number(order?.totalAmount || 0) * ratio),
    taxBreakdown,
  };
}
