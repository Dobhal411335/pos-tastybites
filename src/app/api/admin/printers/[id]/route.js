import { withAuth } from "@/utils/auth";
import PrinterConfig from "@/models/PrinterConfig";
import { normalizePrinterPayload } from "@/lib/printing/printerConfigNormalize";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

const ADMIN_ROLES = ["ADMIN", "SUPER ADMIN", "MANAGER"];

export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const printer = await PrinterConfig.findOne({
      _id: id,
      restaurant: request.restaurant,
    }).lean();

    if (!printer) {
      return sendError(new Error("Not Found"), "Printer not found", 404);
    }

    return sendSuccess(printer, "Printer retrieved");
  } catch (error) {
    logger.error("Failed to get printer", error);
    return sendError(error, "Failed to retrieve printer", 500);
  }
}, ADMIN_ROLES);

export const PATCH = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const normalized = normalizePrinterPayload(body);
    if (normalized.error) {
      return sendError(new Error("Validation"), normalized.error, 400);
    }

    const printer = await PrinterConfig.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      normalized.data,
      { returnDocument: "after", runValidators: true },
    );

    if (!printer) {
      return sendError(new Error("Not Found"), "Printer not found", 404);
    }

    return sendSuccess(printer, "Printer updated");
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(
        new Error("Duplicate"),
        "A printer for this target already exists.",
        409,
      );
    }
    logger.error("Failed to update printer", error);
    return sendError(error, "Failed to update printer", 500);
  }
}, ADMIN_ROLES);

export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const printer = await PrinterConfig.findOneAndDelete({
      _id: id,
      restaurant: request.restaurant,
    });

    if (!printer) {
      return sendError(new Error("Not Found"), "Printer not found", 404);
    }

    return sendSuccess(printer, "Printer deleted");
  } catch (error) {
    logger.error("Failed to delete printer", error);
    return sendError(error, "Failed to delete printer", 500);
  }
}, ADMIN_ROLES);
