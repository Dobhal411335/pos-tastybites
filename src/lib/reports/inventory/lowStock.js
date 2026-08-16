import { mergeInOutMaps } from "./balance";
import { enrichProducts, loadInventoryProducts } from "./products";
import { inventoryReportMeta } from "./query";
import { applyStockStatus } from "./status";

export async function buildInventoryLowStock({
  restaurantId,
  page = 1,
  pageSize = 25,
  ...filters
}) {
  const products = await loadInventoryProducts({ restaurantId, ...filters });
  const ids = products.map((p) => String(p._id));
  const lifetimeMap = await mergeInOutMaps({ restaurantId, productIds: ids });
  const enriched = applyStockStatus(
    enrichProducts(products, lifetimeMap),
    filters.stockStatus
  );

  const attention = enriched
    .filter(
      (row) =>
        row.stockStatus === "OUT_OF_STOCK" || row.stockStatus === "LOW_STOCK"
    )
    .sort((a, b) => {
      if (a.stockStatus !== b.stockStatus) {
        return a.stockStatus === "OUT_OF_STOCK" ? -1 : 1;
      }
      return (Number(b.quantityNeeded) || 0) - (Number(a.quantityNeeded) || 0);
    });

  const total = attention.length;
  const size = Math.max(1, Number(pageSize) || 25);
  const currentPage = Math.max(1, Number(page) || 1);
  const startIdx = (currentPage - 1) * size;

  return {
    meta: inventoryReportMeta(filters),
    empty: total === 0,
    page: currentPage,
    pageSize: size,
    total,
    pageCount: Math.max(1, Math.ceil(total / size) || 1),
    rows: attention.slice(startIdx, startIdx + size),
  };
}
