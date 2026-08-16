import StockIn from "@/models/stock/StockIn";
import StockOut from "@/models/stock/StockOut";
import { toObjectId } from "@/lib/reports/financial/match";

const LINES_EXPR = {
  $cond: [
    { $gt: [{ $size: { $ifNull: ["$items", []] } }, 0] },
    "$items",
    {
      $cond: [
        { $ne: [{ $ifNull: ["$product", null] }, null] },
        [
          {
            product: "$product",
            quantity: { $ifNull: ["$quantity", 0] },
            unitPrice: { $ifNull: ["$unitPrice", 0] },
            value: { $ifNull: ["$value", 0] },
          },
        ],
        [],
      ],
    },
  ],
};

function dateClause({ start, end, before }) {
  if (before) return { date: { $lt: before } };
  if (start && end) return { date: { $gte: start, $lt: end } };
  return {};
}

function objectIds(productIds) {
  if (!Array.isArray(productIds)) return null;
  return productIds.map((id) => toObjectId(id)).filter(Boolean);
}

export async function aggregateStockInByProduct({
  restaurantId,
  productIds,
  start,
  end,
  before,
}) {
  const ids = objectIds(productIds);
  if (ids && ids.length === 0) return new Map();

  const rid = toObjectId(restaurantId);
  const match = { restaurant: rid, ...dateClause({ start, end, before }) };
  if (ids) {
    match.$or = [{ "items.product": { $in: ids } }, { product: { $in: ids } }];
  }

  const rows = await StockIn.aggregate([
    { $match: match },
    { $addFields: { _lines: LINES_EXPR } },
    { $unwind: "$_lines" },
    ...(ids ? [{ $match: { "_lines.product": { $in: ids } } }] : []),
    {
      $group: {
        _id: "$_lines.product",
        totalIn: { $sum: { $ifNull: ["$_lines.quantity", 0] } },
        valueIn: { $sum: { $ifNull: ["$_lines.value", 0] } },
      },
    },
  ]);

  return new Map(
    rows
      .filter((row) => row._id)
      .map((row) => [
        String(row._id),
        { totalIn: Number(row.totalIn) || 0, valueIn: Number(row.valueIn) || 0 },
      ])
  );
}

export async function aggregateStockOutByProduct({
  restaurantId,
  productIds,
  start,
  end,
  before,
}) {
  const ids = objectIds(productIds);
  if (ids && ids.length === 0) return new Map();

  const rid = toObjectId(restaurantId);
  const match = { restaurant: rid, ...dateClause({ start, end, before }) };
  if (ids) match.product = { $in: ids };

  const rows = await StockOut.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$product",
        totalOut: { $sum: { $ifNull: ["$quantity", 0] } },
        valueOut: { $sum: { $ifNull: ["$value", 0] } },
      },
    },
  ]);

  return new Map(
    rows
      .filter((row) => row._id)
      .map((row) => [
        String(row._id),
        { totalOut: Number(row.totalOut) || 0, valueOut: Number(row.valueOut) || 0 },
      ])
  );
}

export async function mergeInOutMaps({
  restaurantId,
  productIds,
  start,
  end,
  before,
}) {
  const [ins, outs] = await Promise.all([
    aggregateStockInByProduct({ restaurantId, productIds, start, end, before }),
    aggregateStockOutByProduct({ restaurantId, productIds, start, end, before }),
  ]);

  const ids = new Set([...ins.keys(), ...outs.keys()]);
  const merged = new Map();
  for (const id of ids) {
    const inRow = ins.get(id) || { totalIn: 0, valueIn: 0 };
    const outRow = outs.get(id) || { totalOut: 0, valueOut: 0 };
    merged.set(id, {
      totalIn: inRow.totalIn,
      valueIn: inRow.valueIn,
      totalOut: outRow.totalOut,
      valueOut: outRow.valueOut,
      balance: inRow.totalIn - outRow.totalOut,
    });
  }
  return merged;
}

export function sumMapField(map, field) {
  let total = 0;
  for (const row of map.values()) {
    total += Number(row[field]) || 0;
  }
  return total;
}

export { LINES_EXPR };
