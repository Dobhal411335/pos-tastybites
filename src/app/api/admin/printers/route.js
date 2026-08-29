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
    const normalized = normalizePayload(body);
    if (normalized.error) {
      return sendError(new Error("Validation"), normalized.error, 400);
    }

    const printer = await PrinterConfig.create({
      restaurant: request.restaurant,
      ...normalized.data,
    });

    logger.info(`Printer config created: ${printer.name} (${printer.target})`);
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
