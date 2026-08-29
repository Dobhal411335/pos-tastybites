import { withAuth } from "@/utils/auth";
import PrinterConfig from "@/models/PrinterConfig";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

const ADMIN_ROLES = ["ADMIN", "SUPER ADMIN", "MANAGER"];

/**
 * POST /api/admin/printers/[id]/test
 * Emits PRINTER_TEST on the restaurant Socket.IO room so Electron on the LAN can print a test ticket.
 */
export const POST = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const printer = await PrinterConfig.findOne({
      _id: id,
      restaurant: request.restaurant,
      enabled: true,
    }).lean();

    if (!printer) {
      return sendError(new Error("Not Found"), "Enabled printer not found", 404);
    }

    if (!global.io) {
      return sendError(
        new Error("Unavailable"),
        "Realtime server is not available. Start the POS with the custom server (npm run dev).",
        503,
      );
    }

    const payload = {
      printerId: String(printer._id),
      name: printer.name,
      target: printer.target,
      host: printer.host,
      port: printer.port,
      connectionType: printer.connectionType,
      requestedAt: new Date().toISOString(),
    };

    global.io
      .to(`restaurant:${request.restaurant}`)
      .emit("PRINTER_TEST", payload);

    return sendSuccess(
      payload,
      "Test print signal sent. Ensure Tasty Bites POS desktop is open on the restaurant network.",
    );
  } catch (error) {
    logger.error("Failed to send printer test", error);
    return sendError(error, "Failed to send test print", 500);
  }
}, ADMIN_ROLES);
