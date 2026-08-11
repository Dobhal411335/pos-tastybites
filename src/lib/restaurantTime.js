/**
 * Restaurant wall-clock helpers.
 * Template times like "17:00" must mean local restaurant time, not the server's
 * timezone (Vercel is UTC — otherwise 5 PM becomes 10:30 PM IST).
 */
export const DEFAULT_RESTAURANT_TIMEZONE =
  process.env.RESTAURANT_TIMEZONE || "Asia/Kolkata";

function tzParts(date, timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "long",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  // hour12:false can yield "24" for midnight in some engines
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

/** Parse "17:00" or "17:00:00" → { hours, minutes }. */
export function parseTemplateTime(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const m24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) {
    return { hours: Number(m24[1]), minutes: Number(m24[2]) };
  }
  const m12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hours = Number(m12[1]) % 12;
    if (/pm/i.test(m12[3])) hours += 12;
    return { hours, minutes: Number(m12[2]) };
  }
  return null;
}

/**
 * Build a UTC Date for a calendar day + HH:mm in the restaurant timezone.
 * `day` may be any Date; only its restaurant-local Y/M/D are used unless
 * year/month/day are passed explicitly via override.
 */
export function zonedDateTime(
  day,
  hours,
  minutes = 0,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  const local = tzParts(day, timeZone);
  const y = local.year;
  const m = String(local.month).padStart(2, "0");
  const d = String(local.day).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  // Asia/Kolkata is fixed +05:30 (no DST). For other zones this is approximate;
  // Kolkata is the default for this product.
  if (timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta") {
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:00+05:30`);
  }
  // Fallback: use temporal offset sampling
  const guess = new Date(`${y}-${m}-${d}T${hh}:${mm}:00Z`);
  const asLocal = tzParts(guess, timeZone);
  const desiredAsMinutes = hours * 60 + minutes;
  const actualAsMinutes = asLocal.hour * 60 + asLocal.minute;
  const deltaMinutes = desiredAsMinutes - actualAsMinutes;
  return new Date(guess.getTime() + deltaMinutes * 60 * 1000);
}

export function formatTimeInRestaurantTz(
  date,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function weekdayInRestaurantTz(
  date,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  return tzParts(date, timeZone).weekday;
}

/**
 * Stable calendar-day Date for schedule storage/matching.
 * Uses UTC noon of the restaurant-local Y-M-D so browser local getDate()
 * stays on the intended day across common timezones.
 */
export function restaurantCalendarDate(
  day = new Date(),
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  const local = tzParts(day, timeZone);
  return new Date(Date.UTC(local.year, local.month - 1, local.day, 12, 0, 0));
}

/** Inclusive start / exclusive end of the restaurant-local calendar day. */
export function restaurantDayBounds(
  day = new Date(),
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  const start = zonedDateTime(day, 0, 0, timeZone);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
