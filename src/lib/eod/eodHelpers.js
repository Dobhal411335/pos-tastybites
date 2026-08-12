import {
  DEFAULT_RESTAURANT_TIMEZONE,
  restaurantCalendarDate,
  restaurantDayBounds,
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
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return restaurantDayBounds(probe, timeZone);
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
 * Resolve cash / card / gift tender amounts for a paid order.
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
