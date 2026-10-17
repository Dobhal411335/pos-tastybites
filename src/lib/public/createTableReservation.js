import TableReservation from "@/models/TableReservation";
import { createNotification } from "@/lib/notifications/notificationService";
import { getSocketServer } from "@/lib/socketServer";
import { normalizeGuestPhone } from "@/lib/public/cartPayload";
import { onlineOrderingTimezone } from "@/lib/public/pickup";
import { logger } from "@/utils/logger";
import { countryCodes } from "@/utils/countryCodes";
import { REASON_FOR_VISIT_OPTIONS } from "@/lib/public/reservationOptions";

export { REASON_FOR_VISIT_OPTIONS };

const VALID_COUNTRY_CODES = new Set(countryCodes.map((c) => c.code));

function todayLocalISO(timeZone = onlineOrderingTimezone()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA → YYYY-MM-DD
  return fmt.format(new Date());
}

function addDaysISO(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeTime(value) {
  const raw = String(value || "").trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function normalizeCountryCode(value) {
  const code = String(value || "+1").trim();
  return VALID_COUNTRY_CODES.has(code) ? code : "+1";
}

export function serializeReservation(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return {
    id: String(plain._id),
    _id: plain._id,
    guestName: plain.guestName,
    phone: plain.phone,
    countryCode: plain.countryCode || "+1",
    email: plain.email || null,
    date: plain.date,
    time: plain.time,
    guests: plain.guests,
    reasonForVisit: plain.reasonForVisit || null,
    specialRequest: plain.specialRequest || plain.notes || null,
    status: plain.status,
    notes: plain.notes || null,
    staffNote: plain.staffNote || null,
    assignedTableNo: plain.assignedTableNo || null,
    source: plain.source || "ONLINE",
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    handledAt: plain.handledAt || null,
  };
}

/**
 * Create an online table reservation (today or future) and notify sales staff.
 */
export async function createTableReservation({
  restaurantId,
  restaurantName,
  guestName,
  phone,
  countryCode,
  email,
  date,
  time,
  guests,
  reasonForVisit,
  specialRequest,
  notes,
}) {
  const name = String(guestName || "").trim();
  if (!name) {
    const err = new Error("Name is required");
    err.status = 400;
    throw err;
  }

  const phoneDigits = normalizeGuestPhone(phone);
  if (phoneDigits.length < 7) {
    const err = new Error("A valid phone number is required");
    err.status = 400;
    throw err;
  }

  const code = normalizeCountryCode(countryCode);

  const today = todayLocalISO();
  const maxDate = addDaysISO(today, 90);
  const bookingDate = String(date || today).trim() || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    const err = new Error("A valid booking date is required");
    err.status = 400;
    throw err;
  }
  if (bookingDate < today) {
    const err = new Error("Booking date cannot be in the past");
    err.status = 400;
    throw err;
  }
  if (bookingDate > maxDate) {
    const err = new Error("Bookings can only be made up to 90 days ahead");
    err.status = 400;
    throw err;
  }

  const bookingTime = normalizeTime(time);
  if (!bookingTime) {
    const err = new Error("A valid arrival time is required");
    err.status = 400;
    throw err;
  }

  const partySize = Math.min(50, Math.max(1, Number(guests) || 1));
  const guestEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!guestEmail || !guestEmail.includes("@")) {
    const err = new Error("A verified email address is required");
    err.status = 400;
    throw err;
  }

  const reason = String(reasonForVisit || "").trim();
  if (!reason || !REASON_FOR_VISIT_OPTIONS.includes(reason)) {
    const err = new Error("Please select a reason for visit");
    err.status = 400;
    throw err;
  }

  const requestNote =
    String(specialRequest || notes || "").trim() || null;

  const reservation = await TableReservation.create({
    restaurantId,
    guestName: name,
    phone: phoneDigits,
    countryCode: code,
    email: guestEmail,
    date: bookingDate,
    time: bookingTime,
    guests: partySize,
    reasonForVisit: reason,
    specialRequest: requestNote,
    notes: requestNote,
    status: "PENDING",
    source: "ONLINE",
  });

  try {
    await createNotification({
      restaurantId,
      type: "NEW_RESERVATION",
      title: "New Table Booking",
      message: `${name} · ${partySize} guest${partySize === 1 ? "" : "s"} · ${bookingDate} ${bookingTime}`,
      priority: "high",
      metadata: {
        reservationId: String(reservation._id),
        guestName: name,
        guests: partySize,
        time: bookingTime,
        date: bookingDate,
        phone: phoneDigits,
        countryCode: code,
        reasonForVisit: reason,
        source: "ONLINE",
      },
    });
  } catch (notifyErr) {
    logger.error("Failed to notify table reservation", notifyErr);
  }

  try {
    const io = getSocketServer();
    io?.to(`restaurant:${String(restaurantId)}`).emit("reservation:created", {
      reservationId: reservation._id,
      guestName: name,
      guests: partySize,
      time: bookingTime,
      date: bookingDate,
      reasonForVisit: reason,
      restaurantName: restaurantName || null,
    });
  } catch (socketErr) {
    logger.error("Failed to emit reservation socket", socketErr);
  }

  logger.info(
    `Table reservation created: ${reservation._id} restaurant=${restaurantId}`
  );

  return reservation;
}
