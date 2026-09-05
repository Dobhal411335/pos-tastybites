import {
  PRINTER_TARGETS,
  CONNECTION_TYPES,
  PRINTER_TYPES,
  PRINTER_LOCATIONS,
} from "@/models/PrinterConfig";

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const HOSTNAME_RE =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isNetworkConnection(connectionType) {
  const t = String(connectionType || "LAN").toUpperCase();
  return t === "LAN" || t === "NETWORK";
}

export function isUsbConnection(connectionType) {
  return String(connectionType || "").toUpperCase() === "USB";
}

function validateHost(host) {
  const trimmed = String(host || "").trim();
  if (!trimmed) return { ok: false, message: "Host / IP is required" };
  if (IPV4_RE.test(trimmed) || HOSTNAME_RE.test(trimmed)) {
    return { ok: true, value: trimmed };
  }
  return { ok: false, message: "Invalid host or IP address" };
}

/**
 * Normalize create/update printer payloads.
 * Accepts aliases: purpose→target, ipAddress→host, isActive→enabled.
 */
export function normalizePrinterPayload(body) {
  const name = String(body?.name || "").trim();
  const target = String(body?.purpose || body?.target || "")
    .toUpperCase()
    .trim();
  let connectionType = String(body?.connectionType || "LAN")
    .toUpperCase()
    .trim();
  if (connectionType === "NETWORK") {
    // store as NETWORK; LAN kept for legacy rows
  } else if (!CONNECTION_TYPES.includes(connectionType)) {
    return { error: "connectionType must be USB, NETWORK, BLUETOOTH, or LAN" };
  }

  const type = String(body?.type || "THERMAL")
    .toUpperCase()
    .trim();
  const locationRaw = body?.location
    ? String(body.location).toUpperCase().trim()
    : null;
  const enabled =
    body?.isActive !== undefined
      ? body.isActive !== false
      : body?.enabled !== false;

  if (!name) return { error: "Printer name is required" };
  if (!PRINTER_TARGETS.includes(target)) {
    return { error: "Target must be KITCHEN, COUNTER, or RECEIPT" };
  }
  if (!PRINTER_TYPES.includes(type)) {
    return { error: "type must be THERMAL" };
  }
  if (locationRaw && !PRINTER_LOCATIONS.includes(locationRaw)) {
    return { error: "location must be COUNTER, KITCHEN, or BAR" };
  }

  const systemPrinterName = body?.systemPrinterName
    ? String(body.systemPrinterName).trim()
    : null;

  if (isUsbConnection(connectionType)) {
    if (!systemPrinterName) {
      return { error: "systemPrinterName is required for USB printers" };
    }
    return {
      data: {
        name,
        type,
        target,
        connectionType: "USB",
        systemPrinterName,
        host: null,
        port: null,
        location: locationRaw,
        enabled,
      },
    };
  }

  if (connectionType === "BLUETOOTH") {
    return {
      error: "Bluetooth printers are not supported in this milestone",
    };
  }

  // NETWORK / LAN
  const hostValue = body?.ipAddress ?? body?.host;
  const hostCheck = validateHost(hostValue);
  const port = Number(body?.port) || 9100;

  if (!hostCheck.ok) return { error: hostCheck.message };
  if (port < 1 || port > 65535) {
    return { error: "Port must be between 1 and 65535" };
  }

  return {
    data: {
      name,
      type,
      target,
      connectionType: connectionType === "NETWORK" ? "NETWORK" : "LAN",
      systemPrinterName: systemPrinterName || null,
      host: hostCheck.value,
      port,
      location: locationRaw,
      enabled,
    },
  };
}
