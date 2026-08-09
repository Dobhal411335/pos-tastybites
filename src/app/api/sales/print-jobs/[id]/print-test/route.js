import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import {
  SALES_PRINT_ROLES,
  executePrintJob,
  assertPrintAdminRole,
} from "@/lib/printing/printJobService";

/**
 * POST /api/sales/print-jobs/[id]/print-test
 * Runs MockPrinterAdapter (or configured adapter). Never claims hardware contact.
 * Body: { simulateFailure?: boolean }
 */
export const POST = withAuth(async (request, { params }) => {
  try {
    const denied = assertPrintAdminRole(request.role);
    if (denied) return denied;

    const { id } = await params;
    let simulateFailure = false;
    try {
      const body = await request.json();
      simulateFailure = !!body?.simulateFailure;
    } catch {
      // empty body is fine
    }

    const { job, result } = await executePrintJob(id, {
      simulateFailure,
      restaurantId: request.restaurant,
    });

    return sendSuccess(
      {
        job,
        result,
        note: result?.simulated
          ? "Simulated via MockPrinterAdapter — no physical printer was contacted."
          : result?.adapter === "StarPrinterAdapter"
            ? "Star adapter is not configured yet."
            : undefined,
      },
      result.success ? "Print test completed (simulated)" : "Print test failed (simulated)"
    );
  } catch (error) {
    const status = error.statusCode || 500;
    logger.error("Print test failed", error);
    return sendError(error, error.message || "Print test failed", status);
  }
}, SALES_PRINT_ROLES);
