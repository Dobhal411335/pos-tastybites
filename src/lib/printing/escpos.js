/**
 * ESC/POS byte builder for 80mm thermal printers (KPC307-UEWB / 576-dot).
 * Font A ≈ 12 dots/char → 576 / 12 = 48 characters per line.
 *
 * Layouts must match the React receipt templates:
 *   - KitchenOrderTicket.jsx
 *   - BarReceipt.jsx
 *   - CustomerReceipt.jsx
 *
 * Used by Electron print agent (browser). Mirrored in print-bridge/src/escpos.js —
 * keep both files in sync. USB runtime uses the print-bridge copy.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Printable columns for Font A on 576-dot (≈80mm) paper */
const WIDTH = 48;

function encoder() {
  const chunks = [];
  return {
    init() {
      this.raw([ESC, 0x40]);
      return this;
    },
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
      this.raw([ESC, 0x61, mode]);
      return this;
    },
    bold(on = true) {
      this.raw([ESC, 0x45, on ? 1 : 0]);
      return this;
    },
    size(width = 1, height = 1) {
      const w = Math.max(1, Math.min(8, width));
      const h = Math.max(1, Math.min(8, height));
      const n = ((w - 1) << 4) | (h - 1);
      this.raw([GS, 0x21, n]);
      return this;
    },
    resetStyle() {
      this.size(1, 1).bold(false).align(0);
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
      if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
      }
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },
  };
}

function divider(char = "-", width = WIDTH) {
  return char.repeat(width);
}

/** Keep thermal output ASCII-safe (avoids CP437 garbage like "Ca" from UTF-8 ellipsis). */
function toPrinterText(str) {
  return String(str ?? "")
    .replace(/\u2026/g, "...")
    .replace(/[×✕✖⨯]/g, "x")
    .replace(/[–—−]/g, "-")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, "");
}

function money(n, opts = {}) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  const abs = Math.abs(v).toFixed(2);
  if (opts.signed) {
    return v < 0 ? `-$${abs}` : v > 0 ? `$${abs}` : `$${abs}`;
  }
  if (v < 0) return `-$${abs}`;
  return `$${abs}`;
}

function formatTwoColumnLine(label, value, width = WIDTH) {
  const l = toPrinterText(label);
  const r = toPrinterText(value);
  if (l.length + r.length >= width) {
    const maxL = Math.max(1, width - r.length - 1);
    const trimmed =
      l.length > maxL ? `${l.slice(0, Math.max(1, maxL - 3))}...` : l;
    const spaces = Math.max(1, width - trimmed.length - r.length);
    return `${trimmed}${" ".repeat(spaces)}${r}`;
  }
  const spaces = Math.max(1, width - l.length - r.length);
  return `${l}${" ".repeat(spaces)}${r}`;
}

/** Wrap long lines instead of truncating with unicode ellipsis. */
function wrapText(text, width = WIDTH) {
  const s = toPrinterText(text).trim();
  if (!s) return [];
  if (s.length <= width) return [s];
  const lines = [];
  let remaining = s;
  while (remaining.length > width) {
    let breakAt = remaining.lastIndexOf(" ", width);
    if (breakAt < Math.floor(width / 2)) breakAt = width;
    lines.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining) lines.push(remaining);
  return lines;
}

function writeWrapped(e, text, width = WIDTH) {
  for (const line of wrapText(text, width)) e.line(line);
}

function formatSentAt(dateLike) {
  const d = dateLike ? new Date(dateLike) : new Date();
  if (Number.isNaN(d.getTime())) return toPrinterText(new Date().toLocaleString());
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = String(hours).padStart(2, "0");
  return `${month} ${day}, ${year} at ${hh}:${minutes} ${ampm}`;
}

function isDirectSaleOrder(order) {
  const source = order?.source;
  return source === "WALK_IN" || source === "STAFF";
}

function shouldShowTable(order) {
  return Boolean(order?.tableNo) && !isDirectSaleOrder(order);
}

function stripFloorSuffix(value) {
  const text = String(value ?? "").trim();
  const separator = text.lastIndexOf(" · ");
  if (separator === -1) return { tables: text, floor: "" };
  return {
    tables: text.slice(0, separator).trim(),
    floor: text.slice(separator + 3).trim(),
  };
}

function normalizeTableToken(value) {
  return String(value ?? "")
    .trim()
    .replace(/^(tables?|tbl)\s+/i, "")
    .trim();
}

function joinTableNumbers(numbers) {
  const tokens = [];
  for (const value of numbers || []) {
    const raw = String(value ?? "").trim();
    if (!raw) continue;
    const { tables } = stripFloorSuffix(raw);
    for (const part of tables.split(/\s*,\s*/)) {
      const token = normalizeTableToken(part);
      if (token) tokens.push(token);
    }
  }
  const unique = [...new Set(tokens)];
  unique.sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ""), 10);
    const nb = parseInt(String(b).replace(/\D/g, ""), 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
  return unique.join(", ");
}

function formatTableNumbersWithFloor(tableNo, floorName) {
  const parsed = stripFloorSuffix(tableNo);
  const numbers = joinTableNumbers([parsed.tables || tableNo]);
  const floor = String(floorName || parsed.floor || "").trim();
  if (!numbers) return floor;
  if (!floor) return numbers;
  if (numbers.toLowerCase().includes(floor.toLowerCase())) return numbers;
  return `${numbers}.${floor}`;
}

function formatTableLocation(tableNo, floorName) {
  const body = formatTableNumbersWithFloor(tableNo, floorName);
  if (!body) return "";
  if (/^tables?\b/i.test(body)) {
    return body.replace(/^tables?\b/i, "Table");
  }
  const numbers = joinTableNumbers([tableNo]);
  if (!numbers) return body;
  return `Table ${body}`;
}

function resolveFloorName(job, order) {
  return (
    job?.metadata?.floorName ||
    order?.floorName ||
    order?.floor?.name ||
    null
  );
}

function resolveTableNo(job, order) {
  return job?.metadata?.tableNo || order?.tableNo || null;
}

function isOfferItem(item) {
  if (!item) return false;
  if (item.isOffer) return true;
  return /^offers?$/i.test(String(item.category || ""));
}

function cleanList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((value) => String(value).trim()).filter(Boolean);
}

function isStyleOption(opt, preparationStyle) {
  const value = String(opt || "").trim();
  const lower = value.toLowerCase();
  if (lower.startsWith("style:")) return true;
  if (
    preparationStyle &&
    lower === String(preparationStyle).trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

/** Mirrors getReceiptModifierLines from productChoices.js */
function getReceiptModifierLines(item) {
  const lines = [];
  const style = String(item?.preparationStyle || "").trim();
  if (style) lines.push(`+ ${style}`);

  if (isOfferItem(item)) {
    const inclusions = cleanList(item?.inclusions);
    const choices = cleanList(item?.choices);
    const drinks = cleanList(item?.drinks);
    if (inclusions.length) lines.push(`Includes: ${inclusions.join(", ")}`);
    if (choices.length) lines.push(`Choices: ${choices.join(", ")}`);
    if (drinks.length) lines.push(`Drinks: ${drinks.join(", ")}`);
    if (lines.length > (style ? 1 : 0)) return lines;

    for (const opt of item?.options || []) {
      const text = String(opt || "").trim();
      if (/^(includes|choices|drinks)\s*:/i.test(text)) lines.push(text);
    }
    return lines;
  }

  if (Array.isArray(item?.choiceSelections)) {
    for (const group of item.choiceSelections) {
      const name = String(group?.name || "").trim();
      const sub = cleanList(group?.subChoices).join(", ");
      if (name && sub) lines.push(`${name}: ${sub}`);
    }
  }
  if (Array.isArray(item?.addonChoiceSelections)) {
    for (const group of item.addonChoiceSelections) {
      const name = String(group?.name || "").trim();
      const sub = cleanList(group?.subChoices).join(", ");
      if (name && sub) lines.push(`${name}: ${sub}`);
    }
  }
  for (const opt of item?.options || []) {
    if (isStyleOption(opt, item?.preparationStyle)) continue;
    const label = String(opt || "").trim();
    if (label) lines.push(`+ ${label}`);
  }
  return lines;
}

function buildTicketItemName(item, { includeSeats = false } = {}) {
  const parts = [];
  if (item.productCode) parts.push(String(item.productCode).trim());
  parts.push(item.name || item.productName || "Item");
  let name = parts.filter(Boolean).join(" ");
  if (item.size && item.size !== "Standard") {
    name += ` (${item.size})`;
  }
  if (includeSeats) {
    const seatBits = [];
    if (item.seat) seatBits.push(item.seat);
    if (Array.isArray(item.seats)) {
      item.seats.filter(Boolean).forEach((s) => seatBits.push(s));
    }
    if (seatBits.length) {
      name += ` (${seatBits
        .map((s) => `S${String(s).replace(/^S/i, "")}`)
        .join(", ")})`;
    }
  }
  return toPrinterText(name);
}

function writeTicketItem(e, item, { qtySep = "x", includeSeats = false } = {}) {
  const qty = item.qty ?? item.quantity ?? 1;
  const name = buildTicketItemName(item, { includeSeats });
  e.bold(true);
  writeWrapped(e, `${qty} ${qtySep} ${name}`);
  e.bold(false);
  if (item.course) {
    writeWrapped(e, `       Course: ${item.course}`);
  }
  for (const line of getReceiptModifierLines(item)) {
    writeWrapped(e, `       ${line}`);
  }
  if (item.notes || item.specialInstructions) {
    writeWrapped(
      e,
      `       Note: ${toPrinterText(item.notes || item.specialInstructions)}`,
    );
  }
}

/** Legacy export — wraps long names instead of unicode truncation. */
function formatKotItemLine(name, qty, width = WIDTH) {
  const left = `${qty}x  ${name || "Item"}`;
  const lines = wrapText(left, width);
  return lines[0] || left;
}

function formatReceiptItemLine(name, qty, unitPrice, width = WIDTH) {
  const lineTotal = (Number(unitPrice) || 0) * (Number(qty) || 1);
  const right = money(lineTotal);
  const left = Number(qty) > 1 ? `${qty} x ${name || "Item"}` : `${name || "Item"}`;
  return formatTwoColumnLine(left, right, width);
}

function writeReceiptItem(e, item) {
  const qty = item.qty ?? 1;
  const name = buildTicketItemName(item);
  const left =
    Number(qty) > 1 ? `${qty} x ${name}` : name;
  const right = money((Number(item.price) || 0) * Number(qty || 1));
  const first = formatTwoColumnLine(left, right);
  // If name was truncated for the price column, print remainder on next lines
  const maxLeft = WIDTH - right.length - 1;
  if (toPrinterText(left).length > maxLeft) {
    e.line(first);
    const overflow = toPrinterText(left).slice(maxLeft - 3);
    writeWrapped(e, overflow);
  } else {
    e.line(first);
  }
  for (const line of getReceiptModifierLines(item)) {
    writeWrapped(e, `   ${line}`);
  }
  if (item.notes || item.specialInstructions) {
    writeWrapped(
      e,
      `   Note: ${toPrinterText(item.notes || item.specialInstructions)}`,
    );
  }
}

/**
 * Build ESC/POS for a test ticket.
 */
export function buildTestTicket({
  name,
  target,
  host,
  port,
  connectionType,
  systemPrinterName,
}) {
  const e = encoder();
  e.init();
  e.align(1).bold(true).line("TASTY BITES").bold(false);
  e.line("PRINTER TEST");
  e.resetStyle();
  e.line(divider());
  e.line(`Printer: ${name || "Test"}`);
  e.line(`Target:  ${target || "-"}`);
  e.line(`Conn:    ${connectionType || "-"}`);
  if (systemPrinterName) {
    e.line(`System:  ${systemPrinterName}`);
  } else if (host) {
    e.line(`Address: ${host}:${port || 9100}`);
  }
  e.line(`Width:   ${WIDTH} cols (Font A / 576 dots)`);
  e.line(divider());
  e.align(1).line(toPrinterText(new Date().toLocaleString()));
  e.resetStyle();
  e.line("");
  e.cut();
  return e.toBase64();
}

/**
 * Kitchen Order Ticket — matches KitchenOrderTicket.jsx
 */
export function buildKotTicket({
  job,
  order,
  kotItems = [],
  restaurantName,
  serverName,
  guestCount,
  isReprint = false,
}) {
  const e = encoder();
  e.init();

  const brand =
    restaurantName || job?.metadata?.restaurantName || "TASTY BITES";
  const orderNumber =
    job?.metadata?.orderNumber || order?.orderNumber || "-";
  const tableNo = resolveTableNo(job, order);
  const floorName = resolveFloorName(job, order);
  const tableLabel = formatTableLocation(tableNo, floorName);
  const directSale = isDirectSaleOrder(order);
  const partyLabel =
    job?.metadata?.partyName ||
    order?.partyName ||
    order?.guestName ||
    job?.metadata?.guestName ||
    (directSale ? "Walk-in" : "");
  const note = job?.metadata?.specialNote || order?.specialNote;
  const items = kotItems.length
    ? kotItems
    : job?.metadata?.kotItems || [];
  const reprint =
    isReprint ||
    Boolean(job?.parentPrintJobId || job?.metadata?.isReprint) ||
    (Number(job?.attemptCount) || 0) > 1;

  e.align(1).bold(true).line(toPrinterText(String(brand).toUpperCase()));
  e.bold(false);
  e.align(1).bold(true).line("KOT").bold(false);
  if (reprint) {
    e.align(1).bold(true).line("*** REPRINT ***").bold(false);
  }
  e.align(1)
    .bold(true)
    .line(
      toPrinterText(
        directSale
          ? partyLabel || "Walk-in"
          : tableLabel || "Takeaway / No Table",
      ),
    )
    .bold(false);
  e.resetStyle();
  e.line(divider("="));

  e.line(`Order #: ${orderNumber}`);
  e.line(`Sent: ${formatSentAt(order?.createdAt || job?.createdAt)}`);
  if (serverName) e.line(`Server: ${toPrinterText(serverName)}`);
  if (partyLabel) e.line(`Party: ${toPrinterText(partyLabel)}`);
  const resolvedGuests =
    guestCount != null && guestCount !== ""
      ? guestCount
      : order?.guestCount != null && order?.guestCount !== ""
        ? order?.guestCount
        : null;
  if (resolvedGuests != null) {
    e.line(`Guests: ${resolvedGuests}`);
  }

  e.line(divider("="));

  const grouped = {};
  for (const item of items) {
    const groupName = isOfferItem(item)
      ? "Offers"
      : item.category || "ITEMS";
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(item);
  }

  const groups = Object.keys(grouped);
  if (!groups.length) {
    e.line("(no items)");
  } else {
    for (const group of groups) {
      e.bold(true).line(toPrinterText(String(group).toUpperCase())).bold(false);
      e.line(divider("-"));
      for (const item of grouped[group]) {
        writeTicketItem(e, item, { qtySep: "x" });
        e.line("");
      }
    }
  }

  if (note) {
    e.line(divider("-"));
    writeWrapped(e, `NOTES: ${note}`);
  }

  e.line(divider("="));
  e.align(1).line(`*** KOT #${orderNumber} ***`);
  e.resetStyle();
  e.line("");
  e.cut();
  return e.toBase64();
}

/**
 * Bar / Counter ticket — matches BarReceipt.jsx
 */
export function buildBarTicket({
  job,
  order,
  kotItems = [],
  restaurantName,
  serverName,
  guestCount,
  isReprint = false,
}) {
  const e = encoder();
  e.init();

  const brand =
    restaurantName || job?.metadata?.restaurantName || "TASTY BITES";
  const orderNumber =
    job?.metadata?.orderNumber || order?.orderNumber || "-";
  const tableNo = resolveTableNo(job, order);
  const floorName = resolveFloorName(job, order);
  const tableLabel = formatTableNumbersWithFloor(tableNo, floorName);
  const directSale = isDirectSaleOrder(order);
  const partyLabel =
    job?.metadata?.partyName ||
    order?.partyName ||
    order?.guestName ||
    job?.metadata?.guestName ||
    (directSale ? "Walk-in" : "");
  const covers =
    guestCount != null && guestCount !== ""
      ? Number(guestCount)
      : order?.guestCount != null && order?.guestCount !== ""
        ? Number(order.guestCount)
        : null;
  const note = job?.metadata?.specialNote || order?.specialNote;
  const items = kotItems.length
    ? kotItems
    : job?.metadata?.barItems || job?.metadata?.kotItems || [];
  const reprint =
    isReprint ||
    Boolean(job?.parentPrintJobId || job?.metadata?.isReprint) ||
    (Number(job?.attemptCount) || 0) > 1;

  e.align(1).bold(true).line(toPrinterText(String(brand).toUpperCase()));
  e.bold(false);
  e.align(1).bold(true).line("BAR RECEIPT").bold(false);
  if (reprint) {
    e.align(1).bold(true).line("*** REPRINT ***").bold(false);
  }
  e.resetStyle();

  if (partyLabel || covers != null) {
    const partyLine =
      partyLabel && covers != null
        ? `Party: ${partyLabel} (${covers})`
        : `Party: ${partyLabel || covers}`;
    e.bold(true).line(toPrinterText(partyLine.toUpperCase())).bold(false);
  }
  if (!directSale) {
    e.bold(true)
      .line(toPrinterText(`Table: ${tableLabel || "Takeaway"}`.toUpperCase()))
      .bold(false);
  }

  e.line(divider("-"));

  e.line(`Sent: ${formatSentAt(order?.createdAt || job?.createdAt)}`);
  if (!directSale && tableLabel) {
    const coverBit =
      covers != null
        ? `, ${covers} Cover${covers === 1 ? "" : "s"}`
        : "";
    e.line(toPrinterText(`Table: ${tableLabel}${coverBit}`));
  }
  e.line(`Order: ${orderNumber}`);
  if (partyLabel) e.line(`Party Name: ${toPrinterText(partyLabel)}`);
  if (serverName) e.line(`Server: ${toPrinterText(serverName)}`);

  if (note) {
    e.line("");
    e.bold(true).line("NOTES").bold(false);
    writeWrapped(e, note);
  }

  e.line(divider("="));
  e.bold(true).line("DRINKS").bold(false);
  e.line("");

  if (!items.length) {
    e.line("(no items)");
  } else {
    for (const item of items) {
      writeTicketItem(e, item, { qtySep: "x", includeSeats: true });
      e.line("");
    }
  }

  e.line(divider("="));
  e.align(1).line(`*** BAR #${orderNumber} ***`);
  e.resetStyle();
  e.line("");
  e.cut();
  return e.toBase64();
}

/**
 * Customer receipt — matches CustomerReceipt.jsx
 */
export function buildReceiptTicket({
  job,
  order,
  restaurantName,
  restaurantDetails = null,
  serverName,
  guestCount,
  isReprint = false,
}) {
  const e = encoder();
  const rest = restaurantDetails || {};
  const brand =
    rest.name ||
    restaurantName ||
    job?.metadata?.restaurantName ||
    "TASTY BITES";
  const restAddress =
    rest.address ||
    "345 Main Street South\nExeter, ON, Canada, N0M 1S6";
  const restPhone = rest.phone || "519 235 0050";
  const hstNumber = rest.hstNumber || "740811146";
  const thankYou =
    rest.thankYouMessage || "Thank You! Please Come Again!";

  const reprint =
    isReprint ||
    Boolean(job?.parentPrintJobId || job?.metadata?.isReprint) ||
    (Number(job?.attemptCount) || 0) > 1;

  const orderNumber =
    job?.metadata?.orderNumber || order?.orderNumber || "-";
  const invoiceNumber = order?.invoiceNumber || "-";
  const tableNo = resolveTableNo(job, order);
  const floorName = resolveFloorName(job, order);
  const tableLabel = formatTableNumbersWithFloor(tableNo, floorName);
  const partyLabel =
    order?.partyName ||
    order?.guestName ||
    job?.metadata?.partyName ||
    job?.metadata?.guestName ||
    "";

  const taxBreakdown = Array.isArray(order?.taxBreakdown)
    ? order.taxBreakdown
    : [];
  const hstAmount =
    taxBreakdown.length > 0
      ? taxBreakdown.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      : Number(order?.taxTotal || 0);

  const tip = Number(order?.tipAmount || 0);
  const discount = Number(order?.discountTotal || 0);
  const serviceCharge = Number(order?.serviceChargeTotal || 0);
  const giftUsed = Number(order?.giftcardUsedAmount || 0);
  const cash = Number(order?.cashAmount || 0);
  const card = Number(order?.cardAmount || 0);
  const orderTotal = Number(order?.totalAmount || 0);
  const grandTotal = orderTotal + tip;

  const methodStr = String(order?.paymentMethod || "");
  const cardLabelMatch = methodStr.match(/Card\s*-\s*([^+/]+)/i);
  const cardLabel = cardLabelMatch
    ? `Card (${cardLabelMatch[1].trim()})`
    : "Card";

  const tipMethod = String(order?.tipMethod || "").trim();
  let tipLabel = "Tip";
  if (tip > 0) {
    if (/gift/i.test(tipMethod)) tipLabel = "Tip (Gift Card)";
    else if (/cash/i.test(tipMethod)) tipLabel = "Tip (Cash)";
    else if (/card/i.test(tipMethod)) tipLabel = "Tip (Card)";
    else if (/gift\s*card/i.test(methodStr) && !/cash|card\s*-/i.test(methodStr)) {
      tipLabel = "Tip (Gift Card)";
    } else if (/cash/i.test(methodStr) && !/card/i.test(methodStr)) {
      tipLabel = "Tip (Cash)";
    } else if (/card/i.test(methodStr) && !/cash/i.test(methodStr)) {
      tipLabel = "Tip (Card)";
    } else if (/cash/i.test(methodStr)) tipLabel = "Tip (Cash)";
    else if (/card/i.test(methodStr)) tipLabel = "Tip (Card)";
  }

  const hasPaymentSplit =
    giftUsed > 0 || cash > 0 || card > 0 || Boolean(order?.paymentMethod);

  const items = order?.items || [];
  const regularItems = items.filter((item) => !isOfferItem(item));
  const offerItems = items.filter((item) => isOfferItem(item));

  const discountPct = (() => {
    if (order?.discountPercent != null && Number(order.discountPercent) > 0) {
      return Number(order.discountPercent);
    }
    const numSub = Number(order?.subTotal || 0);
    const numDisc = Number(discount || 0);
    if (numSub > 0 && numDisc > 0) {
      return Math.round((numDisc / numSub) * 1000) / 10;
    }
    return null;
  })();

  const discountLabel = (() => {
    if (discountPct != null && discountPct > 0) {
      return `Discount (${discountPct}%)`;
    }
    if (discount > 0) {
      return `Discount ($${discount.toFixed(2)})`;
    }
    return "Discount";
  })();

  const totalHstRate = (() => {
    const breakdownRatesSum = taxBreakdown.reduce(
      (sum, t) => sum + (Number(t.rate) || 0),
      0,
    );
    if (breakdownRatesSum > 0) {
      return Math.round(breakdownRatesSum * 10) / 10;
    }
    const taxableBase = Math.max(
      0,
      Number(order?.subTotal || 0) - Number(discount || 0),
    );
    if (taxableBase > 0 && hstAmount > 0) {
      return Math.round((hstAmount / taxableBase) * 1000) / 10;
    }
    if (
      Number(order?.subTotal || 0) > 0 &&
      (hstAmount > 0 || Number(order?.taxTotal || 0) > 0)
    ) {
      return (
        Math.round(
          (Number(order?.taxTotal || hstAmount) / Number(order.subTotal)) * 1000,
        ) / 10
      );
    }
    return null;
  })();

  const hstLabel =
    totalHstRate != null && totalHstRate > 0
      ? `HST (${totalHstRate}%)`
      : "HST";

  e.init();

  e.align(1).bold(true).line(toPrinterText(String(brand).toUpperCase()));
  e.bold(false);
  if (reprint) {
    e.align(1).bold(true).line("*** REPRINT ***").bold(false);
  }
  for (const addrLine of String(restAddress).split(/\r?\n/)) {
    e.line(toPrinterText(addrLine));
  }
  e.line(toPrinterText(restPhone));
  e.line(formatSentAt(order?.createdAt || order?.updatedAt || job?.createdAt));
  e.resetStyle();
  e.line(divider("-"));

  e.line(
    formatTwoColumnLine(
      `Order #: ${orderNumber}`,
      `Invoice No: ${invoiceNumber}`,
    ),
  );
  e.line(`Server: ${toPrinterText(serverName || "Server")}`);
  if (shouldShowTable({ ...order, tableNo })) {
    e.line(`Table: ${toPrinterText(tableLabel)}`);
  }
  if (partyLabel || !shouldShowTable({ ...order, tableNo })) {
    e.line(`Party: ${toPrinterText(partyLabel || "Walk-in")}`);
  }
  const resolvedGuests =
    guestCount != null && guestCount !== ""
      ? guestCount
      : order?.guestCount != null && order?.guestCount !== ""
        ? order?.guestCount
        : null;
  if (resolvedGuests != null) {
    e.line(`Guests: ${resolvedGuests}`);
  }
  e.line(`HST: ${toPrinterText(hstNumber)}`);

  e.line(divider("-"));
  e.bold(true).line(formatTwoColumnLine("ITEM", "AMOUNT")).bold(false);

  for (const item of regularItems) writeReceiptItem(e, item);
  if (offerItems.length) {
    if (regularItems.length) e.line("");
    e.bold(true).line("OFFERS").bold(false);
    e.line(divider("-"));
    for (const item of offerItems) writeReceiptItem(e, item);
  }
  if (!items.length) e.line("(no items)");

  e.line(divider("-"));
  e.line(formatTwoColumnLine("Subtotal", money(order?.subTotal)));
  if (discount > 0) {
    e.line(
      formatTwoColumnLine(discountLabel, `-${money(discount).slice(1)}`),
    );
    e.line(
      formatTwoColumnLine(
        "Net Amount",
        money(Math.max(0, Number(order?.subTotal || 0) - discount)),
      ),
    );
  }
  if (hstAmount > 0 || (discount > 0 && totalHstRate > 0)) {
    e.line(formatTwoColumnLine(hstLabel, money(hstAmount)));
  }
  if (serviceCharge > 0) {
    e.line(
      formatTwoColumnLine(
        order?.serviceChargeName || "Server Charge",
        money(serviceCharge),
      ),
    );
  }
  if (tip > 0) {
    e.line(formatTwoColumnLine("Order Total", money(orderTotal)));
    e.line(formatTwoColumnLine(tipLabel, money(tip)));
  }

  e.line(divider("-"));
  e.bold(true)
    .line(formatTwoColumnLine("TOTAL", money(grandTotal)))
    .bold(false);

  if (hasPaymentSplit) {
    e.line(divider("-"));
    e.bold(true).line("PAYMENT METHOD").bold(false);
    if (giftUsed > 0) {
      e.line(formatTwoColumnLine("Gift Card", money(giftUsed)));
    }
    if (cash > 0) e.line(formatTwoColumnLine("Cash", money(cash)));
    if (card > 0) e.line(formatTwoColumnLine(cardLabel, money(card)));
    if (giftUsed <= 0 && cash <= 0 && card <= 0 && order?.paymentMethod) {
      e.line(
        formatTwoColumnLine(
          "Paid via",
          toPrinterText(order.paymentMethod),
        ),
      );
    }
  }

  e.line(divider("-"));
  e.align(1).bold(true).line(toPrinterText(thankYou)).bold(false);
  e.resetStyle();
  e.line("");
  e.cut();
  return e.toBase64();
}

/**
 * Route to KOT / bar / receipt builders based on job.printType.
 */
export function buildTicketFromJob({
  job,
  order,
  kotItems = [],
  restaurantName,
  restaurantDetails = null,
  serverName,
  guestCount,
  isReprint,
}) {
  const reprintFlag =
    isReprint !== undefined
      ? isReprint
      : Boolean(job?.parentPrintJobId || job?.metadata?.isReprint) ||
        (Number(job?.attemptCount) || 0) > 1;

  const printType = job?.printType || "KOT";
  if (printType === "RECEIPT") {
    return buildReceiptTicket({
      job,
      order,
      restaurantName,
      restaurantDetails,
      serverName,
      guestCount,
      isReprint: reprintFlag,
    });
  }
  if (printType === "BAR_RECEIPT") {
    return buildBarTicket({
      job,
      order,
      kotItems,
      restaurantName,
      serverName,
      guestCount,
      isReprint: reprintFlag,
    });
  }
  return buildKotTicket({
    job,
    order,
    kotItems,
    restaurantName,
    serverName,
    guestCount,
    isReprint: reprintFlag,
  });
}

export function base64ToUint8Array(base64) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export {
  WIDTH,
  formatTwoColumnLine,
  formatKotItemLine,
  formatReceiptItemLine,
  money,
};
