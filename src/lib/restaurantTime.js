/**
 * Restaurant wall-clock helpers.
 * Template times like "17:00" must mean local restaurant time, not the server's
 * timezone (Vercel/Hostinger are UTC).
 *
 * Env (keep these in sync):
 *   RESTAURANT_TIMEZONE              — server (EOD, APIs, reports)
 *   NEXT_PUBLIC_RESTAURANT_TIMEZONE  — client fallbacks (reports UI)
 *   ONLINE_ORDERING_TIMEZONE         — optional alias for pickup slots
 *
 * Values:
 *   Production (Canada / Exeter ON): America/Toronto
 *   Local testing (India):           Asia/Kolkata
 * Default when unset: America/Toronto (production-safe).
 */
export const DEFAULT_RESTAURANT_TIMEZONE =
  process.env.RESTAURANT_TIMEZONE ||
  process.env.NEXT_PUBLIC_RESTAURANT_TIMEZONE ||
  process.env.ONLINE_ORDERING_TIMEZONE ||
  "America/Toronto";

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
 * Pass a Date (uses that instant's restaurant-local Y/M/D) or an explicit
 * `{ year, month, day }` civil date (1-based month).
 *
 * Non-fixed-offset zones (e.g. America/Toronto with DST) must correct both
 * clock time AND calendar-day drift. A single UTC-midnight guess is still
 * the previous evening in Toronto, so hour-only adjustment is off-by-one.
 */
export function zonedDateTime(
  day,
  hours,
  minutes = 0,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  const local =
    day &&
    typeof day === "object" &&
    !(day instanceof Date) &&
    day.year != null
      ? {
          year: Number(day.year),
          month: Number(day.month),
          day: Number(day.day),
        }
      : tzParts(day || new Date(), timeZone);
  const y = local.year;
  const month = local.month;
  const d = local.day;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const mStr = String(month).padStart(2, "0");
  const dStr = String(d).padStart(2, "0");

  if (timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta") {
    return new Date(`${y}-${mStr}-${dStr}T${hh}:${mm}:00+05:30`);
  }

  // Iterate until wall-clock Y-M-D HH:mm in `timeZone` matches the target.
  let date = new Date(Date.UTC(y, month - 1, d, hours, minutes, 0));
  for (let i = 0; i < 4; i++) {
    const parts = tzParts(date, timeZone);
    const gotHour = parts.hour === 24 ? 0 : parts.hour;
    const wantMs = Date.UTC(y, month - 1, d, hours, minutes, 0);
    const gotMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      gotHour,
      parts.minute,
      parts.second
    );
    const delta = wantMs - gotMs;
    if (Math.abs(delta) < 500) break;
    date = new Date(date.getTime() + delta);
  }
  return date;
}

export function formatTimeInRestaurantTz(
  date,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
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

/** YYYY-MM-DD for the restaurant wall clock (safe on client + server). */
export function todayRestaurantISO(timeZone = DEFAULT_RESTAURANT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
  const local = tzParts(day, timeZone);
  const start = zonedDateTime(
    { year: local.year, month: local.month, day: local.day },
    0,
    0,
    timeZone
  );
  // Next local calendar day (DST-safe; do not add a fixed 24h).
  const next = new Date(
    Date.UTC(local.year, local.month - 1, local.day + 1, 12, 0, 0)
  );
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
