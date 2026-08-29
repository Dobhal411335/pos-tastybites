import { withAuth } from "@/utils/auth";
import PrintJob from "@/models/PrintJob";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  markPrintJobPrinted,
  toPrintJobEventPayload,
} from "@/lib/printing/printJobService";

const EMPLOYEE_ROLES = [
  "ADMIN",
  "SUPER ADMIN",
  "MANAGER",
  "SERVER",
  "BARTENDER",
  "EMPLOYEE",
  "STAFF",
];

/**
 * POST /api/sales/print-jobs/[id]/complete
 * Electron print agent reports hardware print result.
 * Body: { success: boolean, errorMessage?: string }
 */
export const POST = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const success = !!body?.success;

    const job = await PrintJob.findById(id);
    if (!job) {
      return sendError(new Error("Not Found"), "Print job not found", 404);
    }
    if (String(job.restaurantId) !== String(request.restaurant)) {
      return sendError(new Error("Forbidden"), "Access denied", 403);
    }

    if (success) {
      const updated = await markPrintJobPrinted(id, {
        restaurantId: request.restaurant,
      });
      return sendSuccess(updated, "Print job marked as printed");
    }

    job.status = "FAILED";
    job.failedAt = new Date();
    job.errorMessage = body?.errorMessage || "Electron print failed";
    job.attemptCount = (job.attemptCount || 0) + 1;
    await job.save();

    const payload = toPrintJobEventPayload(job, job.metadata?.orderNumber);
    if (global.io) {
      global.io
        .to(`restaurant:${job.restaurantId}`)
        .emit("PRINT_JOB_UPDATED", payload);
    }

    return sendSuccess(job, "Print job marked as failed");
  } catch (error) {
    const status = error.statusCode || 500;
    logger.error("Failed to complete print job", error);
    return sendError(error, error.message || "Failed to complete print job", status);
  }
}, EMPLOYEE_ROLES);
