import { dateRangeBounds } from "@/lib/reports/financial/match";
import { r2 } from "@/lib/eod/eodHelpers";
import { aggregateStockOutByProduct } from "./balance";
import { loadEnrichedProducts } from "./products";
import { inventoryReportMeta } from "./query";

export async function buildInventoryTopItems({ restaurantId, ...filters }) {
  const products = await loadEnrichedProducts({ restaurantId, ...filters });
  const ids = products.map((p) => p.id);
  const { start, end } = dateRangeBounds(filters.dateFrom, filters.dateTo);
  const outMap = await aggregateStockOutByProduct({
    restaurantId,
    productIds: ids,
    start,
    end,
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const sortBy = filters.sortBy === "value" ? "value" : "quantity";

  const rows = [...outMap.entries()]
    .map(([id, row]) => {
      const product = productMap.get(id);
      if (!product) return null;
      const quantity = Number(row.totalOut) || 0;
      const value = r2(Number(row.valueOut) || 0);
      return {
        id,
        product: product.name,
        category: product.categoryName,
        quantity,
        value,
        averageUnitPrice: quantity > 0 ? r2(value / quantity) : 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (sortBy === "value" ? b.value - a.value : b.quantity - a.quantity))
    .map((row, index) => ({ rank: index + 1, ...row }));

  return {
    meta: inventoryReportMeta(filters),
    empty: rows.length === 0,
    sortBy,
    rows,
    charts: {
      topByQuantity: [...rows]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
        .map((row) => ({ name: row.product, value: row.quantity })),
      topByValue: [...rows]
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map((row) => ({ name: row.product, value: row.value })),
    },
  };
}
