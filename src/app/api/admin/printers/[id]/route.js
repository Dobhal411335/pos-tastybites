import { withAuth } from "@/utils/auth";
import PrinterConfig, { PRINTER_TARGETS } from "@/models/PrinterConfig";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

const ADMIN_ROLES = ["ADMIN", "SUPER ADMIN", "MANAGER"];

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const HOSTNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function validateHost(host) {
  const trimmed = String(host || "").trim();
  if (!trimmed) return { ok: false, message: "Host / IP is required" };
  if (IPV4_RE.test(trimmed) || HOSTNAME_RE.test(trimmed)) {
    return { ok: true, value: trimmed };
  }
  return { ok: false, message: "Invalid host or IP address" };
}

function normalizePayload(body) {
  const name = String(body?.name || "").trim();
  const target = String(body?.target || "").toUpperCase();
  const hostCheck = validateHost(body?.host);
  const port = Number(body?.port) || 9100;
  const enabled = body?.enabled !== false;

  if (!name) return { error: "Printer name is required" };
  if (!PRINTER_TARGETS.includes(target)) {
    return { error: "Target must be KITCHEN, COUNTER, or RECEIPT" };
  }
  if (!hostCheck.ok) return { error: hostCheck.message };
  if (port < 1 || port > 65535) return { error: "Port must be between 1 and 65535" };

  return {
    data: {
      name,
      target,
      connectionType: "LAN",
      host: hostCheck.value,
      port,
      enabled,
    },
  };
}

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
    const normalized = normalizePayload(body);
    if (normalized.error) {
      return sendError(new Error("Validation"), normalized.error, 400);
    }

    const printer = await PrinterConfig.findOneAndUpdate(
      { _id: id, restaurant: request.restaurant },
      normalized.data,
      { new: true, runValidators: true },
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
