import { withAuth } from "@/utils/auth";
import PrinterConfig from "@/models/PrinterConfig";
import { normalizePrinterPayload } from "@/lib/printing/printerConfigNormalize";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

const ADMIN_ROLES = ["ADMIN", "SUPER ADMIN", "MANAGER"];

export const GET = withAuth(async (request) => {
  try {
    const printers = await PrinterConfig.find({ restaurant: request.restaurant })
      .sort({ target: 1, name: 1 })
      .lean();

    return sendSuccess(printers, "Printers retrieved");
  } catch (error) {
    logger.error("Failed to list printers", error);
    return sendError(error, "Failed to retrieve printers", 500);
  }
}, ADMIN_ROLES);

export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    const normalized = normalizePrinterPayload(body);
    if (normalized.error) {
      return sendError(new Error("Validation"), normalized.error, 400);
    }

    const printer = await PrinterConfig.create({
      restaurant: request.restaurant,
      ...normalized.data,
    });

    logger.info(
      `Printer config created: ${printer.name} (${printer.target}, ${printer.connectionType})`,
    );
    return sendSuccess(printer, "Printer created", 201);
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(
        new Error("Duplicate"),
        "A printer for this target already exists. Edit the existing one or choose another target.",
        409,
      );
    }
    logger.error("Failed to create printer", error);
    return sendError(error, "Failed to create printer", 500);
  }
}, ADMIN_ROLES);
