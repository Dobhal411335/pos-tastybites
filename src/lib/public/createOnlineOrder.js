import Order from "@/models/Order";
import { repricePosCartItems } from "@/lib/orders/repricePosCartItems";
import { getNextOrderNumber, getNextInvoiceNumber } from "@/utils/generateOrderNumber";
import { getSocketServer } from "@/lib/socketServer";
import { createNotification } from "@/lib/notifications/notificationService";
import { cartItemsToRepricePayload, normalizeGuestPhone } from "@/lib/public/cartPayload";
import {
  formatPickupNotePrefix,
  isValidSameDayPickup,
  parsePickupFromSpecialNote,
  stripPickupPrefix,
} from "@/lib/public/pickup";
import { logger } from "@/utils/logger";
import { sendOnlineOrderStatusEmail } from "@/lib/brevo/sendOnlineOrderStatusEmail";

export async function quoteOnlineOrder({ restaurantId, items }) {
  const payload = cartItemsToRepricePayload(items);
  const priced = await repricePosCartItems({
    restaurantId,
    items: payload,
    discountCode: null,
    applyServiceCharge: false,
  });

  return {
    items: priced.formattedItems,
    subTotal: priced.subTotal,
    taxTotal: priced.taxTotal,
    serviceChargeTotal: priced.serviceChargeTotal || 0,
    discountTotal: priced.discountTotal || 0,
    totalAmount: priced.totalAmount,
  };
}

export async function createOnlineOrder({
  restaurantId,
  restaurantName,
  restaurantAddress,
  items,
  partyName,
  contactNumber,
  guestCountryCode = "+1",
  guestEmail = null,
  pickupTime,
  customerNote = "",
}) {
  const name = String(partyName || "").trim();
  if (!name) {
    const err = new Error("Name is required");
    err.status = 400;
    throw err;
  }

  const phone = normalizeGuestPhone(contactNumber);
  if (phone.length < 10) {
    const err = new Error("A valid phone number is required");
    err.status = 400;
    throw err;
  }

  if (!isValidSameDayPickup(pickupTime)) {
    const err = new Error("Please choose a valid same-day pickup time");
    err.status = 400;
    throw err;
  }

  const priced = await quoteOnlineOrder({ restaurantId, items });

  const pickupPrefix = formatPickupNotePrefix(pickupTime);
  const noteBody = String(customerNote || "").trim();
  const specialNote = noteBody ? `${pickupPrefix} ${noteBody}` : pickupPrefix;

  const orderNumber = await getNextOrderNumber(restaurantId);
  const invoiceNumber = await getNextInvoiceNumber(restaurantId);

  const order = await Order.create({
    restaurantId,
    orderNumber,
    originalOrderNumber: orderNumber,
    isActive: true,
    invoiceNumber,
    originalInvoiceNumber: invoiceNumber,
    items: priced.items.map((item) => ({ ...item, sentQty: item.qty })),
    subTotal: priced.subTotal,
    taxTotal: priced.taxTotal,
    serviceChargeTotal: priced.serviceChargeTotal || 0,
    serviceChargeName: null,
    discountTotal: priced.discountTotal || 0,
    discountCode: null,
    discountPercent: null,
    totalAmount: priced.totalAmount,
    specialNote,
    guestName: name,
    partyName: name,
    contactNumber: phone,
    guestCountryCode: guestCountryCode || "+1",
    guestEmail: guestEmail ? String(guestEmail).trim().toLowerCase() : null,
    status: "PENDING",
    paymentStatus: "UNPAID",
    source: "ONLINE",
  });

  try {
    await createNotification({
      restaurantId,
      type: "NEW_ORDER",
      title: "New Online Order",
      message: `Online pickup order #${orderNumber} for ${name}`,
      orderId: order._id,
      metadata: {
        orderNumber,
        source: "ONLINE",
        pickupTime,
        actorName: name,
      },
    });
  } catch (notifyErr) {
    logger.error("Failed to notify online order", notifyErr);
  }

  try {
    const io = getSocketServer();
    if (io) {
      io.to(`restaurant:${restaurantId}`).emit("order:created", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        source: "ONLINE",
        restaurantName: restaurantName || null,
      });
    }
  } catch (socketErr) {
    logger.error("Failed to emit online order socket", socketErr);
  }

  try {
    await sendOnlineOrderStatusEmail({
      type: "placed",
      order,
      restaurantName,
      address: restaurantAddress || null,
    });
  } catch (emailErr) {
    logger.error("Failed to send order-placed email", emailErr);
  }

  logger.info(`Online order created: ${orderNumber} restaurant=${restaurantId}`);

  return {
    order,
    quote: priced,
    pickup: parsePickupFromSpecialNote(specialNote),
    customerNote: stripPickupPrefix(specialNote),
  };
}

export function serializePublicOrder(order) {
  if (!order) return null;
  const specialNote = order.specialNote || "";
  const pickup = parsePickupFromSpecialNote(specialNote);
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    source: order.source,
    partyName: order.partyName || order.guestName,
    contactNumber: order.contactNumber,
    guestEmail: order.guestEmail,
    subTotal: order.subTotal,
    taxTotal: order.taxTotal,
    serviceChargeTotal: order.serviceChargeTotal || 0,
    discountTotal: order.discountTotal || 0,
    totalAmount: order.totalAmount,
    specialNote: stripPickupPrefix(specialNote),
    pickup,
    orderType: "PICKUP",
    items: (order.items || []).map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
      size: item.size,
      options: item.options || [],
      tax: item.tax || 0,
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
