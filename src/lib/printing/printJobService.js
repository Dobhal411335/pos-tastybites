import PrintJob from "@/models/PrintJob";
import Order from "@/models/Order";
import PrinterConfig from "@/models/PrinterConfig";
import { getPrinterAdapter } from "./getPrinterAdapter";
import { logger } from "@/utils/logger";
import { sendError } from "@/utils/errorHandler";
import { createNotification } from "@/lib/notifications/notificationService";

/** Roles that may administer the print queue (not plain floor EMPLOYEE). */
export const SALES_PRINT_ROLES = [
  "ADMIN",
  "SUPER ADMIN",
  "MASTER TERMINAL",
  "MANAGER",
  "MANAGER TERMINAL",
  "SERVER",
  "BARTENDER",
  "STAFF",
  "EMPLOYEE",
  "WAIT STAFF",
];

const PRINT_ADMIN_ALLOW = new Set([
  "ADMIN",
  "SUPER ADMIN",
  "MASTER TERMINAL",
  "MANAGER",
  "MANAGER TERMINAL",
  "SERVER",
  "BARTENDER",
  "EMPLOYEE",
  "STAFF",
  "WAIT STAFF",
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
export function toPrintJobEventPayload(job, orderNumber, printerConfig = null) {
  const plain = typeof job.toObject === "function" ? job.toObject() : job;
  const cfg = printerConfig || null;
  return {
    printJobId: String(plain._id),
    orderId: String(plain.orderId),
    orderNumber: orderNumber || plain.metadata?.orderNumber || null,
    printType: plain.printType,
    printerTarget: plain.printerTarget,
    printerId: plain.printerId
      ? String(plain.printerId)
      : cfg?._id
        ? String(cfg._id)
        : null,
    connectionType: cfg?.connectionType || null,
    systemPrinterName: cfg?.systemPrinterName || null,
    status: plain.status,
    attemptCount: plain.attemptCount || 0,
    createdAt: plain.createdAt,
    errorMessage: plain.errorMessage || null,
    tableNo: plain.metadata?.tableNo || null,
    parentPrintJobId: plain.parentPrintJobId
      ? String(plain.parentPrintJobId)
      : null,
    isReprint: Boolean(plain.parentPrintJobId || plain.metadata?.isReprint),
  };
}

async function resolvePrinterConfig(restaurantId, printerTarget) {
  if (!restaurantId || !printerTarget) return null;
  return PrinterConfig.findOne({
    restaurant: restaurantId,
    target: printerTarget,
    enabled: true,
  }).lean();
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

  const printerConfig = await resolvePrinterConfig(restaurantId, printerTarget);

  try {
    const job = await PrintJob.create({
      restaurantId,
      orderId,
      printType,
      printerTarget,
      printerId: printerConfig?._id || null,
      status: "QUEUED",
      attemptCount: 0,
      requestedBy: requestedBy || null,
      metadata: {
        ...metadata,
        orderNumber: orderNumber || metadata.orderNumber || null,
      },
      idempotencyKey: idempotencyKey || undefined,
    });

    const payload = toPrintJobEventPayload(job, orderNumber, printerConfig);
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
  floorName,
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
      partyName: order.partyName || order.guestName || null,
      floorName: floorName || order.floorName || null,
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
  floorName,
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
      floorName: floorName || order.floorName || null,
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
  floorName,
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
      partyName: order.partyName || order.guestName || null,
      floorName: floorName || order.floorName || null,
      serverName: serverName || null,
      restaurantName: restaurantName || null,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod || null,
      cashAmount: order.cashAmount ?? null,
      cardAmount: order.cardAmount ?? null,
      giftcardUsedAmount: order.giftcardUsedAmount ?? null,
      tipAmount: order.tipAmount ?? null,
      tipMethod: order.tipMethod ?? null,
      serviceChargeTotal: order.serviceChargeTotal ?? null,
      serviceChargeName: order.serviceChargeName ?? null,
      discountTotal: order.discountTotal ?? null,
      discountPercent: order.discountPercent ?? null,
      subTotal: order.subTotal ?? null,
      taxTotal: order.taxTotal ?? null,
      totalAmount: order.totalAmount ?? null,
    },
  });
}

async function persistStatus(job, updates, floorId) {
  Object.assign(job, updates);
  await job.save();

  const orderNumber = job.metadata?.orderNumber;
  let printerConfig = null;
  if (job.printerId) {
    printerConfig = await PrinterConfig.findById(job.printerId).lean();
  } else if (job.printerTarget) {
    printerConfig = await resolvePrinterConfig(job.restaurantId, job.printerTarget);
  }
  const payload = toPrintJobEventPayload(job, orderNumber, printerConfig);
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
export async function retryPrintJob(jobId, { runNow = false, simulateFailure = false, restaurantId } = {}) {
  const job = await PrintJob.findById(jobId);
  if (!job) {
    throw Object.assign(new Error("Print job not found"), { statusCode: 404 });
  }
  if (restaurantId && String(job.restaurantId) !== String(restaurantId)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
  if (job.status === "PRINTED") {
    throw Object.assign(
      new Error("Cannot retry a printed job. Use 'Print Again' to create a new print job."),
      { statusCode: 400 }
    );
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

  // Notify hardware agents (print-bridge / Electron) — same event as create
  const printerConfig = job.printerId
    ? await PrinterConfig.findById(job.printerId).lean()
    : await resolvePrinterConfig(job.restaurantId, job.printerTarget);
  emitPrintEvent(
    "NEW_PRINT_JOB",
    job.restaurantId,
    floorId || null,
    toPrintJobEventPayload(job, job.metadata?.orderNumber, printerConfig),
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

/**
 * Create a brand new PrintJob from an existing PrintJob, leaving the original unchanged.
 */
export async function reprintPrintJob(
  jobId,
  { requestedBy, restaurantId, idempotencyKey } = {}
) {
  const original = await PrintJob.findById(jobId);
  if (!original) {
    throw Object.assign(new Error("Print job not found"), { statusCode: 404 });
  }
  if (restaurantId && String(original.restaurantId) !== String(restaurantId)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  // Idempotency check if caller passed an idempotencyKey
  if (idempotencyKey) {
    const existing = await PrintJob.findOne({
      restaurantId: original.restaurantId,
      idempotencyKey,
    });
    if (existing) {
      return { job: existing, created: false };
    }
  }

  const order = await Order.findById(original.orderId).lean();
  const floorId = order?.floor || null;

  // Resolve printer configuration: prefer original printer if still enabled, else resolve for target
  let printerConfig = null;
  if (original.printerId) {
    printerConfig = await PrinterConfig.findOne({
      _id: original.printerId,
      restaurant: original.restaurantId,
      enabled: true,
    }).lean();
  }
  if (!printerConfig && original.printerTarget) {
    printerConfig = await resolvePrinterConfig(
      original.restaurantId,
      original.printerTarget
    );
  }

  const orderNumber =
    original.metadata?.orderNumber || order?.orderNumber || null;

  try {
    const newJob = await PrintJob.create({
      restaurantId: original.restaurantId,
      orderId: original.orderId,
      printType: original.printType,
      printerTarget: original.printerTarget,
      printerId: printerConfig?._id || original.printerId || null,
      status: "QUEUED",
      attemptCount: 0,
      requestedBy: requestedBy || null,
      parentPrintJobId: original._id,
      metadata: {
        ...(original.metadata || {}),
        orderNumber,
        isReprint: true,
        parentPrintJobId: String(original._id),
        paymentMethod: original.metadata?.paymentMethod || order?.paymentMethod || null,
        cashAmount: original.metadata?.cashAmount ?? order?.cashAmount ?? null,
        cardAmount: original.metadata?.cardAmount ?? order?.cardAmount ?? null,
        giftcardUsedAmount: original.metadata?.giftcardUsedAmount ?? order?.giftcardUsedAmount ?? null,
        tipAmount: original.metadata?.tipAmount ?? order?.tipAmount ?? null,
        tipMethod: original.metadata?.tipMethod ?? order?.tipMethod ?? null,
        serviceChargeTotal: original.metadata?.serviceChargeTotal ?? order?.serviceChargeTotal ?? null,
        serviceChargeName: original.metadata?.serviceChargeName ?? order?.serviceChargeName ?? null,
        discountTotal: original.metadata?.discountTotal ?? order?.discountTotal ?? null,
        discountPercent: original.metadata?.discountPercent ?? order?.discountPercent ?? null,
        subTotal: original.metadata?.subTotal ?? order?.subTotal ?? null,
        taxTotal: original.metadata?.taxTotal ?? order?.taxTotal ?? null,
        totalAmount: original.metadata?.totalAmount ?? order?.totalAmount ?? null,
      },
      idempotencyKey: idempotencyKey || undefined,
    });

    const payload = toPrintJobEventPayload(newJob, orderNumber, printerConfig);
    emitPrintEvent("NEW_PRINT_JOB", original.restaurantId, floorId, payload);

    logger.info(
      `Reprint PrintJob created: ${newJob._id} from parent=${original._id} type=${newJob.printType} order=${orderNumber || original.orderId}`
    );

    return { job: newJob, created: true };
  } catch (err) {
    if (err?.code === 11000 && idempotencyKey) {
      const existing = await PrintJob.findOne({
        restaurantId: original.restaurantId,
        idempotencyKey,
      });
      if (existing) return { job: existing, created: false };
    }
    throw err;
  }
}

/**
 * Reprint a ticket for an order.
 * If a prior PrintJob exists for this order & printType, it will clone and reprint it.
 * If none exists, it will construct a new PrintJob marked with isReprint: true.
 */
export async function reprintOrderTicket({
  orderId,
  printType = "RECEIPT",
  kotItems = [],
  guestCount,
  serverName,
  specialNote,
  restaurantName,
  requestedBy,
  restaurantId,
  idempotencyKey,
}) {
  const normalizedType = (() => {
    const s = String(printType || "").toUpperCase();
    if (s === "CUSTOMER" || s === "RECEIPT") return "RECEIPT";
    if (s === "BAR" || s === "BAR_RECEIPT") return "BAR_RECEIPT";
    return "KOT";
  })();

  // 1. Try to find the latest existing print job for this order and print type
  const existingJob = await PrintJob.findOne({
    restaurantId,
    orderId,
    printType: normalizedType,
  }).sort({ createdAt: -1 });

  if (existingJob) {
    return reprintPrintJob(existingJob._id, {
      requestedBy,
      restaurantId,
      idempotencyKey,
    });
  }

  // 2. If no prior PrintJob exists, fetch the order document to build a new print job marked as reprint
  const order = await Order.findById(orderId).lean();
  if (!order) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }

  const printerTarget =
    normalizedType === "RECEIPT"
      ? "RECEIPT"
      : normalizedType === "BAR_RECEIPT"
        ? "COUNTER"
        : "KITCHEN";

  const printerConfig = await resolvePrinterConfig(restaurantId, printerTarget);
  const floorId = order.floor || null;
  const orderNumber = order.orderNumber || null;

  const metadata = {
    orderNumber,
    isReprint: true,
    tableNo: order.tableNo || null,
    guestName: order.guestName || null,
    partyName: order.partyName || order.guestName || null,
    floorName: order.floorName || null,
    serverName: serverName || null,
    restaurantName: restaurantName || null,
    guestCount: guestCount ?? order.guestCount ?? null,
    specialNote: specialNote || order.specialNote || null,
    paymentMethod: order.paymentMethod || null,
    cashAmount: order.cashAmount ?? null,
    cardAmount: order.cardAmount ?? null,
    giftcardUsedAmount: order.giftcardUsedAmount ?? null,
    tipAmount: order.tipAmount ?? null,
    tipMethod: order.tipMethod ?? null,
    serviceChargeTotal: order.serviceChargeTotal ?? null,
    serviceChargeName: order.serviceChargeName ?? null,
    discountTotal: order.discountTotal ?? null,
    discountPercent: order.discountPercent ?? null,
    subTotal: order.subTotal ?? null,
    taxTotal: order.taxTotal ?? null,
    totalAmount: order.totalAmount ?? null,
  };

  const rawItems =
    Array.isArray(kotItems) && kotItems.length > 0 ? kotItems : order.items || [];
  if (normalizedType === "KOT") {
    metadata.kotItems = rawItems;
  } else if (normalizedType === "BAR_RECEIPT") {
    metadata.barItems = rawItems;
    metadata.kotItems = rawItems;
  }

  try {
    const job = await PrintJob.create({
      restaurantId,
      orderId: order._id,
      printType: normalizedType,
      printerTarget,
      printerId: printerConfig?._id || null,
      status: "QUEUED",
      attemptCount: 0,
      requestedBy: requestedBy || null,
      metadata,
      idempotencyKey: idempotencyKey || undefined,
    });

    const payload = toPrintJobEventPayload(job, orderNumber, printerConfig);
    emitPrintEvent("NEW_PRINT_JOB", restaurantId, floorId, payload);

    logger.info(
      `Reprint PrintJob created for order: ${job._id} type=${job.printType} order=${orderNumber || order._id}`
    );

    return { job, created: true };
  } catch (err) {
    if (err?.code === 11000 && idempotencyKey) {
      const existing = await PrintJob.findOne({
        restaurantId,
        idempotencyKey,
      });
      if (existing) return { job: existing, created: false };
    }
    throw err;
  }
}

