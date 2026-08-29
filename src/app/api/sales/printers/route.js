import { withAuth } from "@/utils/auth";
import PrinterConfig from "@/models/PrinterConfig";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

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
 * GET /api/sales/printers
 * Enabled printer mappings for the Electron print agent (LAN host/port only).
 */
export const GET = withAuth(async (request) => {
  try {
    const printers = await PrinterConfig.find({
      restaurant: request.restaurant,
      enabled: true,
    })
      .select("name target host port connectionType enabled")
      .sort({ target: 1 })
      .lean();

    return sendSuccess(printers, "Printers retrieved");
  } catch (error) {
    logger.error("Failed to list sales printers", error);
    return sendError(error, "Failed to retrieve printers", 500);
  }
}, EMPLOYEE_ROLES);
