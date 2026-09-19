import TableReservation from "@/models/TableReservation";
import { createNotification } from "@/lib/notifications/notificationService";
import { getSocketServer } from "@/lib/socketServer";
import { normalizeGuestPhone } from "@/lib/public/cartPayload";
import { onlineOrderingTimezone } from "@/lib/public/pickup";
import { logger } from "@/utils/logger";

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

function normalizeTime(value) {
  const raw = String(value || "").trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function serializeReservation(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return {
    id: String(plain._id),
    _id: plain._id,
    guestName: plain.guestName,
    phone: plain.phone,
    email: plain.email || null,
    date: plain.date,
    time: plain.time,
    guests: plain.guests,
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
 * Create a same-day online table reservation and notify sales staff.
 */
export async function createTableReservation({
  restaurantId,
  restaurantName,
  guestName,
  phone,
  email,
  date,
  time,
  guests,
  notes,
}) {
  const name = String(guestName || "").trim();
  if (!name) {
    const err = new Error("Name is required");
    err.status = 400;
    throw err;
  }

  const phoneDigits = normalizeGuestPhone(phone);
  if (phoneDigits.length < 10) {
    const err = new Error("A valid phone number is required");
    err.status = 400;
    throw err;
  }

  const today = todayLocalISO();
  const bookingDate = String(date || today).trim() || today;
  if (bookingDate !== today) {
    const err = new Error("Only same-day reservations are accepted");
    err.status = 400;
    throw err;
  }

  const bookingTime = normalizeTime(time);
  if (!bookingTime) {
    const err = new Error("A valid arrival time is required");
    err.status = 400;
    throw err;
  }

  const partySize = Math.min(20, Math.max(1, Number(guests) || 1));
  const guestEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!guestEmail || !guestEmail.includes("@")) {
    const err = new Error("A verified email address is required");
    err.status = 400;
    throw err;
  }

  const reservation = await TableReservation.create({
    restaurantId,
    guestName: name,
    phone: phoneDigits,
    email: guestEmail,
    date: bookingDate,
    time: bookingTime,
    guests: partySize,
    notes: String(notes || "").trim() || null,
    status: "PENDING",
    source: "ONLINE",
  });

  try {
    await createNotification({
      restaurantId,
      type: "NEW_RESERVATION",
      title: "New Table Booking",
      message: `${name} · ${partySize} guest${partySize === 1 ? "" : "s"} · ${bookingTime}`,
      priority: "high",
      metadata: {
        reservationId: String(reservation._id),
        guestName: name,
        guests: partySize,
        time: bookingTime,
        date: bookingDate,
        phone: phoneDigits,
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
