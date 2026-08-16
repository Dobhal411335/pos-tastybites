import StockIn from "@/models/stock/StockIn";
import StockOut from "@/models/stock/StockOut";
import { r2 } from "@/lib/eod/eodHelpers";
import { eachBusinessDate } from "@/lib/reports/financial/datePresets";
import { dateRangeBounds, toObjectId } from "@/lib/reports/financial/match";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurantTime";
import {
  aggregateStockInByProduct,
  aggregateStockOutByProduct,
  LINES_EXPR,
  mergeInOutMaps,
} from "./balance";
import { enrichProducts, loadInventoryLookups, loadInventoryProducts } from "./products";
import { inventoryReportMeta } from "./query";
import { applyStockStatus } from "./status";

function dayKey(timeZone) {
  return {
    $dateToString: {
      format: "%Y-%m-%d",
      date: "$date",
      timezone: timeZone,
    },
  };
}

async function movementByDay({ restaurantId, productIds, start, end, timezone }) {
  const ids = (productIds || []).map((id) => toObjectId(id)).filter(Boolean);
  if (ids.length === 0) return { inRows: [], outRows: [] };

  const rid = toObjectId(restaurantId);
  const tz = timezone || DEFAULT_RESTAURANT_TIMEZONE;
  const dateMatch = { date: { $gte: start, $lt: end } };

  const [inRows, outRows] = await Promise.all([
    StockIn.aggregate([
      {
        $match: {
          restaurant: rid,
          ...dateMatch,
          $or: [{ "items.product": { $in: ids } }, { product: { $in: ids } }],
        },
      },
      { $addFields: { _lines: LINES_EXPR } },
      { $unwind: "$_lines" },
      { $match: { "_lines.product": { $in: ids } } },
      {
        $group: {
          _id: dayKey(tz),
          total: { $sum: { $ifNull: ["$_lines.quantity", 0] } },
        },
      },
    ]),
    StockOut.aggregate([
      { $match: { restaurant: rid, product: { $in: ids }, ...dateMatch } },
      {
        $group: {
          _id: dayKey(tz),
          total: { $sum: { $ifNull: ["$quantity", 0] } },
        },
      },
    ]),
  ]);

  return { inRows, outRows };
}

export async function buildInventoryOverview({ restaurantId, ...filters }) {
  const lookups = await loadInventoryLookups(restaurantId);
  const products = await loadInventoryProducts({
    restaurantId,
    ...filters,
  });
  const ids = products.map((p) => String(p._id));
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);

  const [lifetimeMap, openingMap, periodInMap, periodOutMap] = await Promise.all([
    mergeInOutMaps({ restaurantId, productIds: ids }),
    mergeInOutMaps({ restaurantId, productIds: ids, before: start }),
    aggregateStockInByProduct({ restaurantId, productIds: ids, start, end }),
    aggregateStockOutByProduct({ restaurantId, productIds: ids, start, end }),
  ]);

  const enriched = applyStockStatus(
    enrichProducts(products, lifetimeMap, periodOutMap),
    filters.stockStatus
  );
  const filteredIds = new Set(enriched.map((row) => row.id));
  const daySeries = await movementByDay({
    restaurantId,
    productIds: [...filteredIds],
    start,
    end,
    timezone: filters.timezone,
  });

  const opening = [...openingMap.entries()].reduce((sum, [id, row]) => {
    return filteredIds.has(id) ? sum + (Number(row.balance) || 0) : sum;
  }, 0);
  const added = [...periodInMap.entries()].reduce((sum, [id, row]) => {
    return filteredIds.has(id) ? sum + (Number(row.totalIn) || 0) : sum;
  }, 0);
  const removed = [...periodOutMap.entries()].reduce((sum, [id, row]) => {
    return filteredIds.has(id) ? sum + (Number(row.totalOut) || 0) : sum;
  }, 0);

  const topOutgoing = [...periodOutMap.entries()]
    .filter(([id]) => filteredIds.has(id))
    .map(([id, row]) => {
      const product = enriched.find((p) => p.id === id);
      return {
        id,
        name: product?.name || "Unknown",
        quantity: Number(row.totalOut) || 0,
        value: Number(row.valueOut) || 0,
      };
    })
    .sort((a, b) => b.quantity - a.quantity);

  const byCategory = new Map();
  for (const row of enriched) {
    const key = row.categoryName || "Uncategorized";
    const current = byCategory.get(key) || { name: key, units: 0, value: 0 };
    current.units += Number(row.currentBalance) || 0;
    current.value += Number(row.stockValue) || 0;
    byCategory.set(key, current);
  }

  const inByDay = new Map((daySeries.inRows || []).map((r) => [r._id, r.total]));
  const outByDay = new Map((daySeries.outRows || []).map((r) => [r._id, r.total]));
  const movementOverTime = eachBusinessDate(filters.dateFrom, filters.dateTo).map(
    (date) => {
      const stockIn = Number(inByDay.get(date) || 0);
      const stockOut = Number(outByDay.get(date) || 0);
      return { date, stockIn, stockOut, value: stockIn + stockOut };
    }
  );

  const topProduct = topOutgoing[0] || null;

  return {
    meta: inventoryReportMeta(filters),
    empty: enriched.length === 0,
    lookups,
    kpis: {
      totalProducts: enriched.length,
      activeProducts: enriched.filter((row) => row.active).length,
      totalUnits: enriched.reduce((sum, row) => sum + (Number(row.currentBalance) || 0), 0),
      lowStockCount: enriched.filter((row) => row.stockStatus === "LOW_STOCK").length,
      outOfStockCount: enriched.filter((row) => row.stockStatus === "OUT_OF_STOCK").length,
      stockAdded: added,
      stockRemoved: removed,
      topOutgoingProduct: topProduct
        ? { name: topProduct.name, quantity: topProduct.quantity }
        : null,
      inventoryValue: r2(
        enriched.reduce((sum, row) => sum + (Number(row.stockValue) || 0), 0)
      ),
    },
    balance: {
      opening,
      added,
      removed,
      closing: opening + added - removed,
    },
    charts: {
      stockByCategory: [...byCategory.values()]
        .map((row) => ({ name: row.name, value: row.units }))
        .sort((a, b) => b.value - a.value),
      stockValueByCategory: [...byCategory.values()]
        .map((row) => ({
          method: row.name,
          amount: r2(row.value),
        }))
        .filter((row) => row.amount > 0),
      topOutgoing: topOutgoing.slice(0, 10).map((row) => ({
        name: row.name,
        value: row.quantity,
      })),
      movementOverTime,
    },
    note: "Current stock, units, and inventory value are a live snapshot. Stock added, removed, opening, closing, and top outgoing items use the selected date range. POS orders do not deduct inventory.",
  };
}
