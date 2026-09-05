import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  SALES_PRINT_ROLES,
  assertPrintAdminRole,
  reprintPrintJob,
} from "@/lib/printing/printJobService";

/**
 * POST /api/sales/print-jobs/[id]/reprint
 * Creates a brand new PrintJob cloned from the specified PrintJob,
 * targeting the same order, printType, and printer config, but with QUEUED status.
 * The original PrintJob is never modified.
 *
 * Headers / body:
 *   - idempotencyKey (string, optional) to prevent duplicate prints
 */
export const POST = withAuth(async (request, { params }) => {
  try {
    const denied = assertPrintAdminRole(request.role);
    if (denied) return denied;

    const { id } = await params;
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const idempotencyKey =
      body?.idempotencyKey ||
      request.headers.get("x-idempotency-key") ||
      null;

    const requestedBy = request.employeeId || request.user?.id || null;

    const { job, created } = await reprintPrintJob(id, {
      requestedBy,
      restaurantId: request.restaurant,
      idempotencyKey,
    });

    return sendSuccess(
      { job, created },
      created ? "Print job queued for reprint" : "Print job already queued",
      created ? 201 : 200
    );
  } catch (error) {
    const status = error.statusCode || 500;
    logger.error("Failed to reprint print job", error);
    return sendError(error, error.message || "Failed to reprint print job", status);
  }
}, SALES_PRINT_ROLES);
