import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";

/**
 * Pickup / online ordering wall clock — same env as EOD / Today.
 *   Production (Canada): America/Toronto
 *   Local testing (India): Asia/Kolkata via .env.local
 */
export function onlineOrderingTimezone() {
  return DEFAULT_RESTAURANT_TIMEZONE;
}

/**
 * Same-day pickup slots: every 15 minutes, starting ~leadMinutes from now,
 * until close (default 22:45) restaurant-local.
 * For 24h restaurants, if nothing is left today, continue into the next day.
 * @param {Date} [now]
 * @param {string} [timeZone]
 * @param {{ leadMinutes?: number, openMinutes?: number, endMinutes?: number, is24Hours?: boolean }} [options]
 */
export function buildSameDayPickupSlots(
  now = new Date(),
  timeZone = onlineOrderingTimezone(),
  options = {}
) {
  const leadMinutes = Number.isFinite(options.leadMinutes)
    ? options.leadMinutes
    : 30;
  const is24Hours = Boolean(options.is24Hours);
  const local = getLocalParts(now, timeZone);
  const slots = [];
  const nowPlusLead = local.hour * 60 + local.minute + leadMinutes;
  const openFloor = Number.isFinite(options.openMinutes)
    ? Math.max(0, Number(options.openMinutes))
    : 0;
  const startMinutes = Math.max(nowPlusLead, openFloor);
  const aligned = Math.ceil(startMinutes / 15) * 15;
  // Default last slot 10:45 PM; can be overridden by restaurant close time.
  const endMinutes = Number.isFinite(options.endMinutes)
    ? Math.min(23 * 60 + 45, Math.max(0, Number(options.endMinutes)))
    : is24Hours
      ? 23 * 60 + 45
      : 22 * 60 + 45;

  const pushRange = (dayParts, fromMin, toMin) => {
    for (let m = fromMin; m <= toMin; m += 15) {
      const hours = Math.floor(m / 60);
      const minutes = m % 60;
      if (hours > 23) break;
      if (hours < 0) continue;
      const label = formatSlotLabel(hours, minutes);
      const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      const dateStr = `${dayParts.year}-${String(dayParts.month).padStart(2, "0")}-${String(dayParts.day).padStart(2, "0")}`;
      slots.push({
        value,
        label: is24Hours && dayParts !== local ? `${label} (next day)` : label,
        isoLocal: `${dateStr} ${value}`,
        date: dateStr,
      });
    }
  };

  if (aligned <= endMinutes) {
    pushRange(local, aligned, endMinutes);
  }

  // 24h open: never show "closed" just because today's grid ran out (late night).
  if (slots.length === 0 && is24Hours) {
    const next = addLocalDays(local, 1);
    const nextStart = Math.max(openFloor, Math.ceil(leadMinutes / 15) * 15);
    pushRange(next, nextStart, endMinutes);
  }

  return slots;
}

function addLocalDays(parts, days) {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  };
}

/**
 * Accept a same-day pickup time that was (or still is) offerable to the guest.
 * Uses a 5-minute lead so OTP / checkout delay does not invalidate a slot that
 * was listed with the normal ~30 minute lead.
 */
export function isValidSameDayPickup(
  pickupTime,
  now = new Date(),
  timeZone = onlineOrderingTimezone(),
  options = {}
) {
  const normalized = normalizePickupTime(pickupTime);
  if (!normalized) return false;

  // Same 15-minute grid / same day cutoff as the guest dropdown, with OTP grace.
  const acceptable = buildSameDayPickupSlots(now, timeZone, {
    leadMinutes: 5,
    openMinutes: options.openMinutes,
    endMinutes: options.endMinutes,
    is24Hours: options.is24Hours,
  });
  return acceptable.some((s) => s.value === normalized);
}

export function formatPickupNotePrefix(
  pickupTime,
  now = new Date(),
  timeZone = onlineOrderingTimezone()
) {
  const local = getLocalParts(now, timeZone);
  const dateStr = `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
  const normalized = normalizePickupTime(pickupTime);
  if (!normalized) {
    throw Object.assign(new Error("Invalid pickup time"), { status: 400 });
  }
  return `[PICKUP ${dateStr} ${normalized}]`;
}

export function parsePickupFromSpecialNote(specialNote) {
  const m = String(specialNote || "").match(
    /\[PICKUP\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\]/
  );
  if (!m) return null;
  return { date: m[1], time: m[2] };
}

export function stripPickupPrefix(specialNote) {
  return String(specialNote || "")
    .replace(/\[PICKUP\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*/i, "")
    .trim();
}

function normalizePickupTime(pickupTime) {
  if (!pickupTime || typeof pickupTime !== "string") return null;
  const match = pickupTime.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  if (minutes % 15 !== 0) return null;
  // Allow full-day grid (incl. 24h restaurants up to 23:45).
  if (hours * 60 + minutes > 23 * 60 + 45) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatSlotLabel(hours, minutes) {
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getLocalParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}
