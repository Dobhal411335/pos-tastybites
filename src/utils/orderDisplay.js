export function isDirectSaleOrder(order) {
  const source = order?.source;
  return source === "WALK_IN" || source === "STAFF";
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
  if (order?.tableNo) return order.tableNo;
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
