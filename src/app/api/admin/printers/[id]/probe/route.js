import { randomUUID } from "crypto";
import { withAuth } from "@/utils/auth";
import PrinterConfig from "@/models/PrinterConfig";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

const ADMIN_ROLES = ["ADMIN", "SUPER ADMIN", "MANAGER"];

/**
 * POST /api/admin/printers/[id]/probe
 * Asks on-site agents (mobile / Electron / print-bridge) to TCP or USB-check
 * the printer. Cloud cannot reach restaurant LAN printers directly.
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

    const conn = String(printer.connectionType || "LAN").toUpperCase();
    const isNetwork = conn === "LAN" || conn === "NETWORK";
    if (isNetwork && !String(printer.host || "").trim()) {
      return sendError(
        new Error("Bad Request"),
        "Network printer has no IP / host configured.",
        400,
      );
    }
    if (conn === "USB" && !String(printer.systemPrinterName || "").trim()) {
      return sendError(
        new Error("Bad Request"),
        "USB printer has no Windows system printer name configured.",
        400,
      );
    }

    const requestId = randomUUID();
    const payload = {
      printerId: String(printer._id),
      name: printer.name,
      target: printer.target,
      host: printer.host || null,
      port: printer.port || 9100,
      connectionType: printer.connectionType || "LAN",
      systemPrinterName: printer.systemPrinterName || null,
      location: printer.location || null,
      requestId,
      requestedAt: new Date().toISOString(),
    };

    // Reset stale status so admin poll can detect a fresh agent reply
    await PrinterConfig.updateOne(
      { _id: printer._id, restaurant: request.restaurant },
      {
        $set: {
          lastReachability: {
            status: "unknown",
            checkedAt: null,
            error: null,
            requestId,
          },
        },
      },
    );

    global.io
      .to(`restaurant:${request.restaurant}`)
      .emit("PRINTER_PROBE", payload);

    return sendSuccess(
      payload,
      isNetwork
        ? "Probe sent. Keep the sales APK or desktop POS open on the restaurant network."
        : "Probe sent. Ensure the Windows print bridge is running on this PC.",
    );
  } catch (error) {
    logger.error("Failed to send printer probe", error);
    return sendError(error, "Failed to send printer probe", 500);
  }
}, ADMIN_ROLES);
