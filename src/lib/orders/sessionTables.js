import Table from "@/models/floor/Table";
import TableSession from "@/models/floor/TableSession";
import Order from "@/models/Order";
import {
  formatSessionTableLabel,
  joinTableNumbers,
  resolveDocumentId,
} from "@/utils/orderDisplay";

export function collectSessionTableIds(session) {
  const ids = [];
  const primary = resolveDocumentId(session?.primaryTable);
  if (primary) ids.push(primary);
  for (const table of session?.linkedTables || []) {
    const id = resolveDocumentId(table);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export async function findOpenSessionForTable(restaurantId, tableId) {
  const id = resolveDocumentId(tableId);
  if (!id) return null;
  return TableSession.findOne({
    restaurant: restaurantId,
    isSessionOpen: true,
    $or: [{ primaryTable: id }, { linkedTables: id }],
  });
}

export async function freeSessionTables(session) {
  const ids = collectSessionTableIds(session);
  if (!ids.length) return ids;
  await Table.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "Available" } },
  );
  return ids;
}

export async function occupyTables(tableIds) {
  const ids = [...new Set((tableIds || []).map(resolveDocumentId).filter(Boolean))];
  if (!ids.length) return;
  await Table.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "Occupied" } },
  );
}

export async function sumSeatsForTableIds(tableIds) {
  const ids = [...new Set((tableIds || []).map(resolveDocumentId).filter(Boolean))];
  if (!ids.length) return 0;
  const tables = await Table.find({ _id: { $in: ids } }).select("seats").lean();
  return tables.reduce((sum, table) => sum + (Number(table.seats) || 0), 0);
}

export class SessionTableError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function applyLinkedTablesToSession({
  session,
  linkedTableIds,
  restaurantId,
  actorId,
  mergeGuestCount = true,
}) {
  const primaryId = resolveDocumentId(session.primaryTable);
  const requestedLinked = [
    ...new Set(
      (linkedTableIds || [])
        .map(resolveDocumentId)
        .filter((id) => id && id !== primaryId),
    ),
  ];

  const currentLinked = (session.linkedTables || [])
    .map(resolveDocumentId)
    .filter(Boolean);
  const desired = new Set(requestedLinked);
  const absorbedSessionIds = [];

  for (const tableId of requestedLinked) {
    const table = await Table.findOne({
      _id: tableId,
      restaurant: restaurantId,
    });
    if (!table) {
      throw new SessionTableError("One of the selected tables was not found", 404);
    }
    if (String(table.floor) !== String(session.floor)) {
      throw new SessionTableError("Combined tables must be on the same floor", 400);
    }

    const owner = await findOpenSessionForTable(restaurantId, tableId);
    if (!owner || String(owner._id) === String(session._id)) {
      continue;
    }
    if (
      String(owner.assignedEmployee) !== String(session.assignedEmployee) &&
      String(owner.assignedEmployee) !== String(actorId)
    ) {
      throw new SessionTableError(
        "One of the selected tables is booked by another employee",
        409,
      );
    }
    absorbedSessionIds.push(String(owner._id));
    for (const id of collectSessionTableIds(owner)) {
      if (id !== primaryId) desired.add(id);
    }
  }

  for (const absorbId of [...new Set(absorbedSessionIds)]) {
    const sourceSession = await TableSession.findOne({
      _id: absorbId,
      restaurant: restaurantId,
      isSessionOpen: true,
    });
    if (!sourceSession) continue;
    await absorbEmployeeSession(session, sourceSession, { mergeGuestCount });
  }

  const desiredList = [...desired];
  const toRemove = currentLinked.filter((id) => !desired.has(id));
  const toOccupy = desiredList.filter((id) => !currentLinked.includes(id));

  if (toOccupy.length) {
    await occupyTables(toOccupy);
  }
  if (toRemove.length) {
    await Table.updateMany(
      { _id: { $in: toRemove } },
      { $set: { status: "Available" } },
    );
  }

  session.linkedTables = desiredList;
  return desiredList;
}

function itemSnapshot(item, suffix) {
  const plain = typeof item?.toObject === "function" ? item.toObject() : { ...item };
  delete plain._id;
  if (suffix && plain.cartId) {
    plain.cartId = `${plain.cartId}-${suffix}`;
  }
  return plain;
}

async function mergeUnpaidOrdersIntoSession(targetSession, sourceSession) {
  const sourceOrders = await Order.find({
    tableSession: sourceSession._id,
    status: { $in: ["PENDING", "CONFIRMED"] },
    paymentStatus: { $ne: "PAID" },
  });

  if (!sourceOrders.length) return;

  let targetOrder = await Order.findOne({
    tableSession: targetSession._id,
    status: { $in: ["PENDING", "CONFIRMED"] },
    paymentStatus: { $ne: "PAID" },
  });

  for (const sourceOrder of sourceOrders) {
    if (!targetOrder) {
      sourceOrder.tableSession = targetSession._id;
      sourceOrder.table = targetSession.primaryTable;
      await sourceOrder.save();
      if (!targetSession.activeOrders.some((id) => String(id) === String(sourceOrder._id))) {
        targetSession.activeOrders.push(sourceOrder._id);
      }
      targetOrder = sourceOrder;
      continue;
    }

    const incoming = (sourceOrder.items || []).map((item) =>
      itemSnapshot(item, sourceOrder.orderNumber),
    );
    targetOrder.items = [...(targetOrder.items || []), ...incoming];
    targetOrder.subTotal = Number(targetOrder.subTotal || 0) + Number(sourceOrder.subTotal || 0);
    targetOrder.taxTotal = Number(targetOrder.taxTotal || 0) + Number(sourceOrder.taxTotal || 0);
    targetOrder.serviceChargeTotal =
      Number(targetOrder.serviceChargeTotal || 0) + Number(sourceOrder.serviceChargeTotal || 0);
    targetOrder.discountTotal =
      Number(targetOrder.discountTotal || 0) + Number(sourceOrder.discountTotal || 0);
    targetOrder.totalAmount =
      Number(targetOrder.subTotal || 0) +
      Number(targetOrder.taxTotal || 0) +
      Number(targetOrder.serviceChargeTotal || 0) -
      Number(targetOrder.discountTotal || 0);
    if (sourceOrder.specialNote) {
      targetOrder.specialNote = [targetOrder.specialNote, sourceOrder.specialNote]
        .filter(Boolean)
        .join(" | ");
    }
    await targetOrder.save();

    sourceOrder.status = "CANCELLED";
    sourceOrder.waiveReason = `Merged into order ${targetOrder.orderNumber}`;
    await sourceOrder.save();

    if (!targetSession.activeOrders.some((id) => String(id) === String(targetOrder._id))) {
      targetSession.activeOrders.push(targetOrder._id);
    }
  }
}

export async function absorbEmployeeSession(
  targetSession,
  sourceSession,
  { mergeGuestCount = true } = {},
) {
  if (!Array.isArray(targetSession.linkedTables)) {
    targetSession.linkedTables = [];
  }
  const extraIds = collectSessionTableIds(sourceSession).filter(
    (id) => id !== resolveDocumentId(targetSession.primaryTable),
  );
  const currentLinked = (targetSession.linkedTables || []).map(resolveDocumentId);
  for (const id of extraIds) {
    if (!currentLinked.includes(id)) {
      targetSession.linkedTables.push(id);
      currentLinked.push(id);
    }
  }

  if (mergeGuestCount) {
    targetSession.guestCount =
      Number(targetSession.guestCount || 0) + Number(sourceSession.guestCount || 0);
  }

  await mergeUnpaidOrdersIntoSession(targetSession, sourceSession);

  sourceSession.status = "COMPLETED";
  sourceSession.isSessionOpen = false;
  sourceSession.closedAt = new Date();
  sourceSession.notes = sourceSession.notes
    ? `${sourceSession.notes} | Merged into session ${targetSession.sessionId}`
    : `Merged into session ${targetSession.sessionId}`;
  await sourceSession.save();
}

export async function loadSessionTableLabel(session) {
  const populated = await TableSession.findById(session._id)
    .populate("primaryTable", "tableNumber seats")
    .populate("linkedTables", "tableNumber seats")
    .populate("floor", "name")
    .lean();
  return formatSessionTableLabel(populated);
}

export async function syncSessionOrderTableLabels(session) {
  const tableNo = await loadSessionTableLabel(session);
  if (!tableNo) return tableNo;
  await Order.updateMany(
    {
      tableSession: session._id,
      status: { $in: ["PENDING", "CONFIRMED"] },
    },
    { $set: { tableNo } },
  );
  return tableNo;
}

export function decorateSessionWithTableNumbers(session) {
  const tableNumber = getPopulatedTableNumbers(session);
  return {
    ...session,
    tableNumber,
    tableNumbers: tableNumber,
    floorId: String(session.floor?._id || session.floor || ""),
    floorName: session.floor?.name || session.floorName || null,
  };
}

function getPopulatedTableNumbers(session) {
  const primary = session?.primaryTable?.tableNumber || session?.tableNumber;
  const linked = (session?.linkedTables || []).map((table) => table?.tableNumber);
  return joinTableNumbers([primary, ...linked]);
}
