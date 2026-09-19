import { sendEmail } from "@/lib/brevo/sendEmail";
import { onlineOrderStatusTemplate } from "@/lib/brevo/templates/onlineOrderStatusTemplate";
import { parsePickupFromSpecialNote } from "@/lib/public/pickup";
import { logger } from "@/utils/logger";

const SUBJECTS = {
  placed: (n, brand) => `Order #${n} received — ${brand}`,
  approved: (n, brand) => `Order #${n} accepted — ${brand} is preparing`,
  ready: (n, brand) => `Order #${n} is ready for pickup — ${brand}`,
};

function publicBaseUrl() {
  return String(process.env.NEXT_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
}

function formatPickupLabel(order) {
  const pickup = parsePickupFromSpecialNote(order?.specialNote);
  if (!pickup) return "Same-day pickup";
  const [hh, mm] = String(pickup.time || "00:00").split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${pickup.date} · ${h12}:${String(mm).padStart(2, "0")} ${period}`;
}

/**
 * Send a status email for an online pickup order.
 * Never throws to callers — logs and returns { sent: false } on failure.
 *
 * @param {"placed"|"approved"|"ready"} type
 */
export async function sendOnlineOrderStatusEmail({
  type,
  order,
  restaurantName,
  address,
}) {
  try {
    if (!process.env.BREVO_API_KEY) {
      if (process.env.NODE_ENV !== "production") {
        logger?.warn?.(
          `[dev] Skipping online order ${type} email (no BREVO_API_KEY) for #${order?.orderNumber}`
        );
      }
      return { sent: false, reason: "no_brevo" };
    }

    const to = String(order?.guestEmail || "").trim().toLowerCase();
    if (!to || !to.includes("@")) {
      return { sent: false, reason: "no_email" };
    }

    const brand =
      restaurantName ||
      process.env.BREVO_SENDER_NAME ||
      "Tasty Bites";
    const ticket = String(order?.orderNumber || "").trim();
    const base = publicBaseUrl();
    const trackUrl = base ? `${base}/order/${encodeURIComponent(ticket)}` : null;

    const htmlContent = onlineOrderStatusTemplate({
      type,
      guestName: order.partyName || order.guestName,
      restaurantName: brand,
      orderNumber: ticket,
      pickupLabel: formatPickupLabel(order),
      totalAmount: order.totalAmount,
      trackUrl,
      address: address || null,
    });

    const subjectFn = SUBJECTS[type] || SUBJECTS.placed;
    await sendEmail({
      to,
      subject: subjectFn(ticket, brand),
      htmlContent,
    });

    return { sent: true };
  } catch (err) {
    logger?.error?.(`Failed to send online order ${type} email`, err);
    console.error(`Failed to send online order ${type} email`, err);
    return { sent: false, reason: "send_failed", error: err };
  }
}
