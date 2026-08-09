import { withAuth } from "@/utils/auth";
import PrintJob from "@/models/PrintJob";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  SALES_PRINT_ROLES,
  assertPrintAdminRole,
} from "@/lib/printing/printJobService";

/**
 * GET /api/sales/print-jobs
 * Sales/admin print queue for the restaurant.
 */
export const GET = withAuth(async (request) => {
  try {
    const denied = assertPrintAdminRole(request.role);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const printType = searchParams.get("printType");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const query = { restaurantId: request.restaurant };
    if (status && status !== "ALL") query.status = status;
    if (printType && printType !== "ALL") query.printType = printType;

    const jobs = await PrintJob.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("orderId", "orderNumber tableNo guestName status paymentStatus totalAmount")
      .populate("requestedBy", "firstName lastName name")
      .lean();

    return sendSuccess(jobs, "Print jobs retrieved");
  } catch (error) {
    logger.error("Failed to list print jobs", error);
    return sendError(error, "Failed to list print jobs", 500);
  }
}, SALES_PRINT_ROLES);
