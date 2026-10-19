import { sendEmail } from "@/lib/brevo/sendEmail";
import { tableReservationStatusTemplate } from "@/lib/brevo/templates/tableReservationStatusTemplate";
import { logger } from "@/utils/logger";

function formatTimeLabel(time) {
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time || "";
  const h = Number(m[1]);
  const min = m[2];
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${period}`;
}

function formatRestaurantPhone({ phone, phoneCode, phoneDisplay } = {}) {
  if (phoneDisplay) {
    const code = String(phoneCode || "").trim();
    return code ? `${code} ${phoneDisplay}` : phoneDisplay;
  }
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

/**
 * @param {"received"|"accepted"|"declined"} type
 */
export async function sendTableReservationStatusEmail({
  type,
  reservation,
  restaurantName,
  address,
  phone,
  phoneCode,
  phoneDisplay,
}) {
  try {
    if (!process.env.BREVO_API_KEY) {
      if (process.env.NODE_ENV !== "production") {
        logger?.warn?.(
          `[dev] Skipping reservation ${type} email (no BREVO_API_KEY)`
        );
      }
      return { sent: false, reason: "no_brevo" };
    }

    const to = String(reservation?.email || "").trim().toLowerCase();
    if (!to || !to.includes("@")) {
      return { sent: false, reason: "no_email" };
    }

    const brand =
      restaurantName ||
      process.env.BREVO_SENDER_NAME ||
      "Tasty Bites";
    const timeLabel = formatTimeLabel(reservation?.time);
    const restaurantPhone = formatRestaurantPhone({
      phone,
      phoneCode,
      phoneDisplay,
    });

    const htmlContent = tableReservationStatusTemplate({
      type,
      guestName: reservation.guestName,
      restaurantName: brand,
      date: reservation.date,
      timeLabel,
      guests: reservation.guests,
      reasonForVisit: reservation.reasonForVisit || null,
      specialRequest:
        reservation.specialRequest || reservation.notes || null,
      assignedTableNo: reservation.assignedTableNo,
      address: address || null,
      phone: restaurantPhone,
    });

    const datePart = reservation.date ? ` on ${reservation.date}` : "";
    const subject =
      type === "declined"
        ? `Table booking update — ${brand}`
        : type === "received"
          ? `We received your table request — ${brand}`
          : `Table confirmed for ${timeLabel}${datePart} — ${brand}`;

    await sendEmail({
      to,
      subject,
      htmlContent,
    });

    return { sent: true };
  } catch (err) {
    logger?.error?.(`Failed to send reservation ${type} email`, err);
    console.error(`Failed to send reservation ${type} email`, err);
    return { sent: false, reason: "send_failed", error: err };
  }
}
