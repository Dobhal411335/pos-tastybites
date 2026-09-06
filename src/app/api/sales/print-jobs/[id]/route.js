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
  assertPrintAdminRole,
} from "@/lib/printing/printJobService";

/** Floor staff + admins — Electron print agent needs job detail for ESC/POS. */
const PRINT_JOB_READ_ROLES = [
  ...SALES_PRINT_ROLES,
  "SUPER ADMIN",
  "EMPLOYEE",
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
    if (String(job.restaurantId) !== String(request.restaurant)) {
      return sendError(new Error("Forbidden"), "Access denied", 403);
    }

    // Fetch Order (with populated references) and Restaurant concurrently in parallel
    const [order, restaurant] = await Promise.all([
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

    const orderWithFloor = order
      ? {
          ...order,
          floorName: floorName || null,
          partyName:
            order.partyName ||
            job.metadata?.partyName ||
            order.guestName ||
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
      const job = await PrintJob.findById(id);
      if (!job) {
        return sendError(new Error("Not Found"), "Print job not found", 404);
      }
      if (String(job.restaurantId) !== String(request.restaurant)) {
        return sendError(new Error("Forbidden"), "Access denied", 403);
      }
      job.status = "CANCELLED";
      await job.save();
      return sendSuccess(job, "Print job cancelled");
    }

    return sendError(new Error("Bad Request"), "Unknown action", 400);
  } catch (error) {
    const status = error.statusCode || 500;
    logger.error("Failed to update print job", error);
    return sendError(error, error.message || "Failed to update print job", status);
  }
}, SALES_PRINT_ROLES);
