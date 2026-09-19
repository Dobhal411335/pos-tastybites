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

/**
 * @param {"accepted"|"declined"} type
 */
export async function sendTableReservationStatusEmail({
  type,
  reservation,
  restaurantName,
  address,
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

    const htmlContent = tableReservationStatusTemplate({
      type,
      guestName: reservation.guestName,
      restaurantName: brand,
      date: reservation.date,
      timeLabel,
      guests: reservation.guests,
      assignedTableNo: reservation.assignedTableNo,
      address: address || null,
    });

    const subject =
      type === "declined"
        ? `Table booking update — ${brand}`
        : `Table confirmed for ${timeLabel} — ${brand}`;

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
