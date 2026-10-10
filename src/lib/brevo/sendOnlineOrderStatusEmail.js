import { sendEmail } from "@/lib/brevo/sendEmail";
import { onlineOrderStatusTemplate } from "@/lib/brevo/templates/onlineOrderStatusTemplate";
import {
  parsePickupFromSpecialNote,
  stripPickupPrefix,
} from "@/lib/public/pickup";
import Restaurant from "@/models/Restaurant";
import { logger } from "@/utils/logger";

const SUBJECTS = {
  placed: (n, brand) => `Thank you! Order #${n} received — ${brand}`,
  approved: (n, brand) => `Order #${n} accepted — ${brand} is preparing`,
  ready: (n, brand) => `Order #${n} is ready for pickup — ${brand}`,
  paid: (n, brand) => `Receipt for order #${n} — thanks from ${brand}`,
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

function cleanStringList(list = []) {
  return (Array.isArray(list) ? list : [])
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function mapSelectionGroups(groups = []) {
  return (Array.isArray(groups) ? groups : [])
    .map((group) => {
      const name = String(group?.name || "").trim();
      const subChoices = cleanStringList(group?.subChoices);
      if (!name || !subChoices.length) return null;
      return { name, subChoices };
    })
    .filter(Boolean);
}

function mapCustomExtras(extras = []) {
  return (Array.isArray(extras) ? extras : [])
    .map((extra) => {
      const name = String(extra?.name || "").trim();
      if (!name) return null;
      const qty = Number(extra?.qty);
      return {
        name,
        price: Number.isFinite(Number(extra?.price))
          ? Number(extra.price)
          : 0,
        qty: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
      };
    })
    .filter(Boolean);
}

/** Hide default placeholder size — only keep a real size the guest chose. */
function mapItemSize(item) {
  const size = String(item?.size || item?.selectedSize || "").trim();
  if (!size) return null;
  if (size.toLowerCase() === "standard") return null;
  return size;
}

/** Drop option strings that already appear as style / selection labels. */
function mapItemOptions(item) {
  const style = String(item?.preparationStyle || "")
    .trim()
    .toLowerCase();
  const known = new Set();
  if (style) known.add(style);

  for (const group of [
    ...(item?.choiceSelections || []),
    ...(item?.customDataSelections || []),
    ...(item?.addonChoiceSelections || []),
  ]) {
    for (const sub of group?.subChoices || []) {
      const v = String(sub || "")
        .trim()
        .toLowerCase();
      if (v) known.add(v);
    }
  }

  return cleanStringList(item?.options).filter(
    (opt) => !known.has(String(opt).trim().toLowerCase()),
  );
}

/** Full line-item payload for emails (mirrors Order item fields guests care about). */
function mapOrderItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const qty = Number(item?.qty) || 1;
    const price = item?.price != null ? Number(item.price) : null;
    return {
      name: item?.name || "Item",
      qty,
      price,
      tax: item?.tax != null ? Number(item.tax) : 0,
      size: mapItemSize(item),
      preparationStyle: item?.preparationStyle || null,
      isOffer: Boolean(item?.isOffer),
      options: mapItemOptions(item),
      inclusions: cleanStringList(item?.inclusions),
      choices: cleanStringList(item?.choices),
      drinks: cleanStringList(item?.drinks),
      choiceSelections: mapSelectionGroups(item?.choiceSelections),
      customDataSelections: mapSelectionGroups(item?.customDataSelections),
      addonChoiceSelections: mapSelectionGroups(item?.addonChoiceSelections),
      customExtras: mapCustomExtras(item?.customExtras),
      notes: String(item?.notes || "").trim() || null,
      lineTotal:
        item?.lineTotal ??
        (price != null ? price * qty : null),
    };
  });
}

/**
 * Send a status email for an online pickup order.
 * Never throws to callers — logs and returns { sent: false } on failure.
 *
 * @param {"placed"|"approved"|"ready"|"paid"} type
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
    const orderAgainUrl = base ? `${base}/menu` : null;
    const customerNote = stripPickupPrefix(order?.specialNote || "");

    const phone = String(order.contactNumber || "").replace(/\D/g, "");
    const phoneDisplay =
      phone.length === 10
        ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
        : phone || null;

    const htmlContent = onlineOrderStatusTemplate({
      type,
      guestName: order.partyName || order.guestName,
      restaurantName: brand,
      orderNumber: ticket,
      invoiceNumber: order.invoiceNumber || null,
      pickupLabel: formatPickupLabel(order),
      totalAmount: order.totalAmount,
      trackUrl,
      orderAgainUrl,
      address: address || null,
      status:
        order.status ||
        (type === "placed" ? "PENDING" : type === "paid" ? "PAID" : null),
      paymentStatus:
        order.paymentStatus || (type === "paid" ? "PAID" : "UNPAID"),
      items: mapOrderItems(order.items),
      subTotal: order.subTotal,
      taxTotal: order.taxTotal,
      discountTotal: order.discountTotal,
      discountCode: order.discountCode || null,
      serviceChargeTotal: order.serviceChargeTotal,
      serviceChargeName: order.serviceChargeName || null,
      customerNote: customerNote || null,
      guestPhone: phoneDisplay,
      guestEmail: to,
      paymentMethod: order.paymentMethod || null,
      tipAmount: order.tipAmount,
      tipMethod: order.tipMethod || null,
      cashAmount: order.cashAmount,
      cardAmount: order.cardAmount,
      giftcardUsedAmount: order.giftcardUsedAmount,
      giftcardCode: order.giftcardCode || null,
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

/**
 * After POS payment completes: send receipt email for ONLINE orders only.
 * Safe to call from any payment path — no-ops for dine-in / non-paid.
 */
export async function maybeSendOnlineOrderPaidEmail(order) {
  try {
    if (!order) return { sent: false, reason: "no_order" };
    if (String(order.source || "").toUpperCase() !== "ONLINE") {
      return { sent: false, reason: "not_online" };
    }
    if (String(order.paymentStatus || "").toUpperCase() !== "PAID") {
      return { sent: false, reason: "not_paid" };
    }

    const restaurant = await Restaurant.findById(order.restaurantId)
      .select("name address")
      .lean();

    return await sendOnlineOrderStatusEmail({
      type: "paid",
      order,
      restaurantName: restaurant?.name,
      address: restaurant?.address || null,
    });
  } catch (err) {
    logger?.error?.("Failed to send online order paid email", err);
    console.error("Failed to send online order paid email", err);
    return { sent: false, reason: "send_failed", error: err };
  }
}
