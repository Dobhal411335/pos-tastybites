/**
 * Minimal ESC/POS byte builder for 80mm thermal printers.
 * Used by the Electron print agent in the renderer (no Node APIs).
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function encoder() {
  const chunks = [];
  return {
    text(str) {
      chunks.push(new TextEncoder().encode(String(str)));
      return this;
    },
    raw(bytes) {
      chunks.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
      return this;
    },
    line(str = "") {
      this.text(str);
      this.raw([LF]);
      return this;
    },
    align(mode) {
      // 0 left, 1 center, 2 right
      this.raw([ESC, 0x61, mode]);
      return this;
    },
    bold(on = true) {
      this.raw([ESC, 0x45, on ? 1 : 0]);
      return this;
    },
    size(width = 1, height = 1) {
      const n = ((width - 1) << 4) | (height - 1);
      this.raw([GS, 0x21, n]);
      return this;
    },
    cut() {
      this.raw([GS, 0x56, 0x00]);
      return this;
    },
    toUint8Array() {
      const total = chunks.reduce((sum, c) => sum + c.length, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
      return out;
    },
    toBase64() {
      const bytes = this.toUint8Array();
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },
  };
}

function divider(char = "-", width = 32) {
  return char.repeat(width);
}

function formatItemLine(name, qty, width = 32) {
  const qtyStr = `${qty}x`;
  const maxName = Math.max(8, width - qtyStr.length - 1);
  const trimmed =
    name.length > maxName ? `${name.slice(0, maxName - 1)}…` : name;
  const spaces = width - trimmed.length - qtyStr.length;
  return `${trimmed}${" ".repeat(Math.max(1, spaces))}${qtyStr}`;
}

/**
 * Build ESC/POS for a test ticket.
 */
export function buildTestTicket({ name, target, host, port }) {
  const e = encoder();
  e.align(1).bold(true).size(2, 2).line("TASTY BITES").size(1, 1).bold(false);
  e.line("PRINTER TEST");
  e.line(divider());
  e.align(0);
  e.line(`Printer: ${name || "Test"}`);
  e.line(`Target:  ${target || "—"}`);
  e.line(`Address: ${host}:${port}`);
  e.line(divider());
  e.align(1).line(new Date().toLocaleString());
  e.line("");
  e.cut();
  return e.toBase64();
}

/**
 * Build ESC/POS for a KOT / bar ticket from print job payload.
 */
export function buildTicketFromJob({
  job,
  order,
  kotItems = [],
  restaurantName,
  serverName,
  guestCount,
}) {
  const printType = job?.printType || "KOT";
  const title =
    printType === "BAR_RECEIPT"
      ? "BAR"
      : printType === "RECEIPT"
        ? "RECEIPT"
        : "KOT";

  const e = encoder();
  e.align(1).bold(true).size(2, 2).line(title).size(1, 1).bold(false);

  if (restaurantName) {
    e.line(restaurantName.toUpperCase());
  }

  e.line(divider());
  e.align(0);

  const orderNumber =
    job?.metadata?.orderNumber || order?.orderNumber || job?.orderNumber || "—";
  e.line(`Order: #${orderNumber}`);

  const tableNo = job?.metadata?.tableNo || order?.tableNo;
  if (tableNo) e.line(`Table: ${tableNo}`);

  if (guestCount != null) e.line(`Guests: ${guestCount}`);
  if (serverName) e.line(`Server: ${serverName}`);

  const note = job?.metadata?.specialNote || order?.specialNote;
  if (note) {
    e.line(divider());
    e.bold(true).line("NOTE:").bold(false);
    e.line(note);
  }

  e.line(divider());
  e.bold(true).line("ITEMS").bold(false);

  const items = kotItems.length ? kotItems : job?.metadata?.kotItems || [];
  for (const item of items) {
    const name = item.name || item.productName || "Item";
    const qty = item.qty ?? item.quantity ?? 1;
    e.line(formatItemLine(name, qty));
    const mods = item.modifiers || item.modifierNames;
    if (mods) {
      const modText = Array.isArray(mods) ? mods.join(", ") : String(mods);
      if (modText) e.line(`  ${modText}`);
    }
  }

  if (!items.length) {
    e.line("(no items)");
  }

  e.line(divider());
  e.align(1).line(new Date().toLocaleString());
  e.line("");
  e.cut();
  return e.toBase64();
}

export function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
