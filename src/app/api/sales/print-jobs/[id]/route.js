import { withAuth } from "@/utils/auth";
import PrintJob from "@/models/PrintJob";
import Order from "@/models/Order";
import Restaurant from "@/models/Restaurant";
import TableSession from "@/models/floor/TableSession";
import Employee from "@/models/employee/Employee";
import Floor from "@/models/floor/Floor";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  SALES_PRINT_ROLES,
  retryPrintJob,
  cancelPrintJob,
  assertPrintAdminRole,
  toPrintJobEventPayload,
  expireStaleQueuedPrintJobs,
} from "@/lib/printing/printJobService";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  todayRestaurantISO,
} from "@/lib/restaurantTime";
import { businessDateBounds, r2 } from "@/lib/eod/eodHelpers";
import { healReceiptPrintJobsAfterCashRemoval } from "@/lib/orders/orderLifecycle";
import {
  isCashOnlyReceiptPrintMeta,
  stripCashFromReceiptMetadata,
} from "@/lib/orders/orderDeleteEligibility";

/** Floor staff + admins — Electron print agent needs job detail for ESC/POS. */
const PRINT_JOB_READ_ROLES = [
  ...SALES_PRINT_ROLES,
  "SUPER ADMIN",
  "Master Terminal",
  "STAFF",
];

/**
 * GET /api/sales/print-jobs/[id]
 * Full job + order data for thermal preview and Electron auto-print.
 */
export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const job = await PrintJob.findById(id)
      .populate("requestedBy", "firstName lastName name")
      .populate("parentPrintJobId", "status printType createdAt attemptCount")
      .populate("printerId", "name target connectionType systemPrinterName host port location enabled")
      .lean();

    if (!job) {
      return sendError(new Error("Not Found"), "Print job not found", 404);
    }
    if (job.isActive === false) {
      return sendError(new Error("Not Found"), "Print job not found", 404);
    }
    if (String(job.restaurantId) !== String(request.restaurant)) {
      return sendError(new Error("Forbidden"), "Access denied", 403);
    }

    // Fetch Order (with populated references) and Restaurant concurrently in parallel
    let [order, restaurant] = await Promise.all([
      job.orderId
        ? Order.findById(job.orderId)
            .populate("tableSession", "guestCount")
            .populate("processedBy", "firstName lastName name")
            .populate("floor", "name")
            .lean()
        : null,
      Restaurant.findById(job.restaurantId)
        .select("name phone address email")
        .lean(),
    ]);

    // Self-heal: if order cash was stripped, hide cash-only slips / scrub mixed
    // metadata so print previews no longer show deleted cash.
    const orderCashGone =
      order &&
      (Boolean(order.cashTenderRemovedAt) ||
        (r2(order.cashAmount) <= 0 &&
          (r2(order.cardAmount) > 0 || r2(order.giftcardUsedAmount) > 0)));
    const metaStillHasCash =
      job.printType === "RECEIPT" &&
      (isCashOnlyReceiptPrintMeta(job.metadata) ||
        Boolean(stripCashFromReceiptMetadata(job.metadata)));

    if (orderCashGone && metaStillHasCash && job.orderId) {
      await healReceiptPrintJobsAfterCashRemoval({
        restaurantId: request.restaurant,
        orderId: job.orderId,
      });
      const refreshed = await PrintJob.findById(id)
        .populate("requestedBy", "firstName lastName name")
        .populate("parentPrintJobId", "status printType createdAt attemptCount")
        .populate(
          "printerId",
          "name target connectionType systemPrinterName host port location enabled"
        )
        .lean();
      if (!refreshed || refreshed.isActive === false) {
        return sendError(new Error("Not Found"), "Print job not found", 404);
      }
      Object.assign(job, refreshed);
    }

    // Heal stale metadata.orderNumber after business-day renumber.
    if (
      order?.orderNumber &&
      job.metadata?.orderNumber &&
      String(job.metadata.orderNumber) !== String(order.orderNumber)
    ) {
      await PrintJob.updateOne(
        { _id: job._id },
        { $set: { "metadata.orderNumber": order.orderNumber } }
      );
      job.metadata = {
        ...(job.metadata || {}),
        orderNumber: order.orderNumber,
      };
    }

    let guestCount = job.metadata?.guestCount ?? null;
    if (guestCount == null && order?.tableSession) {
      if (typeof order.tableSession === "object" && order.tableSession.guestCount != null) {
        guestCount = order.tableSession.guestCount;
      } else {
        const session = await TableSession.findById(order.tableSession)
          .select("guestCount")
          .lean();
        guestCount = session?.guestCount ?? null;
      }
    }

    let serverName = job.metadata?.serverName || null;
    if (!serverName && order?.processedBy) {
      if (typeof order.processedBy === "object") {
        serverName =
          order.processedBy.name ||
          [order.processedBy.firstName, order.processedBy.lastName]
            .filter(Boolean)
            .join(" ") ||
          null;
      } else {
        const emp = await Employee.findById(order.processedBy)
          .select("firstName lastName name")
          .lean();
        if (emp) {
          serverName =
            emp.name ||
            [emp.firstName, emp.lastName].filter(Boolean).join(" ") ||
            null;
        }
      }
    }

    let floorName =
      job.metadata?.floorName || order?.floorName || null;
    if (!floorName && order?.floor) {
      if (typeof order.floor === "object" && order.floor?.name) {
        floorName = order.floor.name;
      } else {
        const floor = await Floor.findById(order.floor).select("name").lean();
        floorName = floor?.name || null;
      }
    }

    const isSplitReceipt = Boolean(job.metadata?.isSplitReceipt);
    const splitPartyName = String(
      job.metadata?.splitName ||
        job.metadata?.partyName ||
        job.metadata?.guestName ||
        "",
    ).trim();

    const orderWithFloor = order
      ? {
          ...order,
          floorName: floorName || null,
          // Split receipts must show the payer name from this job, not the
          // order-level party (table/seat default or a later payer's name).
          partyName: isSplitReceipt
            ? splitPartyName ||
              order.partyName ||
              order.guestName ||
              null
            : order.partyName ||
              job.metadata?.partyName ||
              order.guestName ||
              null,
          guestName: isSplitReceipt
            ? splitPartyName || order.guestName || order.partyName || null
            : order.guestName || order.partyName || null,
          paymentMethod:
            order.paymentMethod ||
            job.metadata?.paymentMethod ||
            null,
          cashAmount:
            order.cashAmount ??
            job.metadata?.cashAmount ??
            null,
          cardAmount:
            order.cardAmount ??
            job.metadata?.cardAmount ??
            null,
          giftcardUsedAmount:
            order.giftcardUsedAmount ??
            job.metadata?.giftcardUsedAmount ??
            null,
          tipAmount:
            order.tipAmount ??
            job.metadata?.tipAmount ??
            null,
          tipMethod:
            order.tipMethod ??
            job.metadata?.tipMethod ??
            null,
          serviceChargeTotal:
            order.serviceChargeTotal ??
            job.metadata?.serviceChargeTotal ??
            null,
          serviceChargeName:
            order.serviceChargeName ??
            job.metadata?.serviceChargeName ??
            null,
          discountTotal:
            order.discountTotal ??
            job.metadata?.discountTotal ??
            null,
          discountPercent:
            order.discountPercent ??
            job.metadata?.discountPercent ??
            null,
          subTotal:
            order.subTotal ??
            job.metadata?.subTotal ??
            null,
          taxTotal:
            order.taxTotal ??
            job.metadata?.taxTotal ??
            null,
          totalAmount:
            order.totalAmount ??
            job.metadata?.totalAmount ??
            null,
        }
      : order;

    return sendSuccess(
      {
        job,
        order: orderWithFloor,
        restaurant,
        guestCount,
        serverName,
        kotItems: job.metadata?.kotItems || job.metadata?.barItems || [],
      },
      "Print job retrieved"
    );
  } catch (error) {
    logger.error("Failed to get print job", error);
    return sendError(error, "Failed to get print job", 500);
  }
}, PRINT_JOB_READ_ROLES);

/**
 * PATCH /api/sales/print-jobs/[id]
 * Actions: mark_printed | retry | cancel
 */
export const PATCH = withAuth(async (request, { params }) => {
  try {
    const denied = assertPrintAdminRole(request.role);
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const action = body?.action;

    if (action === "mark_printed") {
      return sendError(
        new Error("Forbidden"),
        "Manually marking jobs as printed is disabled. Status updates must be confirmed by the print pipeline.",
        403
      );
    }

    if (action === "claim") {
      // Expire prior-day leftovers first; only claim jobs eligible for today.
      const { dayStart } = await expireStaleQueuedPrintJobs(request.restaurant);
      const eligibleAfter =
        dayStart ||
        businessDateBounds(todayRestaurantISO(DEFAULT_RESTAURANT_TIMEZONE))
          .start;

      const claimedJob = await PrintJob.findOneAndUpdate(
        {
          _id: id,
          restaurantId: request.restaurant,
          status: "QUEUED",
          isActive: { $ne: false },
          $expr: {
            $gte: [
              { $ifNull: ["$metadata.requeuedAt", "$createdAt"] },
              eligibleAfter,
            ],
          },
        },
        {
          $set: {
            status: "PRINTING",
            startedAt: new Date(),
          },
          $inc: { attemptCount: 1 },
        },
        { new: true }
      );

      if (!claimedJob) {
        return sendSuccess(
          { claimed: false },
          "Job already claimed, expired, or processed by another device"
        );
      }

      if (global.io) {
        const payload = toPrintJobEventPayload(claimedJob, claimedJob.metadata?.orderNumber);
        global.io
          .to(`restaurant:${claimedJob.restaurantId}`)
          .emit("PRINT_JOB_UPDATED", payload);
      }

      return sendSuccess({ claimed: true, job: claimedJob }, "Print job claimed");
    }

    if (action === "retry") {
      const { job, result } = await retryPrintJob(id, {
        // Default: requeue + emit NEW_PRINT_JOB for print-bridge / Electron.
        // Opt-in runNow uses the server mock/star adapter only.
        runNow: body?.runNow === true,
        simulateFailure: !!body?.simulateFailure,
        restaurantId: request.restaurant,
      });
      return sendSuccess(
        { job, result },
        result?.success ? "Print job retried" : "Print retry failed"
      );
    }

    if (action === "cancel") {
      const job = await cancelPrintJob(id, {
        restaurantId: request.restaurant,
      });
      return sendSuccess(job, "Print job cancelled");
    }

    return sendError(new Error("Bad Request"), "Unknown action", 400);
  } catch (error) {
    const status = error.statusCode || 500;
    logger.error("Failed to update print job", error);
    return sendError(error, error.message || "Failed to update print job", status);
  }
}, SALES_PRINT_ROLES);
