import {
  DEFAULT_RESTAURANT_TIMEZONE,
  restaurantCalendarDate,
  todayRestaurantISO,
  zonedDateTime,
} from "@/lib/restaurantTime";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function r2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function isValidBusinessDate(dateStr) {
  if (!dateStr || !DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Restaurant-local day bounds for YYYY-MM-DD. */
export function businessDateBounds(
  dateStr,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = zonedDateTime(
    { year: y, month: m, day: d },
    0,
    0,
    timeZone
  );
  const next = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  const end = zonedDateTime(
    {
      year: next.getUTCFullYear(),
      month: next.getUTCMonth() + 1,
      day: next.getUTCDate(),
    },
    0,
    0,
    timeZone
  );
  return { start, end };
}

/** Stable calendar Date used on EmployeeLog / EmployeeShift.date. */
export function businessCalendarDate(
  dateStr,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return restaurantCalendarDate(probe, timeZone);
}

/** Prior calendar day as YYYY-MM-DD (for report title). */
export function priorBusinessDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function todayBusinessDate(timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  const cal = restaurantCalendarDate(new Date(), timeZone);
  return cal.toISOString().slice(0, 10);
}

export { todayRestaurantISO };

export function formatEmployeeName(emp) {
  if (!emp) return "Unknown";
  if (emp.name) return emp.name;
  const last = emp.lastName || "";
  const first = emp.firstName || "";
  if (last && first) return `${last}, ${first}`;
  return [first, last].filter(Boolean).join(" ") || "Unknown";
}

export function isCashPaymentMethod(method) {
  const s = String(method || "").trim();
  if (!s) return false;
  if (/gift\s*card/i.test(s)) return false;
  if (/^cash$/i.test(s)) return true;
  if (/cash/i.test(s) && !/card/i.test(s)) return true;
  return false;
}

export function normalizePaymentTypeLabel(method, giftcardUsedAmount = 0) {
  const s = String(method || "").trim();
  if (!s && giftcardUsedAmount > 0) return "Gift Card";
  if (/gift\s*card/i.test(s) && !/card\s*-/i.test(s)) return "Gift Card";
  if (/^cash$/i.test(s) || (/cash/i.test(s) && !/card/i.test(s))) return "Cash";

  const visa = /visa/i.test(s);
  const master = /master/i.test(s);
  const debit = /debit/i.test(s);
  const amex = /amex|american\s*express/i.test(s);

  if (visa) return "Credit Visa";
  if (master) return "Master Card";
  if (debit) return "Debit";
  if (amex) return "American Express";
  if (/card/i.test(s)) return s.replace(/^Card\s*-\s*/i, "Card - ") || "Card";
  return s || "Other";
}

/**
 * Classify tip tender as Cash | Card | Gift Card | Other.
 * Prefers order.tipMethod, then split tipMethods, then paymentMethod / tenders.
 */
export function tipPaymentBucket(order) {
  const tip = Number(order?.tipAmount) || 0;
  if (tip <= 0) return null;

  const raw = String(order?.tipMethod || "").trim().toLowerCase();
  if (raw.includes("cash") && !raw.includes("card") && !raw.includes("gift")) {
    return "Cash";
  }
  if (raw.includes("gift")) return "Gift Card";
  if (raw.includes("card") && !raw.includes("cash")) return "Card";
  // Mixed tip methods (e.g. "Cash + Card") → non-cash unless purely cash
  if (raw.includes("cash") && (raw.includes("card") || raw.includes("gift"))) {
    return "Other";
  }

  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];
  if (splits.length > 0) {
    let cashTips = 0;
    let nonCashTips = 0;
    for (const split of splits) {
      const splitTip = r2(split?.tipAmount);
      if (splitTip <= 0) continue;
      const sm = String(split?.tipMethod || "").trim().toLowerCase();
      if (sm.includes("cash") && !sm.includes("card") && !sm.includes("gift")) {
        cashTips = r2(cashTips + splitTip);
      } else if (sm) {
        nonCashTips = r2(nonCashTips + splitTip);
      } else if (isCashPaymentMethod(split?.method)) {
        cashTips = r2(cashTips + splitTip);
      } else {
        nonCashTips = r2(nonCashTips + splitTip);
      }
    }
    const attributed = r2(cashTips + nonCashTips);
    if (attributed > 0) {
      if (nonCashTips <= 0) return "Cash";
      if (cashTips <= 0) return "Card";
      return "Other";
    }
  }

  const method = String(order?.paymentMethod || "").toLowerCase();
  if (method.includes("gift")) return "Gift Card";
  if (/\bcash\b/.test(method) && !method.includes("card")) return "Cash";
  if (method.includes("card") && !/^split\b/i.test(method)) return "Card";

  try {
    const tenders = resolveTenders(order);
    if (tenders.cash > 0 && tenders.card <= 0 && tenders.giftCard <= 0) {
      return "Cash";
    }
    if (tenders.card > 0 && tenders.cash <= 0) return "Card";
    if (tenders.giftCard > 0 && tenders.cash <= 0 && tenders.card <= 0) {
      return "Gift Card";
    }
  } catch {
    /* ignore */
  }
  return "Other";
}

/**
 * Cash tip amount for an order (remainder is non-cash).
 * When splits have per-row tipMethod, sum cash tip rows; otherwise all-or-nothing via tipPaymentBucket.
 */
export function resolveCashTipAmount(order) {
  const tip = r2(order?.tipAmount);
  if (tip <= 0) return 0;

  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];
  if (splits.length > 0) {
    let cashFromSplits = 0;
    let attributed = 0;
    for (const split of splits) {
      const splitTip = r2(split?.tipAmount);
      if (splitTip <= 0) continue;
      attributed = r2(attributed + splitTip);
      const sm = String(split?.tipMethod || "").trim().toLowerCase();
      if (sm.includes("cash") && !sm.includes("card") && !sm.includes("gift")) {
        cashFromSplits = r2(cashFromSplits + splitTip);
      } else if (!sm && isCashPaymentMethod(split?.method)) {
        cashFromSplits = r2(cashFromSplits + splitTip);
      }
    }
    if (attributed > 0) {
      // Scale if split tips don't sum to order tipAmount
      if (Math.abs(attributed - tip) > 0.02 && attributed > 0) {
        return r2((cashFromSplits / attributed) * tip);
      }
      return cashFromSplits;
    }
  }

  return tipPaymentBucket(order) === "Cash" ? tip : 0;
}

/**
 * Resolve cash/card/gift for a single paymentSplits row.
 */
export function resolveSplitTenders(split) {
  const amount = r2(split?.amount);
  const tip = r2(split?.tipAmount);
  const method = String(split?.method || "").trim();
  const gift =
    split?.giftAmount != null
      ? r2(split.giftAmount)
      : split?.giftcardUsedAmount != null
        ? r2(split.giftcardUsedAmount)
        : 0;

  let cash = split?.cashAmount != null ? r2(split.cashAmount) : null;
  let card = split?.cardAmount != null ? r2(split.cardAmount) : null;

  if (cash == null && card == null) {
    const hasCash = /cash/i.test(method);
    const hasCard = /card/i.test(method) && !/gift/i.test(method);
    const duePlusTip = r2(amount + tip);
    if (hasCash && hasCard) {
      cash = 0;
      card = r2(Math.max(0, duePlusTip - gift));
    } else if (hasCash && !hasCard) {
      cash = r2(Math.max(0, duePlusTip - gift));
      card = 0;
    } else if (gift > 0 || /gift/i.test(method)) {
      cash = 0;
      card = 0;
    } else {
      card = r2(Math.max(0, duePlusTip - gift));
      cash = 0;
    }
  } else {
    cash = cash ?? 0;
    card = card ?? 0;
  }

  return { cash: r2(cash), card: r2(card), giftCard: r2(gift), tip };
}

/**
 * Payment-by-type rows for one order. Uses paymentSplits when present.
 * Returns [{ paymentType, paymentCount, tips, paymentTotal }].
 */
export function paymentTypeContributions(order) {
  const splits = Array.isArray(order?.paymentSplits) ? order.paymentSplits : [];
  if (splits.length > 0) {
    const byType = new Map();
    for (const split of splits) {
      const tenders = resolveSplitTenders(split);
      const methodLabel =
        split.cardType && /card/i.test(String(split.method || ""))
          ? `Card - ${split.cardType}`
          : split.method || "";
      const giftForLabel =
        tenders.giftCard > 0 && tenders.cash <= 0 && tenders.card <= 0
          ? tenders.giftCard
          : 0;
      const typeLabel = normalizePaymentTypeLabel(methodLabel, giftForLabel);

      // Mixed cash+card on one split → attribute each tender separately
      if (tenders.cash > 0 && tenders.card > 0) {
        const cashLabel = "Cash";
        const cardLabel = normalizePaymentTypeLabel(
          split.cardType ? `Card - ${split.cardType}` : "Card",
          0
        );
        const cashTip =
          String(split.tipMethod || "")
            .toLowerCase()
            .includes("cash") &&
          !String(split.tipMethod || "")
            .toLowerCase()
            .includes("card")
            ? tenders.tip
            : 0;
        const cardTip = r2(tenders.tip - cashTip);

        for (const [label, total, tipAmt] of [
          [cashLabel, tenders.cash, cashTip],
          [cardLabel, tenders.card, cardTip],
        ]) {
          if (!byType.has(label)) {
            byType.set(label, {
              paymentType: label,
              paymentCount: 0,
              tips: 0,
              paymentTotal: 0,
            });
          }
          const row = byType.get(label);
          row.paymentCount += 1;
          row.tips = r2(row.tips + tipAmt);
          row.paymentTotal = r2(row.paymentTotal + total);
        }
        if (tenders.giftCard > 0) {
          const giftLabel = "Gift Card";
          if (!byType.has(giftLabel)) {
            byType.set(giftLabel, {
              paymentType: giftLabel,
              paymentCount: 0,
              tips: 0,
              paymentTotal: 0,
            });
          }
          const row = byType.get(giftLabel);
          row.paymentCount += 1;
          row.paymentTotal = r2(row.paymentTotal + tenders.giftCard);
        }
        continue;
      }

      const paymentTotal = r2(
        tenders.cash + tenders.card + tenders.giftCard
      );
      if (!byType.has(typeLabel)) {
        byType.set(typeLabel, {
          paymentType: typeLabel,
          paymentCount: 0,
          tips: 0,
          paymentTotal: 0,
        });
      }
      const row = byType.get(typeLabel);
      row.paymentCount += 1;
      row.tips = r2(row.tips + tenders.tip);
      row.paymentTotal = r2(
        row.paymentTotal +
          (paymentTotal > 0 ? paymentTotal : r2(amount + tenders.tip))
      );
    }
    return [...byType.values()];
  }

  const tenders = resolveTenders(order);
  const tip = tenders.tip;
  const typeLabel = normalizePaymentTypeLabel(
    order.paymentMethod,
    tenders.giftCard
  );
  const paymentTotalForOrder = r2(
    tenders.cash + tenders.card + tenders.giftCard
  );
  return [
    {
      paymentType: typeLabel,
      paymentCount: 1,
      tips: tip,
      paymentTotal:
        paymentTotalForOrder > 0
          ? paymentTotalForOrder
          : r2((Number(order.totalAmount) || 0) + tip),
    },
  ];
}

/**
 * Resolve cash/card/gift tenders from an Order document.
 * Aggregation mirror: TENDER_STAGES in @/lib/reports/financial/metrics — keep both in sync.
 */
export function resolveTenders(order) {
  const tip = r2(order.tipAmount);
  const total = r2(order.totalAmount);
  const gc = r2(order.giftcardUsedAmount);
  const duePlusTip = r2(total + tip);

  let cash = order.cashAmount != null ? r2(order.cashAmount) : null;
  let card = order.cardAmount != null ? r2(order.cardAmount) : null;

  if (cash == null && card == null) {
    const method = order.paymentMethod || "";
    if (isCashPaymentMethod(method)) {
      cash = r2(Math.max(0, duePlusTip - gc));
      card = 0;
    } else if (/gift\s*card/i.test(method) && gc > 0 && !/card\s*-/i.test(method)) {
      cash = 0;
      card = 0;
    } else {
      card = r2(Math.max(0, duePlusTip - gc));
      cash = 0;
    }
  } else {
    cash = cash ?? 0;
    card = card ?? 0;
  }

  return { cash: r2(cash), card: r2(card), giftCard: r2(gc), tip };
}
