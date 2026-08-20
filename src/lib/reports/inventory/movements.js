import StockIn from "@/models/stock/StockIn";
import StockOut from "@/models/stock/StockOut";
import StockProduct from "@/models/stock/StockProduct";
import "@/models/stock/StockCategory";
import "@/models/stock/StockUnit";
import Admin from "@/models/Admin";
import Employee from "@/models/employee/Employee";
import { formatEmployeeName } from "@/lib/eod/eodHelpers";
import { dateRangeBounds, toObjectId } from "@/lib/reports/financial/match";
import {
  formatRestaurantDate,
  formatRestaurantTime,
} from "@/lib/reports/financial/format";
import { LINES_EXPR } from "./balance";
import { loadEnrichedProducts } from "./products";
import { inventoryReportMeta } from "./query";

function movementKey(row) {
  return `${row.movementType}:${row.sourceId}:${row.lineIndex || 0}:${row.productId}`;
}

async function performerNames(ids) {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!unique.length) return new Map();

  const objectIds = unique.map((id) => toObjectId(id)).filter(Boolean);
  const [admins, employees] = await Promise.all([
    Admin.find({ _id: { $in: objectIds } }).select("name email").lean(),
    Employee.find({ _id: { $in: objectIds } })
      .select("firstName lastName email")
      .lean(),
  ]);

  const map = new Map();
  for (const admin of admins) {
    map.set(String(admin._id), admin.name || admin.email || "Admin");
  }
  for (const emp of employees) {
    if (!map.has(String(emp._id))) {
      map.set(String(emp._id), formatEmployeeName(emp));
    }
  }
  return map;
}

async function runningBalancesForProducts({ restaurantId, productIds }) {
  const ids = (productIds || []).map((id) => toObjectId(id)).filter(Boolean);
  if (!ids.length) return new Map();

  const rid = toObjectId(restaurantId);
  const [inRows, outRows, productDocs] = await Promise.all([
    StockIn.aggregate([
      {
        $match: {
          restaurant: rid,
          $or: [{ "items.product": { $in: ids } }, { product: { $in: ids } }],
        },
      },
      { $addFields: { _lines: LINES_EXPR } },
      { $unwind: { path: "$_lines", includeArrayIndex: "lineIndex" } },
      { $match: { "_lines.product": { $in: ids } } },
      {
        $project: {
          movementType: { $literal: "STOCK_IN" },
          date: 1,
          createdAt: 1,
          productId: "$_lines.product",
          quantity: { $ifNull: ["$_lines.quantity", 0] },
          sourceId: "$_id",
          lineIndex: 1,
        },
      },
    ]),
    StockOut.aggregate([
      { $match: { restaurant: rid, product: { $in: ids } } },
      {
        $project: {
          movementType: { $literal: "STOCK_OUT" },
          date: 1,
          createdAt: 1,
          productId: "$product",
          quantity: { $ifNull: ["$quantity", 0] },
          sourceId: "$_id",
          lineIndex: { $literal: 0 },
        },
      },
    ]),
    StockProduct.find({ _id: { $in: ids }, restaurant: rid })
      .select("openingStock")
      .lean(),
  ]);

  const all = [...inRows, ...outRows].sort((a, b) => {
    const da = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (da !== 0) return da;
    const ca = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    if (ca !== 0) return ca;
    return String(a.sourceId).localeCompare(String(b.sourceId));
  });

  const openingById = new Map(
    productDocs.map((p) => [String(p._id), Number(p.openingStock) || 0])
  );

  const balances = new Map();
  const running = new Map(
    ids.map((id) => [String(id), openingById.get(String(id)) || 0])
  );
  for (const row of all) {
    const pid = String(row.productId);
    const previous = running.get(pid) || 0;
    const qty = Number(row.quantity) || 0;
    const next =
      row.movementType === "STOCK_IN" ? previous + qty : previous - qty;
    running.set(pid, next);
    balances.set(
      movementKey({
        movementType: row.movementType,
        sourceId: String(row.sourceId),
        lineIndex: row.lineIndex || 0,
        productId: pid,
      }),
      { previous, next }
    );
  }

  return balances;
}

export async function buildInventoryMovements({
  restaurantId,
  page = 1,
  pageSize = 25,
  ...filters
}) {
  const products = await loadEnrichedProducts({ restaurantId, ...filters });
  const ids = products.map((p) => toObjectId(p.id)).filter(Boolean);
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);
  const size = Math.max(1, Number(pageSize) || 25);
  const currentPage = Math.max(1, Number(page) || 1);

  if (!ids.length) {
    return {
      meta: inventoryReportMeta(filters),
      empty: true,
      page: currentPage,
      pageSize: size,
      total: 0,
      pageCount: 1,
      rows: [],
    };
  }

  const rid = toObjectId(restaurantId);
  const dateMatch = { date: { $gte: start, $lt: end } };
  const inColl = StockIn.collection.name;
  const movementType = String(filters.movementType || "ALL").toUpperCase();
  const typeMatch =
    movementType === "STOCK_IN" || movementType === "STOCK_OUT"
      ? [{ $match: { movementType } }]
      : [];

  const [facet] = await StockOut.aggregate([
    { $match: { restaurant: rid, product: { $in: ids }, ...dateMatch } },
    {
      $project: {
        _sortDate: "$date",
        _sortCreated: "$createdAt",
        movementType: { $literal: "STOCK_OUT" },
        date: "$date",
        createdAt: "$createdAt",
        productId: "$product",
        quantity: { $ifNull: ["$quantity", 0] },
        unitPrice: { $ifNull: ["$unitPrice", 0] },
        value: { $ifNull: ["$value", 0] },
        invoiceNumber: { $literal: null },
        createdBy: "$createdBy",
        sourceId: "$_id",
        lineIndex: { $literal: 0 },
      },
    },
    {
      $unionWith: {
        coll: inColl,
        pipeline: [
          {
            $match: {
              restaurant: rid,
              ...dateMatch,
              $or: [{ "items.product": { $in: ids } }, { product: { $in: ids } }],
            },
          },
          { $addFields: { _lines: LINES_EXPR } },
          { $unwind: { path: "$_lines", includeArrayIndex: "lineIndex" } },
          { $match: { "_lines.product": { $in: ids } } },
          {
            $project: {
              _sortDate: "$date",
              _sortCreated: "$createdAt",
              movementType: { $literal: "STOCK_IN" },
              date: "$date",
              createdAt: "$createdAt",
              productId: "$_lines.product",
              quantity: { $ifNull: ["$_lines.quantity", 0] },
              unitPrice: { $ifNull: ["$_lines.unitPrice", 0] },
              value: { $ifNull: ["$_lines.value", 0] },
              invoiceNumber: "$invoiceNumber",
              createdBy: "$createdBy",
              sourceId: "$_id",
              lineIndex: "$lineIndex",
            },
          },
        ],
      },
    },
    ...typeMatch,
    { $sort: { _sortDate: -1, _sortCreated: -1, sourceId: -1, lineIndex: -1 } },
    {
      $facet: {
        rows: [{ $skip: (currentPage - 1) * size }, { $limit: size }],
        total: [{ $count: "n" }],
      },
    },
  ]);

  const rawRows = facet?.rows || [];
  const total = facet?.total?.[0]?.n || 0;
  const pageProductIds = [...new Set(rawRows.map((row) => String(row.productId)))];

  const [productDocs, names, running] = await Promise.all([
    pageProductIds.length
      ? StockProduct.find({ _id: { $in: pageProductIds.map((id) => toObjectId(id)) } })
          .populate("category", "name")
          .populate("unit", "name")
          .lean()
      : [],
    performerNames(rawRows.map((row) => row.createdBy)),
    runningBalancesForProducts({
      restaurantId,
      productIds: pageProductIds,
    }),
  ]);

  const productMap = new Map(
    productDocs.map((p) => [
      String(p._id),
      {
        name: p.name,
        categoryName: p.category?.name || "Uncategorized",
        unit: p.unit?.name || "",
      },
    ])
  );

  const tz = filters.timezone;
  const rows = rawRows.map((row) => {
    const productId = String(row.productId);
    const product = productMap.get(productId) || {
      name: "Unknown",
      categoryName: "—",
      unit: "",
    };
    const key = movementKey({
      movementType: row.movementType,
      sourceId: String(row.sourceId),
      lineIndex: row.lineIndex || 0,
      productId,
    });
    const bal = running.get(key) || { previous: null, next: null };
    return {
      id: key,
      productId,
      date: formatRestaurantDate(row.date, tz),
      time: formatRestaurantTime(row.date, tz),
      product: product.name,
      category: product.categoryName,
      unit: product.unit,
      movementType: row.movementType,
      movementLabel: row.movementType === "STOCK_IN" ? "Stock In" : "Stock Out",
      quantity: Number(row.quantity) || 0,
      previousStock: bal.previous,
      newStock: bal.next,
      reason: row.invoiceNumber || "—",
      performedBy: names.get(String(row.createdBy || "")) || "—",
    };
  });

  return {
    meta: inventoryReportMeta(filters),
    empty: total === 0,
    page: currentPage,
    pageSize: size,
    total,
    pageCount: Math.max(1, Math.ceil(total / size)),
    rows,
  };
}
