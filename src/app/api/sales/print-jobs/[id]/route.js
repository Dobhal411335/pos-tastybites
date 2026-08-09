import { withAuth } from "@/utils/auth";
import PrintJob from "@/models/PrintJob";
import Order from "@/models/Order";
import Restaurant from "@/models/Restaurant";
import TableSession from "@/models/floor/TableSession";
import Employee from "@/models/employee/Employee";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  SALES_PRINT_ROLES,
  markPrintJobPrinted,
  retryPrintJob,
  assertPrintAdminRole,
} from "@/lib/printing/printJobService";

/**
 * GET /api/sales/print-jobs/[id]
 * Full job + order data for thermal preview (authorized sales/admin only).
 */
export const GET = withAuth(async (request, { params }) => {
  try {
    const denied = assertPrintAdminRole(request.role);
    if (denied) return denied;

    const { id } = await params;
    const job = await PrintJob.findById(id)
      .populate("requestedBy", "firstName lastName name")
      .lean();

    if (!job) {
      return sendError(new Error("Not Found"), "Print job not found", 404);
    }
    if (String(job.restaurantId) !== String(request.restaurant)) {
      return sendError(new Error("Forbidden"), "Access denied", 403);
    }

    const order = await Order.findById(job.orderId).lean();
    const restaurant = await Restaurant.findById(job.restaurantId)
      .select("name phone address email")
      .lean();

    let guestCount = job.metadata?.guestCount ?? null;
    if (guestCount == null && order?.tableSession) {
      const session = await TableSession.findById(order.tableSession)
        .select("guestCount")
        .lean();
      guestCount = session?.guestCount ?? null;
    }

    let serverName = job.metadata?.serverName || null;
    if (!serverName && order?.processedBy) {
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

    return sendSuccess(
      {
        job,
        order,
        restaurant,
        guestCount,
        serverName,
        kotItems: job.metadata?.kotItems || [],
      },
      "Print job retrieved"
    );
  } catch (error) {
    logger.error("Failed to get print job", error);
    return sendError(error, "Failed to get print job", 500);
  }
}, SALES_PRINT_ROLES);

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
      const job = await markPrintJobPrinted(id, {
        restaurantId: request.restaurant,
      });
      return sendSuccess(job, "Print job marked as printed");
    }

    if (action === "retry") {
      const { job, result } = await retryPrintJob(id, {
        runNow: body?.runNow !== false,
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
