/**
 * Client-side LAN printer discovery for Sales web.
 * Uses Electron IPC when available, otherwise the local print-bridge /scan API.
 * Browsers alone cannot open raw TCP :9100 sockets.
 */

const DEFAULT_BRIDGE =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_PRINT_BRIDGE_URL) ||
  "http://127.0.0.1:9105";

export function subnetPrefixFromHost(host) {
  const trimmed = String(host || "").trim();
  const m = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  return m ? m[1] : null;
}

function hasElectronScan() {
  return (
    typeof window !== "undefined" &&
    window.electronPOS?.isDesktop &&
    typeof window.electronPOS?.scanSubnet === "function"
  );
}

/**
 * @returns {Promise<{ host: string, port: number }[]>}
 */
export async function scanSubnetForPrinters({
  subnetPrefix,
  port = 9100,
  bridgeUrl = DEFAULT_BRIDGE,
} = {}) {
  const prefix = String(subnetPrefix || "")
    .trim()
    .replace(/\.$/, "");
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(prefix)) {
    throw new Error("Subnet must look like 192.168.1");
  }

  if (hasElectronScan()) {
    const result = await window.electronPOS.scanSubnet({
      subnetPrefix: prefix,
      port: Number(port) || 9100,
    });
    if (!result?.success) {
      throw new Error(result?.error || "Electron subnet scan failed");
    }
    return Array.isArray(result.printers) ? result.printers : [];
  }

  const res = await fetch(`${bridgeUrl.replace(/\/$/, "")}/scan`, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subnetPrefix: prefix,
      port: Number(port) || 9100,
    }),
  });
  if (!res.ok) {
    throw new Error(
      "LAN scan needs the desktop POS app or a running local print bridge.",
    );
  }
  const json = await res.json();
  if (!json?.success) {
    throw new Error(json?.error || "Subnet scan failed");
  }
  return Array.isArray(json.printers) ? json.printers : [];
}

export function canScanLanPrinters() {
  return hasElectronScan() || true; // try bridge; UI handles failure toast
}
