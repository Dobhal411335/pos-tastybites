/** Prefer restaurant wall clock; Exeter ON defaults to America/Toronto when unset. */
export function onlineOrderingTimezone() {
  return (
    process.env.RESTAURANT_TIMEZONE ||
    process.env.ONLINE_ORDERING_TIMEZONE ||
    "America/Toronto"
  );
}

/**
 * Same-day pickup slots: every 15 minutes, starting ~30 min from now,
 * until 22:45 restaurant-local (same calendar day only).
 */
export function buildSameDayPickupSlots(now = new Date(), timeZone = onlineOrderingTimezone()) {
  const local = getLocalParts(now, timeZone);
  const slots = [];
  const startMinutes = local.hour * 60 + local.minute + 30;
  const aligned = Math.ceil(startMinutes / 15) * 15;
  const endMinutes = 22 * 60 + 45; // 10:45 PM last slot

  for (let m = aligned; m <= endMinutes; m += 15) {
    const hours = Math.floor(m / 60);
    const minutes = m % 60;
    if (hours > 23) break;
    if (hours < 0) continue;

    const label = formatSlotLabel(hours, minutes);
    const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const dateStr = `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
    slots.push({
      value,
      label,
      isoLocal: `${dateStr} ${value}`,
      date: dateStr,
    });
  }

  return slots;
}

export function isValidSameDayPickup(pickupTime, now = new Date(), timeZone = onlineOrderingTimezone()) {
  if (!pickupTime || typeof pickupTime !== "string") return false;
  const match = pickupTime.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return false;

  const slots = buildSameDayPickupSlots(now, timeZone);
  return slots.some((s) => s.value === `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
}

export function formatPickupNotePrefix(pickupTime, now = new Date(), timeZone = onlineOrderingTimezone()) {
  const local = getLocalParts(now, timeZone);
  const dateStr = `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
  const normalized = pickupTime.trim().match(/^(\d{1,2}):(\d{2})$/);
  const hh = String(Number(normalized[1])).padStart(2, "0");
  const mm = String(Number(normalized[2])).padStart(2, "0");
  return `[PICKUP ${dateStr} ${hh}:${mm}]`;
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
