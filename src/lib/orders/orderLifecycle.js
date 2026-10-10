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
  isPureCashSplit,
  listRemovedCashEntries,
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
  filterItemsBySeats,
  normalizeSeatNumber,
  normalizeSeatNumbersList,
  proportionalOrderTotalsForItems,
  seatKey,
} from "@/lib/orders/seatHelpers";
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

function itemToPlain(item) {
  if (!item) return null;
  if (typeof item.toObject === "function") return item.toObject();
  return { ...item };
}

function seatsCoveredBySplit(split) {
  const fromList = normalizeSeatNumbersList(split);
  if (fromList.length) {
    return fromList.map((s) => seatKey(s));
  }
  // Fallback: "Seat 1 - Cash" style payer labels when seatNumbers were not stored.
  const name = String(split?.name || "");
  const match = name.match(/\bseat\s*(\d+)\b/i);
  if (match) {
    return [seatKey(Number(match[1]))];
  }
  return [];
}

/** Snapshot payment + totals/items needed to restore a soft-removed cash tender. */
function buildRemovedCashSnapshot(order) {
  const splits = Array.isArray(order.paymentSplits)
    ? order.paymentSplits.map(splitToPlain)
    : [];
  const items = Array.isArray(order.items) ? order.items.map(itemToPlain) : [];
  return {
    cashAmount: order.cashAmount ?? null,
    cardAmount: order.cardAmount ?? null,
    paymentMethod: order.paymentMethod ?? null,
    tipAmount: order.tipAmount ?? 0,
    tipMethod: order.tipMethod ?? null,
    paymentSplits: splits,
    items,
    subTotal: order.subTotal,
    taxTotal: order.taxTotal,
    discountTotal: order.discountTotal,
    serviceChargeTotal: order.serviceChargeTotal,
    totalAmount: order.totalAmount,
    taxBreakdown: Array.isArray(order.taxBreakdown)
      ? order.taxBreakdown.map((t) =>
          typeof t?.toObject === "function" ? t.toObject() : { ...t }
        )
      : [],
    releasedSeats: Array.isArray(order.releasedSeats)
      ? [...order.releasedSeats]
      : [],
    guestCount: order.guestCount ?? null,
    removedCashEntries: [],
  };
}

function seatKeysForSplit(split) {
  return new Set(
    normalizeSeatNumbersList(split).map((n) => seatKey(n)).filter(Boolean)
  );
}

function findSplitIndexBySeats(splits, seatNumbers) {
  const target = new Set(
    (Array.isArray(seatNumbers) ? seatNumbers : [])
      .map((n) => seatKey(normalizeSeatNumber(n)))
      .filter(Boolean)
  );
  if (!target.size) return -1;
  return (Array.isArray(splits) ? splits : []).findIndex((s) => {
    const keys = seatKeysForSplit(s);
    if (keys.size !== target.size) return false;
    for (const k of target) {
      if (!keys.has(k)) return false;
    }
    return true;
  });
}

function makeCashEntryId(splitIndex) {
  return `cash-${Date.now()}-${splitIndex}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildRemovedCashEntry({
  split,
  allItems,
  orderTotals,
  removedAt,
  cashPrintJobIds,
  entryId,
  originalSplitIndex,
}) {
  const plain = splitToPlain(split);
  const seatNumbers = normalizeSeatNumbersList(plain);
  const seatItems = filterItemsBySeats(allItems, seatNumbers).map(itemToPlain);
  const tenders = resolveSplitTenders(plain);
  const totals =
    seatItems.length > 0
      ? proportionalOrderTotalsForItems(
          { items: allItems, ...orderTotals },
          seatItems
        )
      : {
          subTotal: tenders.cash,
          taxTotal: 0,
          discountTotal: 0,
          serviceChargeTotal: 0,
          totalAmount: tenders.cash,
          taxBreakdown: [],
        };
  return {
    entryId: entryId || makeCashEntryId(0),
    originalSplitIndex: originalSplitIndex != null ? originalSplitIndex : -1,
    split: plain,
    seatNumbers,
    items: seatItems,
    removedCash: tenders.cash,
    tipAmount: r2(plain.tipAmount),
    removedAt: removedAt instanceof Date ? removedAt.toISOString() : removedAt,
    cashPrintJobIds: (cashPrintJobIds || []).map(String),
    name: plain?.name || "Cash",
    subTotal: totals.subTotal,
    taxTotal: totals.taxTotal,
    discountTotal: totals.discountTotal,
    serviceChargeTotal: totals.serviceChargeTotal,
    totalAmount: totals.totalAmount,
    taxBreakdown: totals.taxBreakdown,
  };
}

function applyFullCashSnapshotToOrder(order, snap) {
  order.cashAmount = snap.cashAmount ?? null;
  order.cardAmount = snap.cardAmount ?? null;
  order.paymentMethod = snap.paymentMethod ?? order.paymentMethod;
  order.tipAmount = snap.tipAmount ?? 0;
  order.tipMethod = snap.tipMethod ?? null;
  order.paymentSplits = Array.isArray(snap.paymentSplits)
    ? snap.paymentSplits.map(splitToPlain)
    : [];
  if (Array.isArray(snap.items)) {
    order.items = snap.items.map(itemToPlain);
    order.markModified("items");
  }
  if (snap.subTotal != null) order.subTotal = snap.subTotal;
  if (snap.taxTotal != null) order.taxTotal = snap.taxTotal;
  if (snap.discountTotal != null) order.discountTotal = snap.discountTotal;
  if (snap.serviceChargeTotal != null) {
    order.serviceChargeTotal = snap.serviceChargeTotal;
  }
  if (snap.totalAmount != null) order.totalAmount = snap.totalAmount;
  if (Array.isArray(snap.taxBreakdown)) {
    order.taxBreakdown = snap.taxBreakdown;
    order.markModified("taxBreakdown");
  }
  if (Array.isArray(snap.releasedSeats)) {
    order.releasedSeats = snap.releasedSeats;
    order.markModified("releasedSeats");
  }
  if (snap.guestCount !== undefined) {
    order.guestCount = snap.guestCount;
  }
  order.markModified("paymentSplits");
}

/**
 * Strip cash tenders from a live order document (mutates). Card/gift kept.
 * Drops cash-only split rows and their seat items; recalculates order totals.
 * @param {object} order
 * @param {{ splitIndices?: number[]|null }} [opts] — if set, only those split indexes.
 * Returns { removedCash, remainingTip }.
 */
function applyCashTenderRemoval(order, { splitIndices = null } = {}) {
  const splits = Array.isArray(order.paymentSplits)
    ? order.paymentSplits.map(splitToPlain)
    : [];
  let removedCash = 0;
  let remainingTip = 0;
  const nextSplits = [];
  const droppedCashOnlySplits = [];
  const indexFilter =
    Array.isArray(splitIndices) && splitIndices.length > 0
      ? new Set(splitIndices.map((n) => Number(n)).filter((n) => Number.isFinite(n)))
      : null;

  if (splits.length > 0) {
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const tenders = resolveSplitTenders(split);
      const cash = tenders.cash;
      const card = tenders.card;
      const gift = tenders.giftCard;
      const splitTip = r2(split.tipAmount);
      const shouldStrip = !indexFilter || indexFilter.has(i);

      if (!shouldStrip) {
        remainingTip = r2(remainingTip + splitTip);
        nextSplits.push(split);
        continue;
      }

      // Only pure cash seats may be removed — never card or cash+card.
      if (cash > 0 && card <= 0 && gift <= 0) {
        removedCash = r2(removedCash + cash);
        droppedCashOnlySplits.push(split);
        continue;
      }

      // Card, gift, or cash+card — keep untouched.
      remainingTip = r2(remainingTip + splitTip);
      nextSplits.push(split);
    }

    order.paymentSplits = nextSplits;

    // Seats only covered by dropped cash-only splits → remove those items.
    const remainingSeatKeys = new Set();
    for (const s of nextSplits) {
      for (const k of seatsCoveredBySplit(s)) remainingSeatKeys.add(k);
    }
    const seatsToRemove = new Set();
    for (const s of droppedCashOnlySplits) {
      for (const k of seatsCoveredBySplit(s)) {
        if (!remainingSeatKeys.has(k)) seatsToRemove.add(k);
      }
    }

    if (seatsToRemove.size > 0) {
      const allItems = Array.isArray(order.items)
        ? order.items.map(itemToPlain)
        : [];
      const remainingItems = allItems.filter((it) => {
        const k = seatKey(normalizeSeatNumber(it?.seatNumber ?? it?.seat));
        return !seatsToRemove.has(k);
      });
      if (remainingItems.length !== allItems.length && remainingItems.length > 0) {
        const totals = proportionalOrderTotalsForItems(
          {
            items: allItems,
            subTotal: order.subTotal,
            discountTotal: order.discountTotal,
            taxTotal: order.taxTotal,
            serviceChargeTotal: order.serviceChargeTotal,
            totalAmount: order.totalAmount,
            taxBreakdown: order.taxBreakdown,
          },
          remainingItems
        );
        order.items = remainingItems;
        order.subTotal = totals.subTotal;
        order.discountTotal = totals.discountTotal;
        order.taxTotal = totals.taxTotal;
        order.serviceChargeTotal = totals.serviceChargeTotal;
        order.totalAmount = totals.totalAmount;
        order.taxBreakdown = totals.taxBreakdown;
        order.markModified?.("items");
        order.markModified?.("taxBreakdown");
      } else if (remainingItems.length === 0) {
        // Should not wipe entire order if card splits remain — keep items.
      } else {
        order.items = remainingItems;
        order.markModified?.("items");
      }

      // Drop released seats that were cash-only seats we removed.
      if (Array.isArray(order.releasedSeats) && order.releasedSeats.length) {
        order.releasedSeats = order.releasedSeats.filter((s) => {
          const k = seatKey(normalizeSeatNumber(s));
          return !seatsToRemove.has(k);
        });
        order.markModified?.("releasedSeats");
      }
    }

    // Re-sum cash/card from remaining splits (partial seat deletes may leave cash).
    let cashSum = 0;
    let cardSum = 0;
    let hasExplicitCard = false;
    for (const s of nextSplits) {
      const t = resolveSplitTenders(s);
      cashSum = r2(cashSum + t.cash);
      if (s.cardAmount != null) {
        hasExplicitCard = true;
        cardSum = r2(cardSum + r2(s.cardAmount));
      } else if (t.card > 0) {
        hasExplicitCard = true;
        cardSum = r2(cardSum + t.card);
      }
    }
    order.cashAmount = cashSum;
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
            .map((s) =>
              s.tipMethod || (isCashPaymentMethod(s.method) ? "Cash" : "Card")
            )
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
  order.markModified?.("paymentSplits");
  return { removedCash, remainingTip };
}

function normalizeSplitIndexSet(splitIndices) {
  if (!Array.isArray(splitIndices) || splitIndices.length === 0) return null;
  const set = new Set(
    splitIndices.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
  );
  return set.size > 0 ? set : null;
}

function printJobMatchesSplitIndices(job, indexSet) {
  if (!indexSet) return true;
  const idx = Number(job?.metadata?.splitIndex);
  // Receipt metadata uses 1-based splitIndex.
  if (!Number.isFinite(idx) || idx < 1) return false;
  return indexSet.has(idx - 1);
}

async function findCashReceiptPrintJobs(
  session,
  { restaurantId, orderId, splitIndices = null }
) {
  let query = PrintJob.find({
    orderId,
    restaurantId,
    printType: "RECEIPT",
  }).select("_id metadata isActive");
  if (session) query = query.session(session);
  const jobs = await query.lean();
  const indexSet = normalizeSplitIndexSet(splitIndices);
  return (jobs || []).filter((job) => {
    if (!isCashOnlyReceiptPrintMeta(job.metadata)) return false;
    return printJobMatchesSplitIndices(job, indexSet);
  });
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
async function scrubMixedReceiptCashMeta(
  session,
  { restaurantId, orderId, splitIndices = null }
) {
  let query = PrintJob.find({
    orderId,
    restaurantId,
    printType: "RECEIPT",
    isActive: { $ne: false },
  }).select("_id metadata");
  if (session) query = query.session(session);
  const jobs = await query;
  const indexSet = normalizeSplitIndexSet(splitIndices);
  const hideIds = [];
  for (const job of jobs) {
    if (indexSet && !printJobMatchesSplitIndices(job, indexSet)) continue;
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
 * @param {{ splitIndices?: number[]|null }} [opts] — optional 0-based pure-cash
 *   split indexes. Omit to strip every pure-cash seat. Card and cash+card are never removed.
 */
export async function softRemoveCashTender({
  restaurantId,
  orderId,
  actor,
  reason = null,
  splitIndices = null,
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

    assertRemovableCashTender(order);

    const splits = Array.isArray(order.paymentSplits)
      ? order.paymentSplits
      : [];
    const indexSet = normalizeSplitIndexSet(splitIndices);
    // Default: all pure-cash seats. Never include card or cash+card.
    const selectedIndices = indexSet
      ? [...indexSet]
      : splits
          .map((s, i) => (isPureCashSplit(s) ? i : -1))
          .filter((i) => i >= 0);

    if (!selectedIndices.length) {
      const err = new Error(
        "Select at least one pure cash seat to remove (card and cash+card cannot be deleted)"
      );
      err.status = 400;
      throw err;
    }

    for (const idx of selectedIndices) {
      const split = splits[idx];
      if (!split) {
        const err = new Error(`Payment split #${idx + 1} was not found`);
        err.status = 400;
        throw err;
      }
      if (!isPureCashSplit(split)) {
        const err = new Error(
          `Payment split #${idx + 1} is not pure cash and cannot be removed`
        );
        err.status = 400;
        throw err;
      }
    }

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

    const isFirstRemoval = !order.cashTenderRemovedAt;
    const liveBefore = buildRemovedCashSnapshot(order);
    // Keep the original pre-first-removal snapshot so restore can rebuild any seat.
    const existingSnap =
      order.removedCashSnapshot && typeof order.removedCashSnapshot === "object"
        ? order.removedCashSnapshot
        : null;
    const baseSnap = isFirstRemoval || !existingSnap ? liveBefore : existingSnap;
    const removedAt = new Date();

    const cashJobs = await findCashReceiptPrintJobs(session, {
      restaurantId,
      orderId: order._id,
      splitIndices: selectedIndices,
    });

    const orderTotalsForEntries = {
      subTotal: liveBefore.subTotal,
      discountTotal: liveBefore.discountTotal,
      taxTotal: liveBefore.taxTotal,
      serviceChargeTotal: liveBefore.serviceChargeTotal,
      totalAmount: liveBefore.totalAmount,
      taxBreakdown: liveBefore.taxBreakdown,
    };

    const originalSplits = Array.isArray(baseSnap.paymentSplits)
      ? baseSnap.paymentSplits
      : liveBefore.paymentSplits;

    const currentToOriginalMap = [];
    if (isFirstRemoval || !baseSnap.removedSplitIndices) {
      for (let i = 0; i < originalSplits.length; i++) currentToOriginalMap.push(i);
    } else {
      const removedSet = new Set(baseSnap.removedSplitIndices);
      let cIdx = 0;
      for (let origIdx = 0; origIdx < originalSplits.length; origIdx++) {
        if (!removedSet.has(origIdx)) {
          currentToOriginalMap[cIdx] = origIdx;
          cIdx++;
        }
      }
    }

    const newEntries = selectedIndices.map((idx) => {
      const split = liveBefore.paymentSplits[idx];
      const jobsForSplit = cashJobs.filter((job) => {
        const si = Number(job?.metadata?.splitIndex);
        return Number.isFinite(si) && si === idx + 1;
      });
      return buildRemovedCashEntry({
        split,
        allItems: liveBefore.items,
        orderTotals: orderTotalsForEntries,
        removedAt,
        cashPrintJobIds: jobsForSplit.map((j) => j._id),
        entryId: makeCashEntryId(idx),
        originalSplitIndex: currentToOriginalMap[idx],
      });
    });

    let cashPrintJobIds = cashJobs.map((j) => j._id);

    const { removedCash } = applyCashTenderRemoval(order, {
      splitIndices: selectedIndices,
    });

    if (removedCash <= 0) {
      const err = new Error("No cash tender was removed from the selected splits");
      err.status = 400;
      throw err;
    }

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
      splitIndices: selectedIndices,
    });
    const newJobIds = [
      ...cashPrintJobIds.map(String),
      ...(scrubHiddenIds || []).map(String),
    ];
    const prevJobIds = Array.isArray(baseSnap.cashPrintJobIds)
      ? baseSnap.cashPrintJobIds.map(String)
      : [];
    cashPrintJobIds = [...new Set([...prevJobIds, ...newJobIds])];

    const prevEntries = Array.isArray(baseSnap.removedCashEntries)
      ? baseSnap.removedCashEntries
      : listRemovedCashEntries({
          removedCashSnapshot: baseSnap,
          cashTenderRemovedAt: order.cashTenderRemovedAt,
        });
    const nextEntries = [...prevEntries, ...newEntries];
    const prevRemoved = r2(baseSnap.removedCash);

    // Map removed seats onto original snapshot split indexes (stable for detail/legacy).
    const newOriginalIndices = selectedIndices.map((idx) => currentToOriginalMap[idx]);
    const prevOriginalIndices = baseSnap.removedSplitIndices || [];
    const originalIndices = [...new Set([...prevOriginalIndices, ...newOriginalIndices])].filter((i) => i >= 0);

    order.removedCashSnapshot = {
      ...baseSnap,
      // Always retain original payment/items from first removal for restore.
      cashAmount: baseSnap.cashAmount ?? liveBefore.cashAmount,
      cardAmount: baseSnap.cardAmount ?? liveBefore.cardAmount,
      paymentMethod: baseSnap.paymentMethod ?? liveBefore.paymentMethod,
      tipAmount: baseSnap.tipAmount ?? liveBefore.tipAmount,
      tipMethod: baseSnap.tipMethod ?? liveBefore.tipMethod,
      paymentSplits: Array.isArray(baseSnap.paymentSplits)
        ? baseSnap.paymentSplits
        : liveBefore.paymentSplits,
      items: Array.isArray(baseSnap.items) ? baseSnap.items : liveBefore.items,
      cashPrintJobIds,
      removedCash: r2(prevRemoved + removedCash),
      removedSplitIndices: [...new Set(originalIndices)],
      removedCashEntries: nextEntries,
    };
    // Mixed paths require markModified or Mongoose may skip persisting the snapshot.
    order.markModified("removedCashSnapshot");
    order.markModified("paymentSplits");
    if (isFirstRemoval) {
      order.cashTenderRemovedAt = removedAt;
      order.cashTenderRemovedBy = actor.actorId;
      order.cashTenderRemovalReason = reason || null;
    } else {
      // Bump timestamp so Deleted list reflects the latest cash seat removal.
      order.cashTenderRemovedAt = removedAt;
      if (reason) order.cashTenderRemovalReason = reason;
    }

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
      previousValue: liveBefore,
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
        splitIndices: selectedIndices,
      },
      reason: reason || "Admin soft-remove cash tender",
      timestamp: new Date(),
    });

    return {
      order: order.toObject(),
      mode: "cash_tender",
      removedCash,
      splitIndices: selectedIndices,
    };
  });
}

/**
 * Restore previously soft-removed pure-cash seat(s) on an active order.
 * @param {{ entryIds?: string[]|null }} [opts] — restore only these removed seats;
 *   omit / empty means restore all remaining removed cash seats.
 */
export async function restoreCashTender({
  restaurantId,
  orderId,
  actor,
  entryIds = null,
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

    const allEntries = listRemovedCashEntries({
      removedCashSnapshot: snap,
      cashTenderRemovedAt: order.cashTenderRemovedAt,
    });
    const idFilter =
      Array.isArray(entryIds) && entryIds.length > 0
        ? new Set(entryIds.map(String))
        : null;
    const toRestore = idFilter
      ? allEntries.filter((e) => idFilter.has(String(e.entryId)))
      : allEntries;
    if (!toRestore.length) {
      const err = new Error("Select at least one cash seat to restore");
      err.status = 400;
      throw err;
    }
    const remaining = allEntries.filter(
      (e) => !toRestore.some((t) => String(t.entryId) === String(e.entryId))
    );

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

    const restoreJobIds = [
      ...new Set(
        toRestore.flatMap((e) =>
          Array.isArray(e.cashPrintJobIds) ? e.cashPrintJobIds.map(String) : []
        )
      ),
    ];

    if (remaining.length === 0) {
      applyFullCashSnapshotToOrder(order, snap);
      order.cashTenderRemovedAt = null;
      order.cashTenderRemovedBy = null;
      order.cashTenderRemovalReason = null;
      order.removedCashSnapshot = null;
      order.markModified("removedCashSnapshot");
    } else {
      // Rebuild live order = original snapshot minus seats still removed.
      applyFullCashSnapshotToOrder(order, snap);
      const stripIndices = remaining
        .map((e) => {
          if (e.originalSplitIndex != null && e.originalSplitIndex >= 0) {
            return e.originalSplitIndex;
          }
          return findSplitIndexBySeats(order.paymentSplits, e.seatNumbers);
        })
        .filter((i) => i >= 0);
      applyCashTenderRemoval(order, { splitIndices: stripIndices });
      const remainingCash = r2(
        remaining.reduce((sum, e) => sum + r2(e.removedCash), 0)
      );
      const remainingJobIds = [
        ...new Set(
          remaining.flatMap((e) =>
            Array.isArray(e.cashPrintJobIds) ? e.cashPrintJobIds.map(String) : []
          )
        ),
      ];
      order.removedCashSnapshot = {
        ...snap,
        removedCashEntries: remaining,
        removedCash: remainingCash,
        cashPrintJobIds: remainingJobIds,
        removedSplitIndices: stripIndices,
      };
      order.markModified("removedCashSnapshot");
      // Keep cashTenderRemovedAt — other cash seats still deleted.
    }

    await order.save(sessionOpts(session));

    if (restoreJobIds.length) {
      await setPrintJobsActiveByIds(session, {
        ids: restoreJobIds,
        isActive: true,
      });
    }

    await syncPaymentCompletedNotificationsFromOrder(session, {
      restaurantId,
      orderId: order._id,
      order,
      cashTenderRemoved: remaining.length > 0,
    });

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
        restoredEntryIds: toRestore.map((e) => e.entryId),
        remainingEntryIds: remaining.map((e) => e.entryId),
      },
      reason: "Admin restore cash tender",
      timestamp: new Date(),
    });

    return {
      order: order.toObject(),
      mode: "cash_tender",
      restoredEntryIds: toRestore.map((e) => e.entryId),
      remainingEntryIds: remaining.map((e) => e.entryId),
    };
  });
}

/**
 * Permanently discard soft-removed cash tender history (order stays as card/gift-only).
 * @param {{ entryIds?: string[]|null }} [opts] — permanently clear only these seats.
 */
export async function permanentlyDeleteCashTender({
  restaurantId,
  orderId,
  actor,
  entryIds = null,
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
    const allEntries = listRemovedCashEntries({
      removedCashSnapshot: snap,
      cashTenderRemovedAt: order.cashTenderRemovedAt,
    });
    const idFilter =
      Array.isArray(entryIds) && entryIds.length > 0
        ? new Set(entryIds.map(String))
        : null;
    const toDelete = idFilter
      ? allEntries.filter((e) => idFilter.has(String(e.entryId)))
      : allEntries;
    if (!toDelete.length) {
      const err = new Error("Select at least one cash seat to permanently delete");
      err.status = 400;
      throw err;
    }
    const remaining = allEntries.filter(
      (e) => !toDelete.some((t) => String(t.entryId) === String(e.entryId))
    );

    const cashPrintJobIds = [
      ...new Set(
        toDelete.flatMap((e) =>
          Array.isArray(e.cashPrintJobIds) ? e.cashPrintJobIds.map(String) : []
        )
      ),
    ];

    if (cashPrintJobIds.length) {
      await PrintJob.deleteMany(
        { _id: { $in: cashPrintJobIds }, restaurantId },
        sessionOpts(session)
      );
    } else if (remaining.length === 0) {
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
      deletedEntryIds: toDelete.map((e) => e.entryId),
    };

    if (remaining.length === 0) {
      order.cashTenderRemovedAt = null;
      order.cashTenderRemovedBy = null;
      order.cashTenderRemovalReason = null;
      order.removedCashSnapshot = null;
    } else {
      order.removedCashSnapshot = {
        ...snap,
        removedCashEntries: remaining,
        removedCash: r2(
          remaining.reduce((sum, e) => sum + r2(e.removedCash), 0)
        ),
        cashPrintJobIds: [
          ...new Set(
            remaining.flatMap((e) =>
              Array.isArray(e.cashPrintJobIds)
                ? e.cashPrintJobIds.map(String)
                : []
            )
          ),
        ],
        removedSplitIndices: remaining
          .map((e) =>
            findSplitIndexBySeats(snap.paymentSplits || [], e.seatNumbers)
          )
          .filter((i) => i >= 0),
      };
      order.markModified("removedCashSnapshot");
    }
    order.markModified("removedCashSnapshot");
    await order.save(sessionOpts(session));

    await writeAudit(session, {
      restaurantId,
      ...actorPayload(actor),
      action: "ORDER_CASH_TENDER_PERMANENTLY_DELETED",
      orderId: order._id,
      previousValue: snapshotAudit,
      newValue: {
        cashTenderPermanentlyDeleted: remaining.length === 0,
        remainingEntryIds: remaining.map((e) => e.entryId),
      },
      reason: "Admin permanent delete cash tender",
      timestamp: new Date(),
    });

    return { snapshot: snapshotAudit, mode: "cash_tender" };
  });
}
