import Order from "@/models/Order";
import OperationalAuditLog from "@/models/OperationalAuditLog";
import {
  businessDateBounds,
  isValidBusinessDate,
} from "@/lib/eod/eodHelpers";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";

function padOrderNumber(n) {
  return String(n).padStart(4, "0");
}

function parseOrderNumber(value) {
  const s = String(value || "").trim();
  if (!s || /^(DEL-|RST-|DEL-INV-|RST-INV-)/i.test(s)) return null;
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Business date (YYYY-MM-DD) for an order's createdAt in restaurant TZ.
 */
export function orderBusinessDate(
  createdAt,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(createdAt));
}

/**
 * Compact active orderNumber + invoiceNumber for one restaurant business day.
 * Restored orders slot by createdAt; later peers shift up/down.
 * Does NOT mutate payments, tips, taxes, or _id.
 *
 * @returns {Promise<Array<{ orderId, oldOrderNumber, newOrderNumber, oldInvoiceNumber, newInvoiceNumber }>>}
 */
export async function renumberOrdersForBusinessDay({
  restaurantId,
  businessDate,
  session = null,
  actor = null,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE,
}) {
  if (!isValidBusinessDate(businessDate)) {
    throw new Error(`Invalid business date: ${businessDate}`);
  }

  const { start, end } = businessDateBounds(businessDate, timeZone);
  const query = Order.find({
    restaurantId,
    isActive: { $ne: false },
    createdAt: { $gte: start, $lt: end },
  }).sort({ createdAt: 1, _id: 1 });

  if (session) query.session(session);
  const peers = await query.lean();

  if (peers.length === 0) return [];

  const nums = peers
    .map(
      (o) =>
        parseOrderNumber(o.orderNumber) ??
        parseOrderNumber(o.originalOrderNumber) ??
        parseOrderNumber(o.invoiceNumber) ??
        parseOrderNumber(o.originalInvoiceNumber)
    )
    .filter((n) => n != null);
  const startNum = nums.length ? Math.min(...nums) : 1;

  const planned = peers.map((o, i) => {
    const newNumber = padOrderNumber(startNum + i);
    return {
      orderId: o._id,
      oldOrderNumber: o.orderNumber,
      newOrderNumber: newNumber,
      oldInvoiceNumber: o.invoiceNumber || null,
      newInvoiceNumber: newNumber,
    };
  });

  const changes = planned.filter(
    (p) =>
      String(p.oldOrderNumber) !== String(p.newOrderNumber) ||
      String(p.oldInvoiceNumber || "") !== String(p.newInvoiceNumber)
  );
  if (changes.length === 0) return [];

  // Two-phase update avoids unique collisions under partial indexes.
  const tempSuffix = `__tmp_${Date.now()}`;
  for (const change of changes) {
    await Order.updateOne(
      { _id: change.orderId, restaurantId },
      {
        $set: {
          orderNumber: `${change.newOrderNumber}${tempSuffix}`,
          invoiceNumber: `${change.newInvoiceNumber}${tempSuffix}`,
        },
      },
      session ? { session } : undefined
    );
  }
  for (const change of changes) {
    await Order.updateOne(
      { _id: change.orderId, restaurantId },
      {
        $set: {
          orderNumber: change.newOrderNumber,
          invoiceNumber: change.newInvoiceNumber,
        },
      },
      session ? { session } : undefined
    );
  }

  if (actor?.actorId) {
    const logs = changes.map((change) => ({
      restaurantId,
      actorId: actor.actorId,
      actorType: actor.actorType || "Admin",
      actorName: actor.actorName || null,
      action: "ORDER_NUMBER_RENUMBERED",
      orderId: change.orderId,
      previousValue: {
        orderNumber: change.oldOrderNumber,
        invoiceNumber: change.oldInvoiceNumber,
      },
      newValue: {
        orderNumber: change.newOrderNumber,
        invoiceNumber: change.newInvoiceNumber,
      },
      reason: `Business-day renumber for ${businessDate}`,
      timestamp: new Date(),
    }));
    if (session) {
      await OperationalAuditLog.insertMany(logs, { session });
    } else {
      await OperationalAuditLog.insertMany(logs);
    }
  }

  return changes;
}
