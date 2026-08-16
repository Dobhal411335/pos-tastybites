import { dateRangeBounds } from "@/lib/reports/financial/match";
import { aggregateStockOutByProduct, mergeInOutMaps } from "./balance";
import { enrichProducts, loadInventoryProducts } from "./products";
import { inventoryReportMeta } from "./query";
import { applyStockStatus } from "./status";

export async function buildInventoryStock({
  restaurantId,
  page = 1,
  pageSize = 25,
  ...filters
}) {
  const products = await loadInventoryProducts({ restaurantId, ...filters });
  const ids = products.map((p) => String(p._id));
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);

  const [lifetimeMap, periodOutMap] = await Promise.all([
    mergeInOutMaps({ restaurantId, productIds: ids }),
    aggregateStockOutByProduct({ restaurantId, productIds: ids, start, end }),
  ]);

  const rows = applyStockStatus(
    enrichProducts(products, lifetimeMap, periodOutMap),
    filters.stockStatus
  );

  const total = rows.length;
  const size = Math.max(1, Number(pageSize) || 25);
  const currentPage = Math.max(1, Number(page) || 1);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const startIdx = (currentPage - 1) * size;
  const paged = rows.slice(startIdx, startIdx + size);

  return {
    meta: inventoryReportMeta(filters),
    empty: total === 0,
    page: currentPage,
    pageSize: size,
    total,
    pageCount,
    rows: paged,
  };
}
