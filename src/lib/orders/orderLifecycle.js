import mongoose from "mongoose";
import Order from "@/models/Order";
import PrintJob from "@/models/PrintJob";
import OperationalAuditLog from "@/models/OperationalAuditLog";
import TableSession from "@/models/floor/TableSession";
import connectDB from "@/lib/db";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import { assertCashOnlyDeletable } from "@/lib/orders/orderDeleteEligibility";
import {
  orderBusinessDate,
  renumberOrdersForBusinessDay,
} from "@/lib/orders/renumberOrdersForBusinessDay";
import { ensureOrderSoftDeleteIndexes } from "@/lib/orders/ensureOrderSoftDeleteIndexes";

function actorPayload(actor) {
  return {
    actorId: actor.actorId,
    actorType: actor.actorType || "Admin",
    actorName: actor.actorName || null,
  };
}

function isTransactionUnsupportedError(error) {
  const msg = String(error?.message || "");
  return (
    error?.code === 20 ||
    error?.codeName === "IllegalOperation" ||
    /replica set|mongos|transaction numbers/i.test(msg)
  );
}

async function writeAudit(session, doc) {
  if (session) {
    await OperationalAuditLog.create([doc], { session });
  } else {
    await OperationalAuditLog.create(doc);
  }
}

/**
 * Run work inside a Mongo transaction when available (Atlas / replica set).
 * Falls back to non-transactional execution on standalone local MongoDB.
 */
async function withOptionalTransaction(work) {
  const session = await mongoose.startSession();
  let usedTransaction = false;

  try {
    try {
      session.startTransaction();
      usedTransaction = true;
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) throw error;
    }

    if (usedTransaction) {
      try {
        const result = await work(session);
        await session.commitTransaction();
        return result;
      } catch (error) {
        try {
          await session.abortTransaction();
        } catch {
          // ignore abort errors
        }
        // Standalone Mongo often fails on first transactional op, not startTransaction.
        if (isTransactionUnsupportedError(error)) {
          usedTransaction = false;
          return work(null);
        }
        throw error;
      }
    }

    return work(null);
  } finally {
    session.endSession();
  }
}

function sessionOpts(session) {
  return session ? { session } : undefined;
}

/** Unique placeholder so deleted/restoring rows never collide with active sequence. */
function reservedOrderNumber(prefix, id) {
  return `${prefix}${String(id)}`;
}

/**
 * Soft-delete a cash-only order and renumber peers for its business day.
 */
export async function softDeleteOrder({
  restaurantId,
  orderId,
  actor,
  reason = null,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE,
}) {
  await connectDB();
  await ensureOrderSoftDeleteIndexes();

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const err = new Error("Invalid order ID");
    err.status = 400;
    throw err;
  }

  return withOptionalTransaction(async (session) => {
    let orderQuery = Order.findOne({ _id: orderId, restaurantId });
    if (session) orderQuery = orderQuery.session(session);
    const order = await orderQuery;

    if (!order) {
      const err = new Error("Order not found");
      err.status = 404;
      throw err;
    }
    if (order.isActive === false) {
      const err = new Error("Order is already deleted");
      err.status = 400;
      throw err;
    }

    assertCashOnlyDeletable(order);

    if (!order.originalOrderNumber) {
      order.originalOrderNumber = order.orderNumber;
    }
    if (!order.originalInvoiceNumber) {
      const inv = String(order.invoiceNumber || "");
      if (inv && !/^(DEL-INV-|RST-INV-)/i.test(inv)) {
        order.originalInvoiceNumber = order.invoiceNumber;
      } else if (order.originalOrderNumber) {
        order.originalInvoiceNumber = order.originalOrderNumber;
      }
    }

    const oldOrderNumber = order.orderNumber;
    const oldInvoiceNumber = order.invoiceNumber || null;
    const businessDate = orderBusinessDate(order.createdAt, timeZone);

    // Release display numbers before peers renumber onto them.
    order.orderNumber = reservedOrderNumber("DEL-", order._id);
    order.invoiceNumber = reservedOrderNumber("DEL-INV-", order._id);
    order.isActive = false;
    order.deletedAt = new Date();
    order.deletedBy = actor.actorId;
    order.deletionReason = reason || null;
    order.restoredAt = null;
    order.restoredBy = null;
    await order.save(sessionOpts(session));

    if (order.tableSession) {
      await TableSession.updateOne(
        { _id: order.tableSession, restaurantId },
        { $pull: { activeOrders: order._id } },
        sessionOpts(session)
      );
    }

    const renumberChanges = await renumberOrdersForBusinessDay({
      restaurantId,
      businessDate,
      session,
      actor: actorPayload(actor),
      timeZone,
    });

    await writeAudit(session, {
      restaurantId,
      ...actorPayload(actor),
      action: "ORDER_SOFT_DELETED",
      orderId: order._id,
      tableId: order.table || undefined,
      tableSessionId: order.tableSession || undefined,
      floorId: order.floor || undefined,
      previousValue: {
        orderNumber: oldOrderNumber,
        invoiceNumber: oldInvoiceNumber,
        originalOrderNumber: order.originalOrderNumber,
        originalInvoiceNumber: order.originalInvoiceNumber,
        isActive: true,
      },
      newValue: {
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        isActive: false,
        deletedAt: order.deletedAt,
      },
      reason: reason || "Admin soft delete",
      timestamp: new Date(),
    });

    return {
      order: order.toObject(),
      businessDate,
      renumberChanges,
    };
  });
}

/**
 * Restore a soft-deleted order and renumber peers for its business day.
 */
export async function restoreOrder({
  restaurantId,
  orderId,
  actor,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE,
}) {
  await connectDB();
  await ensureOrderSoftDeleteIndexes();

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const err = new Error("Invalid order ID");
    err.status = 400;
    throw err;
  }

  return withOptionalTransaction(async (session) => {
    let orderQuery = Order.findOne({ _id: orderId, restaurantId });
    if (session) orderQuery = orderQuery.session(session);
    const order = await orderQuery;

    if (!order) {
      const err = new Error("Order not found");
      err.status = 404;
      throw err;
    }
    if (order.isActive !== false) {
      const err = new Error("Order is already active");
      err.status = 400;
      throw err;
    }

    const businessDate = orderBusinessDate(order.createdAt, timeZone);
    const previousOrderNumber =
      order.originalOrderNumber || order.orderNumber;
    const previousInvoiceNumber =
      order.originalInvoiceNumber || order.invoiceNumber || null;

    // Activate under unique temp numbers, then compact the business-day sequence
    // (restored order returns to its createdAt place; peers shift).
    order.orderNumber = reservedOrderNumber("RST-", order._id);
    order.invoiceNumber = reservedOrderNumber("RST-INV-", order._id);
    order.isActive = true;
    order.deletedAt = null;
    order.deletedBy = null;
    order.deletionReason = null;
    order.restoredAt = new Date();
    order.restoredBy = actor.actorId;
    await order.save(sessionOpts(session));

    const renumberChanges = await renumberOrdersForBusinessDay({
      restaurantId,
      businessDate,
      session,
      actor: actorPayload(actor),
      timeZone,
    });

    let refreshedQuery = Order.findById(order._id).lean();
    if (session) refreshedQuery = refreshedQuery.session(session);
    const refreshed = await refreshedQuery;

    await writeAudit(session, {
      restaurantId,
      ...actorPayload(actor),
      action: "ORDER_RESTORED",
      orderId: order._id,
      tableId: order.table || undefined,
      tableSessionId: order.tableSession || undefined,
      floorId: order.floor || undefined,
      previousValue: {
        orderNumber: previousOrderNumber,
        invoiceNumber: previousInvoiceNumber,
        isActive: false,
      },
      newValue: {
        orderNumber: refreshed?.orderNumber || order.orderNumber,
        invoiceNumber: refreshed?.invoiceNumber || order.invoiceNumber,
        isActive: true,
        restoredAt: order.restoredAt,
      },
      reason: "Admin restore",
      timestamp: new Date(),
    });

    return {
      order: refreshed,
      businessDate,
      renumberChanges,
    };
  });
}

/**
 * Permanently remove a soft-deleted cash-only order and its print jobs.
 * Retains OperationalAuditLog history.
 */
export async function permanentlyDeleteOrder({
  restaurantId,
  orderId,
  actor,
}) {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const err = new Error("Invalid order ID");
    err.status = 400;
    throw err;
  }

  return withOptionalTransaction(async (session) => {
    let orderQuery = Order.findOne({ _id: orderId, restaurantId });
    if (session) orderQuery = orderQuery.session(session);
    const order = await orderQuery;

    if (!order) {
      const err = new Error("Order not found");
      err.status = 404;
      throw err;
    }
    if (order.isActive !== false) {
      const err = new Error(
        "Order must be soft-deleted before it can be permanently deleted"
      );
      err.status = 400;
      throw err;
    }

    // Defense in depth: never permanently wipe card/gift tenders via this path.
    try {
      assertCashOnlyDeletable({ ...order.toObject(), isActive: true });
    } catch {
      const err = new Error(
        "Orders with Card or Gift Card payment cannot be permanently deleted."
      );
      err.status = 400;
      throw err;
    }

    const snapshot = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      originalOrderNumber: order.originalOrderNumber,
      invoiceNumber: order.invoiceNumber,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      deletedAt: order.deletedAt,
    };

    if (order.tableSession) {
      await TableSession.updateOne(
        { _id: order.tableSession, restaurantId },
        { $pull: { activeOrders: order._id } },
        sessionOpts(session)
      );
    }

    await PrintJob.deleteMany(
      { orderId: order._id, restaurantId },
      sessionOpts(session)
    );

    await Order.deleteOne(
      { _id: order._id, restaurantId },
      sessionOpts(session)
    );

    await writeAudit(session, {
      restaurantId,
      ...actorPayload(actor),
      action: "ORDER_PERMANENTLY_DELETED",
      orderId: order._id,
      previousValue: snapshot,
      newValue: { permanentlyDeleted: true },
      reason: "Admin permanent delete",
      timestamp: new Date(),
    });

    return { snapshot };
  });
}
