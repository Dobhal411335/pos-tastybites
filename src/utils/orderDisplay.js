export function resolveDocumentId(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[object Object]") return null;
    return trimmed;
  }
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") {
      return value.toHexString();
    }
    if (value._bsontype === "ObjectId" || value._bsontype === "ObjectID") {
      return String(value);
    }
    const nested =
      (value._id && value._id !== value ? resolveDocumentId(value._id) : null) ||
      (value.id && value.id !== value ? resolveDocumentId(value.id) : null) ||
      (value.$oid && value.$oid !== value ? resolveDocumentId(value.$oid) : null);
    if (nested) return nested;
    const asString = String(value);
    if (asString && asString !== "[object Object]") return asString;
    return null;
  }
  const asString = String(value);
  if (!asString || asString === "[object Object]") return null;
  return asString;
}

export function isDirectSaleOrder(order) {
  const source = order?.source;
  return source === "WALK_IN" || source === "STAFF";
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

export function joinTableNumbers(numbers) {
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

/** Numbers + floor only, e.g. "02, 03, 04 · Main Hall Area" */
export function formatTableNumbersWithFloor(tableNo, floorName) {
  const parsed = stripFloorSuffix(tableNo);
  const numbers = joinTableNumbers([parsed.tables || tableNo]);
  const floor = String(floorName || parsed.floor || "").trim();
  if (!numbers) return floor;
  if (!floor) return numbers;
  if (numbers.toLowerCase().includes(floor.toLowerCase())) return numbers;
  return `${numbers} · ${floor}`;
}

/** One "Table" word, then numbers, then floor: "Table 02, 03, 04 · Main Hall Area" */
export function formatTableLocation(tableNo, floorName) {
  const body = formatTableNumbersWithFloor(tableNo, floorName);
  if (!body) return "";
  if (/^tables?\b/i.test(body)) {
    return body.replace(/^tables?\b/i, "Table");
  }
  const numbers = joinTableNumbers([tableNo]);
  if (!numbers) return body;
  return `Table ${body}`;
}

export function getSessionTableNumbers(session) {
  if (!session) return "";
  if (session.tableNumbers) return joinTableNumbers([session.tableNumbers]);
  const primary =
    session.primaryTable?.tableNumber ||
    session.tableNumber ||
    null;
  const linked = (session.linkedTables || []).map(
    (table) => table?.tableNumber || null,
  );
  return joinTableNumbers([primary, ...linked]);
}

export function formatSessionTableLabel(session) {
  const numbers = getSessionTableNumbers(session);
  const floorName =
    session?.floor?.name || session?.floorName || null;
  return formatTableLocation(numbers, floorName);
}

export function sessionOwnsTable(session, tableId) {
  const id = resolveDocumentId(tableId);
  if (!id || !session) return false;
  if (resolveDocumentId(session.tableId || session.primaryTable) === id) {
    return true;
  }
  const linked = session.linkedTableIds || session.linkedTables || [];
  return linked.some((entry) => resolveDocumentId(entry) === id);
}

export function shouldShowTable(order) {
  return Boolean(order?.tableNo) && !isDirectSaleOrder(order);
}

export function getOrderSourceLabel(source) {
  if (source === "WALK_IN") return "Walk-in";
  if (source === "STAFF") return "Staff";
  if (source === "ONLINE") return "Online";
  return source || "POS";
}

/** User-facing order type: Walk-in, Staff, Table Order, Online, Takeaway */
export function getOrderTypeLabel(order) {
  const source = order?.source || "POS";
  if (source === "WALK_IN") return "Walk-in";
  if (source === "STAFF") return "Staff";
  if (source === "ONLINE") return "Online";
  if (order?.tableSession || order?.tableNo) return "Table Order";
  return "Takeaway";
}

export function getOrderTypeBadgeClass(order) {
  const source = order?.source || "POS";
  if (source === "WALK_IN") {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }
  if (source === "STAFF") {
    return "bg-indigo-100 text-indigo-800 border-indigo-200";
  }
  if (source === "ONLINE") {
    return "bg-sky-100 text-sky-800 border-sky-200";
  }
  if (order?.tableSession || order?.tableNo) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

export function getOrderLocationLabel(order) {
  if (order?.source === "WALK_IN") {
    return order?.partyName || order?.guestName || "Walk-in";
  }
  if (order?.source === "STAFF") {
    return order?.partyName || order?.guestName || "Staff";
  }
  if (order?.tableNo) {
    return formatTableLocation(order.tableNo, order.floorName || order.floor?.name);
  }
  if (order?.tableSession) return "Table";
  return "Takeaway";
}

export function getOrderPartyLabel(order) {
  const party = (order?.partyName || order?.guestName || "").trim();
  if (!party) return null;
  if (order?.source === "WALK_IN" && party === "Walk-in") return null;
  if (order?.source === "STAFF" && party === getOrderLocationLabel(order)) return null;
  return party;
}
