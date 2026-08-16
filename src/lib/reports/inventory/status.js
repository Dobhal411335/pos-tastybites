export function stockStatusOf(balance, minStock) {
  const current = Number(balance) || 0;
  if (current <= 0) return "OUT_OF_STOCK";
  if (
    minStock !== null &&
    minStock !== undefined &&
    Number.isFinite(Number(minStock)) &&
    current <= Number(minStock)
  ) {
    return "LOW_STOCK";
  }
  return "IN_STOCK";
}

export function quantityNeeded(balance, minStock) {
  if (minStock === null || minStock === undefined || !Number.isFinite(Number(minStock))) {
    return null;
  }
  return Math.max(0, Number(minStock) - (Number(balance) || 0));
}

export function stockStatusLabel(status) {
  if (status === "OUT_OF_STOCK") return "Out of Stock";
  if (status === "LOW_STOCK") return "Low Stock";
  return "In Stock";
}

export function applyStockStatus(rows, stockStatus) {
  if (!stockStatus || stockStatus === "ALL") return rows;
  return (rows || []).filter((row) => row.stockStatus === stockStatus);
}
