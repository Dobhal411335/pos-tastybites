import { withAuth } from "@/utils/auth";
import PrinterConfig from "@/models/PrinterConfig";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

const AGENT_ROLES = [
  "ADMIN",
  "SUPER ADMIN",
  "MANAGER",
  "SERVER",
  "BARTENDER",
  "EMPLOYEE",
  "STAFF",
];

const SOURCES = new Set(["mobile", "electron", "print-bridge"]);

/**
 * POST /api/admin/printers/[id]/probe-result
 * On-site agent reports TCP/USB reachability after PRINTER_PROBE.
 * Body: { reachable: boolean, error?: string, source?: string, requestId?: string }
 */
export const POST = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reachable = !!body?.reachable;
    const error =
      typeof body?.error === "string" && body.error.trim()
        ? body.error.trim().slice(0, 500)
        : null;
    const source = SOURCES.has(body?.source) ? body.source : "mobile";
    const requestId =
      typeof body?.requestId === "string" && body.requestId.trim()
        ? body.requestId.trim()
        : null;

    const printer = await PrinterConfig.findOne({
      _id: id,
      restaurant: request.restaurant,
    });

    if (!printer) {
      return sendError(new Error("Not Found"), "Printer not found", 404);
    }

    // Ignore late/stale replies for a different probe request
    if (
      requestId &&
      printer.lastReachability?.requestId &&
      printer.lastReachability.requestId !== requestId
    ) {
      return sendSuccess(
        {
          ignored: true,
          reason: "stale_request",
          requestId: printer.lastReachability.requestId,
        },
        "Ignored stale probe result",
      );
    }

    // First successful write wins if already answered for this requestId
    if (
      requestId &&
      printer.lastReachability?.requestId === requestId &&
      printer.lastReachability?.checkedAt &&
      printer.lastReachability?.status &&
      printer.lastReachability.status !== "unknown"
    ) {
      return sendSuccess(
        {
          ignored: true,
          reason: "already_reported",
          lastReachability: printer.lastReachability,
        },
        "Probe already reported",
      );
    }

    printer.lastReachability = {
      status: reachable ? "reachable" : "unreachable",
      checkedAt: new Date(),
      error: reachable ? null : error || "Printer unreachable",
      source,
      requestId: requestId || printer.lastReachability?.requestId || null,
    };
    await printer.save();

    const resultPayload = {
      printerId: String(printer._id),
      lastReachability: printer.lastReachability,
      requestId: printer.lastReachability.requestId,
    };

    if (global.io) {
      global.io
        .to(`restaurant:${request.restaurant}`)
        .emit("PRINTER_PROBE_RESULT", resultPayload);
    }

    return sendSuccess(resultPayload, reachable ? "Printer reachable" : "Printer unreachable");
  } catch (error) {
    logger.error("Failed to save printer probe result", error);
    return sendError(error, "Failed to save probe result", 500);
  }
}, AGENT_ROLES);
