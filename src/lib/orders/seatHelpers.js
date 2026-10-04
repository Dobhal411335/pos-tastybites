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
