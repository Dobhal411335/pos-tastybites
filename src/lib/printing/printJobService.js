import PrintJob from "@/models/PrintJob";
import Order from "@/models/Order";
import { getPrinterAdapter } from "./getPrinterAdapter";
import { logger } from "@/utils/logger";
import { sendError } from "@/utils/errorHandler";
import { createNotification } from "@/lib/notifications/notificationService";

/** Roles that may administer the print queue (not plain floor EMPLOYEE). */
export const SALES_PRINT_ROLES = ["ADMIN", "MANAGER", "SERVER", "BARTENDER"];

const PRINT_ADMIN_ALLOW = new Set([
  "ADMIN",
  "SUPER ADMIN",
  "MANAGER",
  "SERVER",
  "BARTENDER",
  "EMPLOYEE",
  "STAFF",
]);

/**
 * Extra gate: withAuth expands SERVER → EMPLOYEE/STAFF;
 * printer administration stays limited to sales/admin roles.
 */
export function assertPrintAdminRole(role) {
  const upper = (role || "").toUpperCase();
  if (!PRINT_ADMIN_ALLOW.has(upper)) {
    return sendError(
      new Error("Forbidden"),
      "Printer administration requires sales/admin access",
      403
    );
  }
  return null;
}

/**
 * Compact payload for Socket.IO — no sensitive payment details.
 */
export function toPrintJobEventPayload(job, orderNumber) {
  const plain = typeof job.toObject === "function" ? job.toObject() : job;
  return {
    printJobId: String(plain._id),
    orderId: String(plain.orderId),
    orderNumber: orderNumber || plain.metadata?.orderNumber || null,
    printType: plain.printType,
    printerTarget: plain.printerTarget,
    status: plain.status,
    attemptCount: plain.attemptCount || 0,
    createdAt: plain.createdAt,
    errorMessage: plain.errorMessage || null,
    tableNo: plain.metadata?.tableNo || null,
  };
}

function emitPrintEvent(eventName, restaurantId, floorId, payload) {
  if (!global.io) return;
  if (floorId) {
    global.io.to(`floor:${floorId}`).emit(eventName, payload);
  }
  if (restaurantId) {
    global.io.to(`restaurant:${restaurantId}`).emit(eventName, payload);
  }
}

/**
 * Create a PrintJob if one with the same idempotencyKey does not already exist.
 */
export async function createPrintJob({
  restaurantId,
  orderId,
  printType,
  printerTarget,
  requestedBy,
  metadata = {},
  idempotencyKey,
  floorId,
  orderNumber,
}) {
  if (idempotencyKey) {
    const existing = await PrintJob.findOne({ restaurantId, idempotencyKey });
    if (existing) {
      return { job: existing, created: false };
    }
  }

  try {
    const job = await PrintJob.create({
      restaurantId,
      orderId,
      printType,
      printerTarget,
      status: "QUEUED",
      attemptCount: 0,
      requestedBy: requestedBy || null,
      metadata: {
        ...metadata,
        orderNumber: orderNumber || metadata.orderNumber || null,
      },
      idempotencyKey: idempotencyKey || undefined,
    });

    const payload = toPrintJobEventPayload(job, orderNumber);
    emitPrintEvent("NEW_PRINT_JOB", restaurantId, floorId, payload);

    logger.info(
      `PrintJob created: ${job._id} type=${printType} order=${orderNumber || orderId}`
    );

    return { job, created: true };
  } catch (err) {
    // Race on unique idempotencyKey
    if (err?.code === 11000 && idempotencyKey) {
      const existing = await PrintJob.findOne({ restaurantId, idempotencyKey });
      if (existing) return { job: existing, created: false };
    }
    throw err;
  }
}

export async function createKotPrintJob({
  order,
  kotItems,
  requestedBy,
  guestCount,
  serverName,
  restaurantName,
  specialNote,
}) {
  if (!kotItems || kotItems.length === 0) {
    return { job: null, created: false };
  }

  const itemSig = kotItems
    .map((i) => `${i.cartId || i.menuItemId || i.name}:${i.qty}`)
    .sort()
    .join("|");
  const idempotencyKey = `kot:${order._id}:${itemSig}`;

  return createPrintJob({
    restaurantId: order.restaurantId,
    orderId: order._id,
    printType: "KOT",
    printerTarget: "KITCHEN",
    requestedBy,
    floorId: order.floor,
    orderNumber: order.orderNumber,
    idempotencyKey,
    metadata: {
      kotItems,
      specialNote: specialNote || order.specialNote || null,
      guestCount: guestCount ?? null,
      tableNo: order.tableNo || null,
      guestName: order.guestName || null,
      serverName: serverName || null,
      restaurantName: restaurantName || null,
      orderNumber: order.orderNumber,
    },
  });
}

export async function createBarReceiptPrintJob({
  order,
  barItems,
  requestedBy,
  guestCount,
  serverName,
  restaurantName,
  specialNote,
}) {
  if (!barItems || barItems.length === 0) {
    return { job: null, created: false };
  }

  const itemSig = barItems
    .map((i) => `${i.cartId || i.menuItemId || i.name}:${i.qty}`)
    .sort()
    .join("|");
  const idempotencyKey = `bar:${order._id}:${itemSig}`;

  return createPrintJob({
    restaurantId: order.restaurantId,
    orderId: order._id,
    printType: "BAR_RECEIPT",
    printerTarget: "COUNTER",
    requestedBy,
    floorId: order.floor,
    orderNumber: order.orderNumber,
    idempotencyKey,
    metadata: {
      kotItems: barItems,
      barItems,
      specialNote: specialNote || order.specialNote || null,
      guestCount: guestCount ?? null,
      tableNo: order.tableNo || null,
      guestName: order.guestName || null,
      partyName: order.partyName || order.guestName || null,
      serverName: serverName || null,
      restaurantName: restaurantName || null,
      orderNumber: order.orderNumber,
    },
  });
}

export async function createReceiptPrintJob({
  order,
  requestedBy,
  guestCount,
  serverName,
  restaurantName,
}) {
  // One active/success receipt job per paid order (retry reuses FAILED)
  const existing = await PrintJob.findOne({
    orderId: order._id,
    printType: "RECEIPT",
    status: { $in: ["QUEUED", "PRINTING", "PRINTED"] },
  });
  if (existing) {
    return { job: existing, created: false };
  }

  const idempotencyKey = `receipt:${order._id}:paid`;

  return createPrintJob({
    restaurantId: order.restaurantId,
    orderId: order._id,
    printType: "RECEIPT",
    printerTarget: "RECEIPT",
    requestedBy,
    floorId: order.floor,
    orderNumber: order.orderNumber,
    idempotencyKey,
    metadata: {
      guestCount: guestCount ?? null,
      tableNo: order.tableNo || null,
      guestName: order.guestName || null,
      serverName: serverName || null,
      restaurantName: restaurantName || null,
      orderNumber: order.orderNumber,
    },
  });
}

async function persistStatus(job, updates, floorId) {
  Object.assign(job, updates);
  await job.save();

  const orderNumber = job.metadata?.orderNumber;
  const payload = toPrintJobEventPayload(job, orderNumber);
  emitPrintEvent("PRINT_JOB_UPDATED", job.restaurantId, floorId || null, payload);
  return job;
}

/**
 * Run the configured printer adapter against a job (mock today).
 */
export async function executePrintJob(jobId, { simulateFailure = false, restaurantId } = {}) {
  const job = await PrintJob.findById(jobId);
  if (!job) {
    throw Object.assign(new Error("Print job not found"), { statusCode: 404 });
  }
  if (restaurantId && String(job.restaurantId) !== String(restaurantId)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  let floorId = null;
  const order = await Order.findById(job.orderId).lean();
  if (order?.floor) floorId = order.floor;

  await persistStatus(
    job,
    {
      status: "PRINTING",
      startedAt: new Date(),
      attemptCount: (job.attemptCount || 0) + 1,
      errorMessage: null,
    },
    floorId
  );

  const adapter = getPrinterAdapter();
  const result = await adapter.print(job, { simulateFailure, order });

  if (!result.success) {
    await persistStatus(
      job,
      {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: result.error || "Print failed",
      },
      floorId
    );

    try {
      await createNotification({
        restaurantId: job.restaurantId,
        type: "PRINT_FAILED",
        title: "Print Failed",
        message: `${job.printType} print failed for Order #${job.metadata?.orderNumber || order?.orderNumber || ""}`,
        orderId: job.orderId,
        printJobId: job._id,
        floorId,
        metadata: {
          orderNumber: job.metadata?.orderNumber || order?.orderNumber || null,
          printType: job.printType,
          printerTarget: job.printerTarget,
          error: result.error || "Print failed",
        },
      });
    } catch (notifErr) {
      logger.error("Failed to create PRINT_FAILED notification", notifErr);
    }

    return { job, result };
  }

  await persistStatus(
    job,
    {
      status: "PRINTED",
      printedAt: new Date(),
      errorMessage: null,
    },
    floorId
  );

  return { job, result };
}

/**
 * Reset a failed (or any) job back to QUEUED and optionally re-run.
 */
export async function retryPrintJob(jobId, { runNow = true, simulateFailure = false, restaurantId } = {}) {
  const job = await PrintJob.findById(jobId);
  if (!job) {
    throw Object.assign(new Error("Print job not found"), { statusCode: 404 });
  }
  if (restaurantId && String(job.restaurantId) !== String(restaurantId)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  let floorId = null;
  const order = await Order.findById(job.orderId).lean();
  if (order?.floor) floorId = order.floor;

  await persistStatus(
    job,
    {
      status: "QUEUED",
      errorMessage: null,
      startedAt: null,
      printedAt: null,
      failedAt: null,
    },
    floorId
  );

  if (runNow) {
    return executePrintJob(jobId, { simulateFailure, restaurantId });
  }

  return { job, result: { success: true, message: "Requeued" } };
}

export async function markPrintJobPrinted(jobId, { restaurantId } = {}) {
  const job = await PrintJob.findById(jobId);
  if (!job) {
    throw Object.assign(new Error("Print job not found"), { statusCode: 404 });
  }
  if (restaurantId && String(job.restaurantId) !== String(restaurantId)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  let floorId = null;
  const order = await Order.findById(job.orderId).lean();
  if (order?.floor) floorId = order.floor;

  await persistStatus(
    job,
    {
      status: "PRINTED",
      printedAt: new Date(),
      errorMessage: null,
      attemptCount: Math.max(job.attemptCount || 0, 1),
    },
    floorId
  );

  return job;
}
