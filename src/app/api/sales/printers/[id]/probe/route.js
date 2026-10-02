import { randomUUID } from "crypto";
import { withAuth } from "@/utils/auth";
import PrinterConfig from "@/models/PrinterConfig";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

const SALES_ROLES = [
  "ADMIN",
  "SUPER ADMIN",
  "MANAGER",
  "SERVER",
  "BARTENDER",
  "EMPLOYEE",
  "STAFF",
];

/**
 * POST /api/sales/printers/[id]/probe
 * Asks on-site agents to check reachability (all sales staff may refresh status).
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

    const requestId = randomUUID();
    const payload = {
      printerId: String(printer._id),
      host: printer.host || null,
      port: printer.port || null,
      connectionType: printer.connectionType || "LAN",
      systemPrinterName: printer.systemPrinterName || null,
      bluetoothAddress: printer.bluetoothAddress || null,
      requestId,
      requestedAt: new Date().toISOString(),
    };

    global.io
      .to(`restaurant:${request.restaurant}`)
      .emit("PRINTER_PROBE", payload);

    return sendSuccess(
      { requestId, printerId: String(printer._id) },
      "Connection check started. Waiting for an on-site sales agent.",
    );
  } catch (error) {
    logger.error("Failed to start sales printer probe", error);
    return sendError(error, "Failed to start connection check", 500);
  }
}, SALES_ROLES);
