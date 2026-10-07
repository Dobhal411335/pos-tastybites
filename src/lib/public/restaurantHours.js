import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";

export const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const WEEKDAY_LABELS = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "22:00";

export function emptyDayHours(overrides = {}) {
  return {
    open: DEFAULT_OPEN,
    close: DEFAULT_CLOSE,
    closed: false,
    ...overrides,
  };
}

export function defaultRestaurantHours() {
  return {
    mode: "same", // same | custom
    is24Hours: false,
    sameHours: emptyDayHours(),
    weekly: Object.fromEntries(
      WEEKDAY_KEYS.map((day) => [day, emptyDayHours()]),
    ),
  };
}

function normalizeTime(value, fallback = DEFAULT_OPEN) {
  const raw = String(value || "").trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return fallback;
  if (h < 0 || h > 23 || min < 0 || min > 59) return fallback;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function normalizeDayHours(value) {
  const closed = Boolean(value?.closed);
  return {
    open: normalizeTime(value?.open, DEFAULT_OPEN),
    close: normalizeTime(value?.close, DEFAULT_CLOSE),
    closed,
  };
}

/** Normalize hours payload from admin / DB. */
export function normalizeRestaurantHours(raw) {
  const defaults = defaultRestaurantHours();
  if (!raw || typeof raw !== "object") return defaults;

  const mode = String(raw.mode || "same").toLowerCase() === "custom"
    ? "custom"
    : "same";
  const is24Hours = Boolean(raw.is24Hours);
  const sameHours = normalizeDayHours(raw.sameHours || defaults.sameHours);
  const weekly = {};
  for (const day of WEEKDAY_KEYS) {
    weekly[day] = normalizeDayHours(
      raw.weekly?.[day] || defaults.weekly[day],
    );
  }

  return { mode, is24Hours, sameHours, weekly };
}

function getLocalWeekdayKey(date = new Date(), timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(date);
  const key = String(weekday || "").toLowerCase();
  return WEEKDAY_KEYS.includes(key) ? key : "monday";
}

export function formatTime12h(value) {
  const t = normalizeTime(value, "");
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Resolve today's restaurant hours for display / pickup.
 * @returns {{
 *   dayKey: string,
 *   dayLabel: string,
 *   is24Hours: boolean,
 *   closed: boolean,
 *   open: string|null,
 *   close: string|null,
 *   label: string,
 *   openLabel: string,
 *   closeLabel: string,
 * }}
 */
export function getTodayRestaurantHours(
  hoursConfig,
  date = new Date(),
  timeZone = DEFAULT_RESTAURANT_TIMEZONE,
) {
  const hours = normalizeRestaurantHours(hoursConfig);
  const dayKey = getLocalWeekdayKey(date, timeZone);
  const dayLabel = WEEKDAY_LABELS[dayKey] || dayKey;

  if (hours.is24Hours) {
    return {
      dayKey,
      dayLabel,
      is24Hours: true,
      closed: false,
      open: "00:00",
      close: "23:59",
      label: "Open 24 hours",
      openLabel: "12:00 AM",
      closeLabel: "11:59 PM",
    };
  }

  const day =
    hours.mode === "custom"
      ? hours.weekly[dayKey] || emptyDayHours({ closed: true })
      : hours.sameHours;

  if (day.closed) {
    return {
      dayKey,
      dayLabel,
      is24Hours: false,
      closed: true,
      open: null,
      close: null,
      label: "Closed today",
      openLabel: "",
      closeLabel: "",
    };
  }

  const openLabel = formatTime12h(day.open);
  const closeLabel = formatTime12h(day.close);
  return {
    dayKey,
    dayLabel,
    is24Hours: false,
    closed: false,
    open: day.open,
    close: day.close,
    label: `${openLabel} – ${closeLabel}`,
    openLabel,
    closeLabel,
  };
}

/** Minutes from midnight for HH:mm. */
export function timeToMinutes(value) {
  const t = normalizeTime(value, "");
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
