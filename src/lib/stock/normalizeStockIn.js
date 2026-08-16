import StockProduct from "@/models/stock/StockProduct";
import "@/models/stock/StockCategory";
import "@/models/stock/StockType";
import "@/models/stock/StockUnit";

function productIdOf(product) {
  if (!product) return "";
  return (product._id || product).toString();
}

/**
 * Flatten a Stock In document into line items.
 * Supports legacy single-product documents (`product`, `quantity`, `value`).
 */
export function getStockInItems(entry) {
  if (!entry) return [];

  if (Array.isArray(entry.items) && entry.items.length) {
    return entry.items.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const value = Number(item.value) || 0;
      const unitPrice =
        item.unitPrice !== undefined && item.unitPrice !== null
          ? Number(item.unitPrice)
          : quantity
            ? value / quantity
            : 0;
      return { ...item, quantity, unitPrice, value };
    });
  }

  if (entry.product) {
    const quantity = Number(entry.quantity) || 0;
    const value = Number(entry.value) || 0;
    return [
      {
        product: entry.product,
        quantity,
        unitPrice: quantity ? value / quantity : 0,
        value,
      },
    ];
  }

  return [];
}

export function normalizeStockInEntry(entry) {
  if (!entry) return entry;
  return { ...entry, items: getStockInItems(entry) };
}

/**
 * Fill product details for leftover single-product documents that still
 * store `product` as a raw ObjectId (that path is no longer in the schema).
 */
export async function hydrateLegacyStockInProducts(entries) {
  const ids = [];
  for (const entry of entries || []) {
    const hasItems = Array.isArray(entry.items) && entry.items.length;
    if (hasItems) continue;
    const pid = productIdOf(entry.product);
    if (pid && !entry.product?.name) ids.push(pid);
  }

  if (!ids.length) return (entries || []).map(normalizeStockInEntry);

  const products = await StockProduct.find({ _id: { $in: [...new Set(ids)] } })
    .populate("category", "name")
    .populate("type", "name")
    .populate("unit", "name")
    .lean();
  const byId = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

  return (entries || []).map((entry) => {
    const hasItems = Array.isArray(entry.items) && entry.items.length;
    if (!hasItems && entry.product && !entry.product.name) {
      const filled = byId[productIdOf(entry.product)];
      if (filled) entry = { ...entry, product: filled };
    }
    return normalizeStockInEntry(entry);
  });
}

export function sumStockInQuantityForProduct(entries, productId) {
  const pid = productId?.toString();
  if (!pid) return 0;
  return (entries || []).reduce((sum, entry) => {
    return (
      sum +
      getStockInItems(entry).reduce((lineSum, item) => {
        return productIdOf(item.product) === pid
          ? lineSum + (Number(item.quantity) || 0)
          : lineSum;
      }, 0)
    );
  }, 0);
}

export const stockInProductPopulate = {
  path: "items.product",
  populate: [
    { path: "category", select: "name" },
    { path: "type", select: "name" },
    { path: "unit", select: "name" },
  ],
};
