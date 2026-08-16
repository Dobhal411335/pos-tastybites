import {
  isValidBusinessDate,
  priorBusinessDate,
  todayBusinessDate,
} from "@/lib/eod/eodHelpers";

export const DATE_PRESETS = [
  "TODAY",
  "YESTERDAY",
  "THIS_WEEK",
  "LAST_WEEK",
  "THIS_MONTH",
  "LAST_MONTH",
  "CUSTOM",
];

export function addDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function weekdayUtc(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function startOfWeekMonday(ymd) {
  const daysFromMonday = (weekdayUtc(ymd) + 6) % 7;
  return addDaysYmd(ymd, -daysFromMonday);
}

export function eachBusinessDate(dateFrom, dateTo) {
  const dates = [];
  let cur = dateFrom;
  while (cur <= dateTo) {
    dates.push(cur);
    cur = addDaysYmd(cur, 1);
    if (dates.length > 400) break;
  }
  return dates;
}

/**
 * Resolve a preset to restaurant-local YYYY-MM-DD bounds.
 * Custom dates are validated; invalid values fall back to today.
 */
export function resolveDatePreset(preset, customFrom, customTo) {
  const today = todayBusinessDate();
  const p = DATE_PRESETS.includes(String(preset || "").toUpperCase())
    ? String(preset).toUpperCase()
    : "TODAY";

  if (p === "YESTERDAY") {
    const y = priorBusinessDate(today);
    return { dateFrom: y, dateTo: y, preset: p };
  }

  if (p === "THIS_WEEK") {
    return { dateFrom: startOfWeekMonday(today), dateTo: today, preset: p };
  }

  if (p === "LAST_WEEK") {
    const thisMon = startOfWeekMonday(today);
    return {
      dateFrom: addDaysYmd(thisMon, -7),
      dateTo: addDaysYmd(thisMon, -1),
      preset: p,
    };
  }

  if (p === "THIS_MONTH") {
    return { dateFrom: `${today.slice(0, 7)}-01`, dateTo: today, preset: p };
  }

  if (p === "LAST_MONTH") {
    const [y, m] = today.split("-").map(Number);
    const lastMonth = m === 1 ? 12 : m - 1;
    const lastYear = m === 1 ? y - 1 : y;
    const from = `${lastYear}-${String(lastMonth).padStart(2, "0")}-01`;
    const thisMonthStart = `${y}-${String(m).padStart(2, "0")}-01`;
    return { dateFrom: from, dateTo: addDaysYmd(thisMonthStart, -1), preset: p };
  }

  if (p === "CUSTOM") {
    const dateFrom = isValidBusinessDate(customFrom) ? customFrom : today;
    const dateToRaw = isValidBusinessDate(customTo) ? customTo : today;
    return {
      dateFrom,
      dateTo: dateToRaw < dateFrom ? dateFrom : dateToRaw,
      preset: p,
    };
  }

  return { dateFrom: today, dateTo: today, preset: "TODAY" };
}
