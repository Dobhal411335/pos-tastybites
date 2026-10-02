import {
  PRINTER_TARGETS,
  CONNECTION_TYPES,
  PRINTER_TYPES,
  PRINTER_LOCATIONS,
  ORDER_TYPES,
  PAPER_WIDTHS_MM,
} from "@/models/PrinterConfig";

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const HOSTNAME_RE =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const BT_MAC_RE = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export function isNetworkConnection(connectionType) {
  const t = String(connectionType || "LAN").toUpperCase();
  return t === "LAN" || t === "NETWORK";
}

export function isUsbConnection(connectionType) {
  return String(connectionType || "").toUpperCase() === "USB";
}

export function isBluetoothConnection(connectionType) {
  return String(connectionType || "").toUpperCase() === "BLUETOOTH";
}

function validateHost(host) {
  const trimmed = String(host || "").trim();
  if (!trimmed) return { ok: false, message: "Host / IP is required" };
  if (IPV4_RE.test(trimmed) || HOSTNAME_RE.test(trimmed)) {
    return { ok: true, value: trimmed };
  }
  return { ok: false, message: "Invalid host or IP address" };
}

function normalizePaperWidthMm(value) {
  if (value === undefined || value === null || value === "") return 80;
  const n = Number(value);
  if (!PAPER_WIDTHS_MM.includes(n)) {
    return { error: "paperWidthMm must be 58, 72, 78, or 80" };
  }
  return { value: n };
}

function normalizeOrderTypes(value) {
  if (value === undefined || value === null) {
    return { value: ["TAKE_AWAY", "DINE_IN", "DELIVERY"] };
  }
  if (!Array.isArray(value)) {
    return { error: "orderTypes must be an array" };
  }
  const cleaned = [
    ...new Set(
      value
        .map((v) => String(v || "").toUpperCase().trim())
        .filter(Boolean),
    ),
  ];
  if (!cleaned.length) {
    return { value: ["TAKE_AWAY", "DINE_IN", "DELIVERY"] };
  }
  for (const t of cleaned) {
    if (!ORDER_TYPES.includes(t)) {
      return {
        error: "orderTypes must be TAKE_AWAY, DINE_IN, and/or DELIVERY",
      };
    }
  }
  return { value: cleaned };
}

function normalizeUsbIds(body) {
  const vendorRaw = body?.usbVendorId;
  const productRaw = body?.usbProductId;
  let usbVendorId = null;
  let usbProductId = null;

  if (vendorRaw !== undefined && vendorRaw !== null && vendorRaw !== "") {
    const n = Number(vendorRaw);
    if (!Number.isInteger(n) || n < 0 || n > 65535) {
      return { error: "usbVendorId must be an integer 0–65535" };
    }
    usbVendorId = n;
  }
  if (productRaw !== undefined && productRaw !== null && productRaw !== "") {
    const n = Number(productRaw);
    if (!Number.isInteger(n) || n < 0 || n > 65535) {
      return { error: "usbProductId must be an integer 0–65535" };
    }
    usbProductId = n;
  }
  return { usbVendorId, usbProductId };
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

  const paper = normalizePaperWidthMm(body?.paperWidthMm);
  if (paper.error) return { error: paper.error };
  const orderTypes = normalizeOrderTypes(body?.orderTypes);
  if (orderTypes.error) return { error: orderTypes.error };

  const systemPrinterName = body?.systemPrinterName
    ? String(body.systemPrinterName).trim()
    : null;

  const usbIds = normalizeUsbIds(body);
  if (usbIds.error) return { error: usbIds.error };

  const shared = {
    paperWidthMm: paper.value,
    orderTypes: orderTypes.value,
    usbVendorId: usbIds.usbVendorId,
    usbProductId: usbIds.usbProductId,
  };

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
        bluetoothAddress: null,
        location: locationRaw,
        enabled,
        ...shared,
      },
    };
  }

  if (isBluetoothConnection(connectionType)) {
    const address = String(
      body?.bluetoothAddress || body?.macAddress || body?.host || "",
    )
      .trim()
      .toUpperCase();
    if (!address) {
      return { error: "bluetoothAddress (MAC) is required for Bluetooth printers" };
    }
    if (!BT_MAC_RE.test(address)) {
      return {
        error: "bluetoothAddress must look like AA:BB:CC:DD:EE:FF",
      };
    }
    return {
      data: {
        name,
        type,
        target,
        connectionType: "BLUETOOTH",
        systemPrinterName: systemPrinterName || null,
        host: null,
        port: null,
        bluetoothAddress: address,
        location: locationRaw,
        enabled,
        ...shared,
      },
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
      bluetoothAddress: null,
      location: locationRaw,
      enabled,
      ...shared,
    },
  };
}
