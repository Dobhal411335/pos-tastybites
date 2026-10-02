import { withAuth } from "@/utils/auth";
import PrinterConfig from "@/models/PrinterConfig";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

/** All sales floor roles may send a test print (agents on LAN print it). */
const SALES_ROLES = [
  "STAFF",
  "SUPER ADMIN",
  "MANAGER TERMINAL",
  "MASTER TERMINAL",
];

/**
 * POST /api/sales/printers/[id]/test
 * Emits PRINTER_TEST so Electron / MobilePrintAgent can print a test ticket.
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
      host: printer.host || null,
      port: printer.port || null,
      connectionType: printer.connectionType || "LAN",
      systemPrinterName: printer.systemPrinterName || null,
      bluetoothAddress: printer.bluetoothAddress || null,
      usbVendorId: printer.usbVendorId ?? null,
      usbProductId: printer.usbProductId ?? null,
      paperWidthMm: printer.paperWidthMm ?? null,
      location: printer.location || null,
      requestedAt: new Date().toISOString(),
    };

    global.io
      .to(`restaurant:${request.restaurant}`)
      .emit("PRINTER_TEST", payload);

    const conn = String(printer.connectionType || "").toUpperCase();
    const isUsb = conn === "USB";
    const isBt = conn === "BLUETOOTH";
    const sys = String(printer.systemPrinterName || "").trim().toUpperCase();
    const isBuiltIn =
      isUsb &&
      (sys === "BUILTIN" ||
        sys === "ANDROID_BUILTIN" ||
        sys === "ANDROID-BUILTIN");

    return sendSuccess(
      payload,
      isBuiltIn
        ? "Test print signal sent. Keep the Android Sales app open on the POS tablet."
        : isBt
          ? "Test print signal sent. Keep the Android Sales app open near the Bluetooth printer."
          : isUsb
            ? "Test print signal sent. Ensure the local print bridge is running on this laptop."
            : "Test print signal sent. Ensure Sales (desktop or mobile) is open on the restaurant network.",
    );
  } catch (error) {
    logger.error("Failed to send sales printer test", error);
    return sendError(error, "Failed to send test print", 500);
  }
}, SALES_ROLES);
