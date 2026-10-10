import mongoose from "mongoose";
import Order from "@/models/Order";
import PrintJob from "@/models/PrintJob";
import Notification from "@/models/Notification";
import OperationalAuditLog from "@/models/OperationalAuditLog";
import TableSession from "@/models/floor/TableSession";
import connectDB from "@/lib/db";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  assertCashOnlyDeletable,
  assertRemovableCashTender,
  hasRemovedCashTender,
  isCashOnlyReceiptPrintMeta,
  rebuildPaymentMethodAfterCashRemoval,
  stripCashFromReceiptMetadata,
} from "@/lib/orders/orderDeleteEligibility";
import {
  isCashPaymentMethod,
  resolveCashTipAmount,
  resolveSplitTenders,
  r2,
} from "@/lib/eod/eodHelpers";
import {
  orderBusinessDate,
  renumberOrdersForBusinessDay,
} from "@/lib/orders/renumberOrdersForBusinessDay";
import { ensureOrderSoftDeleteIndexes } from "@/lib/orders/ensureOrderSoftDeleteIndexes";

/** Soft-hide or restore PrintJobs + Notifications tied to an order. */
async function setOrderArtifactsActive(session, { restaurantId, orderId, isActive }) {
  const filter = { orderId, restaurantId };
  const update = { $set: { isActive } };
  const opts = sessionOpts(session);
  await Promise.all([
    PrintJob.updateMany(filter, update, opts),
    Notification.updateMany(filter, update, opts),
  ]);
}

function splitToPlain(split) {
  if (!split) return null;
  if (typeof split.toObject === "function") return split.toObject();
  return { ...split };
}

/** Snapshot payment fields needed to restore a soft-removed cash tender. */
function buildRemovedCashSnapshot(order) {
  const splits = Array.isArray(order.paymentSplits)
    ? order.paymentSplits.map(splitToPlain)
    : [];
  return {
    cashAmount: order.cashAmount ?? null,
    cardAmount: order.cardAmount ?? null,
    paymentMethod: order.paymentMethod ?? null,
    tipAmount: order.tipAmount ?? 0,
    tipMethod: order.tipMethod ?? null,
    paymentSplits: splits,
  };
}

/**
 * Strip cash tenders from a live order document (mutates). Card/gift kept.
 * Returns { removedCash, remainingTip }.
 */
function applyCashTenderRemoval(order) {
  const splits = Array.isArray(order.paymentSplits)
    ? order.paymentSplits.map(splitToPlain)
    : [];
  let removedCash = 0;
  let remainingTip = 0;
  const nextSplits = [];

  if (splits.length > 0) {
    for (const split of splits) {
      const tenders = resolveSplitTenders(split);
      const cash = tenders.cash;
      const card = tenders.card;
      const gift = tenders.giftCard;
      const splitTip = r2(split.tipAmount);
      const tipMethod = String(split.tipMethod || "").trim().toLowerCase();
      const tipIsCash =
        tipMethod.includes("cash") &&
        !tipMethod.includes("card") &&
        !tipMethod.includes("gift");
      const tipIsCashByMethod =
        !tipMethod && isCashPaymentMethod(split.method);

      if (cash > 0 && card <= 0 && gift <= 0) {
        // Pure cash row — drop entirely (written off).
        removedCash = r2(removedCash + cash);
        continue;
      }

      if (cash > 0 && (card > 0 || gift > 0)) {
        removedCash = r2(removedCash + cash);
        const next = { ...split, cashAmount: 0 };
        if (card > 0) {
          next.method = "Card";
          next.cardAmount = card;
        } else if (gift > 0) {
          next.method = "Gift Card";
          next.cardAmount = 0;
        }

        if (tipIsCash || tipIsCashByMethod) {
          // Drop cash tip on mixed row.
          next.tipAmount = 0;
          next.tipMethod = null;
        } else {
          remainingTip = r2(remainingTip + splitTip);
        }
        nextSplits.push(next);
        continue;
      }

      // Non-cash row — keep; tip stays.
      remainingTip = r2(remainingTip + splitTip);
      nextSplits.push(split);
    }

    order.paymentSplits = nextSplits;
    order.cashAmount = 0;

    // Re-sum card from remaining splits when explicit amounts exist.
    let cardSum = 0;
    let hasExplicitCard = false;
    for (const s of nextSplits) {
      if (s.cardAmount != null) {
        hasExplicitCard = true;
        cardSum = r2(cardSum + r2(s.cardAmount));
      }
    }
    if (hasExplicitCard) {
      order.cardAmount = cardSum;
    }

    order.tipAmount = remainingTip;
    if (remainingTip <= 0) {
      order.tipMethod = null;
    } else {
      const tipMethods = [
        ...new Set(
          nextSplits
            .filter((s) => r2(s.tipAmount) > 0)
            .map((s) => s.tipMethod || (isCashPaymentMethod(s.method) ? "Cash" : "Card"))
            .filter(Boolean)
        ),
      ];
      order.tipMethod =
        tipMethods.length === 1
          ? tipMethods[0]
          : tipMethods.length > 1
            ? tipMethods.join(" + ")
            : "Card";
    }
  } else {
    // Order-level mixed tenders (no paymentSplits).
    const cashTip = resolveCashTipAmount(order);
    const tip = r2(order.tipAmount);
    const cash = order.cashAmount != null ? r2(order.cashAmount) : 0;
    removedCash = cash;
    order.cashAmount = 0;

    remainingTip = r2(Math.max(0, tip - cashTip));
    order.tipAmount = remainingTip;
    if (remainingTip <= 0) {
      order.tipMethod = null;
    } else if (
      String(order.tipMethod || "")
        .toLowerCase()
        .includes("cash")
    ) {
      order.tipMethod = "Card";
    }
  }

  order.paymentMethod = rebuildPaymentMethodAfterCashRemoval(order);
  return { removedCash, remainingTip };
}

async function findCashReceiptPrintJobs(session, { restaurantId, orderId }) {
  let query = PrintJob.find({
    orderId,
    restaurantId,
    printType: "RECEIPT",
  }).select("_id metadata isActive");
  if (session) query = query.session(session);
  const jobs = await query.lean();
  return (jobs || []).filter((job) => isCashOnlyReceiptPrintMeta(job.metadata));
}

async function setPrintJobsActiveByIds(session, { ids, isActive }) {
  if (!ids?.length) return;
  await PrintJob.updateMany(
    { _id: { $in: ids } },
    { $set: { isActive } },
    sessionOpts(session)
  );
}

/**
 * After cash tender removal: soft-hide cash-only receipt slips; scrub cash from
 * mixed slips (cashAmount, paymentMethod, splitMethod, tipMethod).
 */
async function scrubMixedReceiptCashMeta(session, { restaurantId, orderId }) {
  let query = PrintJob.find({
    orderId,
    restaurantId,
    printType: "RECEIPT",
    isActive: { $ne: false },
  }).select("_id metadata");
  if (session) query = query.session(session);
  const jobs = await query;
  const hideIds = [];
  for (const job of jobs) {
    const result = stripCashFromReceiptMetadata(job.metadata);
    if (!result) continue;
    if (result.hide) {
      hideIds.push(job._id);
      continue;
    }
    job.metadata = result.metadata;
    job.markModified("metadata");
    await job.save(sessionOpts(session));
  }
  if (hideIds.length) {
    await setPrintJobsActiveByIds(session, { ids: hideIds, isActive: false });
  }
  return hideIds;
}

/**
 * Heal stale receipt print jobs for an order whose cash tender was already removed.
 * Safe to call from read paths (idempotent).
 */
export async function healReceiptPrintJobsAfterCashRemoval({
  restaurantId,
  orderId,
}) {
  await connectDB();
  await scrubMixedReceiptCashMeta(null, { restaurantId, orderId });
  const cashJobs = await findCashReceiptPrintJobs(null, {
    restaurantId,
    orderId,
  });
  const stillActiveCash = cashJobs.filter((j) => j.isActive !== false);
  if (stillActiveCash.length) {
    await setPrintJobsActiveByIds(null, {
      ids: stillActiveCash.map((j) => j._id),
      isActive: false,
    });
  }
}

/** Keep PAYMENT_COMPLETED notifications aligned with live order payment state. */
async function syncPaymentCompletedNotificationsFromOrder(
  session,
  { restaurantId, orderId, order, cashTenderRemoved = false }
) {
  let query = Notification.find({
    restaurantId,
    orderId,
    type: "PAYMENT_COMPLETED",
    isActive: { $ne: false },
  });
  if (session) query = query.session(session);
  const notifs = await query;
  if (!notifs.length) return;

  const orderNumber = order.orderNumber;
  const method = order.paymentMethod || "Card";
  const splits = Array.isArray(order.paymentSplits) ? order.paymentSplits : [];
  const splitCount = splits.length > 1 ? splits.length : 0;
  const tablePart = order.tableNo
    ? ` • ${
        /^tables?\b/i.test(String(order.tableNo).trim())
          ? order.tableNo
          : `Table ${order.tableNo}`
      }`
    : "";
  const splitPart = splitCount > 1 ? ` · Split ${splitCount} ways` : "";
  const message = `Payment received for Order #${orderNumber}${tablePart}${splitPart}`;

  for (const n of notifs) {
    const prevMeta =
      n.metadata && typeof n.metadata === "object" ? n.metadata : {};
    const nextMeta = {
      ...prevMeta,
      orderNumber,
      method,
      amount: order.totalAmount,
      tipAmount: order.tipAmount || 0,
      splitCount,
    };
    if (cashTenderRemoved) nextMeta.cashTenderRemoved = true;
    else delete nextMeta.cashTenderRemoved;
    n.metadata = nextMeta;
    n.message = message;
    n.markModified("metadata");
    await n.save(sessionOpts(session));
  }
}

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

    await setOrderArtifactsActive(session, {
      restaurantId,
      orderId: order._id,
      isActive: false,
    });

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

    await setOrderArtifactsActive(session, {
      restaurantId,
      orderId: order._id,
      isActive: true,
    });

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
 * Permanently remove a soft-deleted cash-only order, its print jobs, and notifications.
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
    await Notification.deleteMany(
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

/**
 * Soft-remove cash tender from a mixed cash+card/gift order.
 * Order stays active; card/gift payment data is preserved.
 */
export async function softRemoveCashTender({
  restaurantId,
  orderId,
  actor,
  reason = null,
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
    if (order.isActive === false) {
      const err = new Error("Order is deleted; restore it before removing cash");
      err.status = 400;
      throw err;
    }
    if (order.cashTenderRemovedAt) {
      const err = new Error("Cash tender was already removed from this order");
      err.status = 400;
      throw err;
    }

    assertRemovableCashTender(order);

    // Preserve first-assigned # for Deleted Orders display after peer renumbers.
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

    const previous = buildRemovedCashSnapshot(order);
    const cashJobs = await findCashReceiptPrintJobs(session, {
      restaurantId,
      orderId: order._id,
    });
    let cashPrintJobIds = cashJobs.map((j) => j._id);

    const { removedCash } = applyCashTenderRemoval(order);

    // Keep paid status — cash is written off from books, not left unpaid.
    if (order.paymentStatus === "PAID" || order.status === "PAID") {
      order.paymentStatus = "PAID";
      if (order.status === "PAID" || order.status === "COMPLETED") {
        order.status = order.status;
      }
    }

    await setPrintJobsActiveByIds(session, {
      ids: cashPrintJobIds,
      isActive: false,
    });
    const scrubHiddenIds = await scrubMixedReceiptCashMeta(session, {
      restaurantId,
      orderId: order._id,
    });
    cashPrintJobIds = [
      ...new Set([
        ...cashPrintJobIds.map(String),
        ...(scrubHiddenIds || []).map(String),
      ]),
    ];

    order.removedCashSnapshot = {
      ...previous,
      cashPrintJobIds,
      removedCash,
    };
    // Mixed paths require markModified or Mongoose may skip persisting the snapshot.
    order.markModified("removedCashSnapshot");
    order.markModified("paymentSplits");
    order.cashTenderRemovedAt = new Date();
    order.cashTenderRemovedBy = actor.actorId;
    order.cashTenderRemovalReason = reason || null;

    await order.save(sessionOpts(session));

    await syncPaymentCompletedNotificationsFromOrder(session, {
      restaurantId,
      orderId: order._id,
      order,
      cashTenderRemoved: true,
    });

    await writeAudit(session, {
      restaurantId,
      ...actorPayload(actor),
      action: "ORDER_CASH_TENDER_SOFT_REMOVED",
      orderId: order._id,
      tableId: order.table || undefined,
      tableSessionId: order.tableSession || undefined,
      floorId: order.floor || undefined,
      previousValue: previous,
      newValue: {
        cashAmount: order.cashAmount,
        cardAmount: order.cardAmount,
        paymentMethod: order.paymentMethod,
        tipAmount: order.tipAmount,
        tipMethod: order.tipMethod,
        paymentSplits: Array.isArray(order.paymentSplits)
          ? order.paymentSplits.map(splitToPlain)
          : [],
        cashTenderRemovedAt: order.cashTenderRemovedAt,
        removedCash,
      },
      reason: reason || "Admin soft-remove cash tender",
      timestamp: new Date(),
    });

    return {
      order: order.toObject(),
      mode: "cash_tender",
      removedCash,
    };
  });
}

/**
 * Restore a previously soft-removed cash tender on an active order.
 */
export async function restoreCashTender({
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
    if (order.isActive === false) {
      const err = new Error("Order is deleted");
      err.status = 400;
      throw err;
    }
    if (!hasRemovedCashTender(order)) {
      const err = new Error("No soft-removed cash tender to restore");
      err.status = 400;
      throw err;
    }

    let snap = order.removedCashSnapshot;
    if (
      !snap ||
      typeof snap !== "object" ||
      (snap.cashAmount == null && !Array.isArray(snap.paymentSplits))
    ) {
      // Recover from audit if Mixed snapshot failed to persist (pre-markModified writes).
      let auditQuery = OperationalAuditLog.findOne({
        restaurantId,
        orderId: order._id,
        action: "ORDER_CASH_TENDER_SOFT_REMOVED",
      }).sort({ timestamp: -1 });
      if (session) auditQuery = auditQuery.session(session);
      const audit = await auditQuery.lean();
      const recovered = audit?.previousValue;
      if (
        recovered &&
        typeof recovered === "object" &&
        (recovered.cashAmount != null ||
          Array.isArray(recovered.paymentSplits))
      ) {
        snap = recovered;
      } else {
        const err = new Error(
          "Cash payment snapshot is missing; this removal cannot be restored. Permanently delete cash history instead."
        );
        err.status = 400;
        throw err;
      }
    }

    const previousLive = {
      cashAmount: order.cashAmount,
      cardAmount: order.cardAmount,
      paymentMethod: order.paymentMethod,
      tipAmount: order.tipAmount,
      tipMethod: order.tipMethod,
      paymentSplits: Array.isArray(order.paymentSplits)
        ? order.paymentSplits.map(splitToPlain)
        : [],
    };

    order.cashAmount = snap.cashAmount ?? null;
    order.cardAmount = snap.cardAmount ?? null;
    order.paymentMethod = snap.paymentMethod ?? order.paymentMethod;
    order.tipAmount = snap.tipAmount ?? 0;
    order.tipMethod = snap.tipMethod ?? null;
    order.paymentSplits = Array.isArray(snap.paymentSplits)
      ? snap.paymentSplits
      : [];

    const cashPrintJobIds = Array.isArray(snap.cashPrintJobIds)
      ? snap.cashPrintJobIds
      : [];

    order.cashTenderRemovedAt = null;
    order.cashTenderRemovedBy = null;
    order.cashTenderRemovalReason = null;
    order.removedCashSnapshot = null;
    order.markModified("removedCashSnapshot");
    order.markModified("paymentSplits");

    await order.save(sessionOpts(session));

    await setPrintJobsActiveByIds(session, {
      ids: cashPrintJobIds,
      isActive: true,
    });

    await syncPaymentCompletedNotificationsFromOrder(session, {
      restaurantId,
      orderId: order._id,
      order,
      cashTenderRemoved: false,
    });

    // Restore mixed-slip metadata cash amounts from snapshot when possible.
    if (snap.cashAmount != null || snap.paymentMethod) {
      let mixedQuery = PrintJob.find({
        orderId: order._id,
        restaurantId,
        printType: "RECEIPT",
        isActive: { $ne: false },
        _id: { $nin: cashPrintJobIds },
      });
      if (session) mixedQuery = mixedQuery.session(session);
      const mixedJobs = await mixedQuery;
      for (const job of mixedJobs) {
        const meta = job.metadata || {};
        const card = r2(meta.cardAmount);
        const gift = r2(meta.giftAmount ?? meta.giftcardUsedAmount);
        if (card > 0 || gift > 0) {
          // Best-effort: put order-level cash back on mixed slip metadata.
          const orderCash = snap.cashAmount != null ? r2(snap.cashAmount) : 0;
          if (orderCash > 0 && r2(meta.cashAmount) <= 0) {
            job.metadata = {
              ...meta,
              cashAmount: orderCash,
              paymentMethod: snap.paymentMethod || meta.paymentMethod,
            };
            await job.save(sessionOpts(session));
          }
        }
      }
    }

    await writeAudit(session, {
      restaurantId,
      ...actorPayload(actor),
      action: "ORDER_CASH_TENDER_RESTORED",
      orderId: order._id,
      tableId: order.table || undefined,
      tableSessionId: order.tableSession || undefined,
      floorId: order.floor || undefined,
      previousValue: previousLive,
      newValue: {
        cashAmount: order.cashAmount,
        cardAmount: order.cardAmount,
        paymentMethod: order.paymentMethod,
        tipAmount: order.tipAmount,
        tipMethod: order.tipMethod,
        paymentSplits: Array.isArray(order.paymentSplits)
          ? order.paymentSplits.map(splitToPlain)
          : [],
      },
      reason: "Admin restore cash tender",
      timestamp: new Date(),
    });

    return { order: order.toObject(), mode: "cash_tender" };
  });
}

/**
 * Permanently discard soft-removed cash tender history (order stays as card/gift-only).
 */
export async function permanentlyDeleteCashTender({
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
    if (order.isActive === false) {
      const err = new Error("Order is deleted");
      err.status = 400;
      throw err;
    }
    if (!hasRemovedCashTender(order)) {
      const err = new Error(
        "Cash tender must be soft-removed before it can be permanently deleted"
      );
      err.status = 400;
      throw err;
    }

    const snap = order.removedCashSnapshot || {};
    const cashPrintJobIds = Array.isArray(snap.cashPrintJobIds)
      ? snap.cashPrintJobIds
      : [];

    if (cashPrintJobIds.length) {
      await PrintJob.deleteMany(
        { _id: { $in: cashPrintJobIds }, restaurantId },
        sessionOpts(session)
      );
    } else {
      // Fallback: delete inactive cash-only receipt slips for this order.
      const cashJobs = await findCashReceiptPrintJobs(session, {
        restaurantId,
        orderId: order._id,
      });
      const ids = cashJobs.filter((j) => j.isActive === false).map((j) => j._id);
      if (ids.length) {
        await PrintJob.deleteMany(
          { _id: { $in: ids }, restaurantId },
          sessionOpts(session)
        );
      }
    }

    const snapshotAudit = {
      removedCash: snap.removedCash ?? null,
      cashAmount: snap.cashAmount ?? null,
      paymentMethod: snap.paymentMethod ?? null,
      paymentSplits: snap.paymentSplits ?? [],
      cashTenderRemovedAt: order.cashTenderRemovedAt,
    };

    order.cashTenderRemovedAt = null;
    order.cashTenderRemovedBy = null;
    order.cashTenderRemovalReason = null;
    order.removedCashSnapshot = null;
    order.markModified("removedCashSnapshot");
    await order.save(sessionOpts(session));

    await writeAudit(session, {
      restaurantId,
      ...actorPayload(actor),
      action: "ORDER_CASH_TENDER_PERMANENTLY_DELETED",
      orderId: order._id,
      previousValue: snapshotAudit,
      newValue: { cashTenderPermanentlyDeleted: true },
      reason: "Admin permanent delete cash tender",
      timestamp: new Date(),
    });

    return { snapshot: snapshotAudit, mode: "cash_tender" };
  });
}
