import StockProduct from "@/models/stock/StockProduct";
import StockCategory from "@/models/stock/StockCategory";
import "@/models/stock/StockType";
import "@/models/stock/StockUnit";
import { escapeRegex, toObjectId } from "@/lib/reports/financial/match";
import { r2 } from "@/lib/eod/eodHelpers";
import { applyStockStatus, quantityNeeded, stockStatusOf } from "./status";
import { mergeInOutMaps } from "./balance";

export async function loadInventoryProducts({
  restaurantId,
  categoryId,
  productId,
  search,
}) {
  const rid = toObjectId(restaurantId);
  const query = { restaurant: rid };
  const cat = toObjectId(categoryId);
  if (cat) query.category = cat;
  const pid = toObjectId(productId);
  if (pid) query._id = pid;
  if (search) query.name = { $regex: escapeRegex(search), $options: "i" };

  return StockProduct.find(query)
    .populate("category", "name")
    .populate("unit", "name")
    .populate("type", "name")
    .sort({ name: 1 })
    .lean();
}

export async function loadInventoryLookups(restaurantId) {
  const rid = toObjectId(restaurantId);
  const [categories, products] = await Promise.all([
    StockCategory.find({ restaurant: rid }).select("name").sort({ name: 1 }).lean(),
    StockProduct.find({ restaurant: rid })
      .select("name category")
      .sort({ name: 1 })
      .lean(),
  ]);

  return {
    categories: categories.map((c) => ({ id: String(c._id), name: c.name })),
    products: products.map((p) => ({
      id: String(p._id),
      name: p.name,
      categoryId: p.category ? String(p.category) : "",
    })),
  };
}

export function enrichProducts(products, lifetimeMap, periodOutMap = new Map()) {
  return (products || []).map((product) => {
    const id = String(product._id);
    const life = lifetimeMap.get(id) || { totalIn: 0, totalOut: 0 };
    const currentBalance = (Number(life.totalIn) || 0) - (Number(life.totalOut) || 0);
    const minStock =
      product.minStock === null || product.minStock === undefined
        ? null
        : Number(product.minStock);
    const purchasePrice = Number(product.purchasePrice) || 0;
    const period = periodOutMap.get(id) || { totalOut: 0 };

    return {
      id,
      name: product.name,
      categoryId: product.category?._id
        ? String(product.category._id)
        : String(product.category || ""),
      categoryName: product.category?.name || "Uncategorized",
      unit: product.unit?.name || "",
      type: product.type?.name || "",
      active: Boolean(product.status),
      minStock,
      purchasePrice,
      totalIn: Number(life.totalIn) || 0,
      totalOut: Number(life.totalOut) || 0,
      currentBalance,
      stockStatus: stockStatusOf(currentBalance, minStock),
      stockValue: r2(currentBalance * purchasePrice),
      unitsOutPeriod: Number(period.totalOut) || 0,
      quantityNeeded: quantityNeeded(currentBalance, minStock),
    };
  });
}

export async function loadEnrichedProducts(filters) {
  const products = await loadInventoryProducts(filters);
  const ids = products.map((p) => String(p._id));
  const lifetimeMap = await mergeInOutMaps({
    restaurantId: filters.restaurantId,
    productIds: ids,
  });
  const rows = enrichProducts(products, lifetimeMap);
  return applyStockStatus(rows, filters.stockStatus);
}
