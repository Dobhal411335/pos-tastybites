import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  SALES_PRINT_ROLES,
  assertPrintAdminRole,
  reprintOrderTicket,
  reprintPrintJob,
} from "@/lib/printing/printJobService";

/**
 * POST /api/sales/print-jobs/reprint-ticket
 * Queues a ticket reprint for an order or existing print job to the physical thermal printer.
 *
 * Body:
 *   - jobId (optional string): if reprinting from a known PrintJob ID
 *   - orderId (string): Order ID to reprint ticket for
 *   - printType (string): 'customer' | 'kot' | 'bar' | 'RECEIPT' | 'KOT' | 'BAR_RECEIPT'
 *   - kotItems (optional array): items for KOT / Bar ticket
 *   - guestCount (optional number)
 *   - serverName (optional string)
 *   - specialNote (optional string)
 *   - restaurantName (optional string)
 *   - idempotencyKey (optional string)
 */
export const POST = withAuth(async (request) => {
  try {
    const denied = assertPrintAdminRole(request.role);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const {
      jobId,
      orderId,
      printType,
      kotItems = [],
      guestCount,
      serverName,
      specialNote,
      restaurantName,
    } = body;

    const requestedBy = request.employeeId || request.user?.id || null;
    const idempotencyKey =
      body?.idempotencyKey ||
      request.headers.get("x-idempotency-key") ||
      `reprint:${jobId || orderId}:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (jobId) {
      const { job, created } = await reprintPrintJob(jobId, {
        requestedBy,
        restaurantId: request.restaurant,
        idempotencyKey,
      });
      return sendSuccess(
        { job, created },
        created ? "Print job queued for reprint" : "Print job already queued",
        created ? 201 : 200
      );
    }

    if (!orderId) {
      return sendError(new Error("Bad Request"), "Order ID or Job ID is required to reprint", 400);
    }

    const { job, created } = await reprintOrderTicket({
      orderId,
      printType,
      kotItems,
      guestCount,
      serverName,
      specialNote,
      restaurantName,
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
    logger.error("Failed to reprint ticket", error);
    return sendError(error, error.message || "Failed to reprint ticket", status);
  }
}, SALES_PRINT_ROLES);
