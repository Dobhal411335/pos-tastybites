import Restaurant from "@/models/Restaurant";
import { buildInventoryOverview } from "./overview";
import { buildInventoryStock } from "./stock";
import { buildInventoryMovements } from "./movements";
import { buildInventoryTopItems } from "./topItems";
import { buildInventoryLowStock } from "./lowStock";

export async function buildInventoryExportPayload(filters) {
  const exportFilters = {
    ...filters,
    movementType: "ALL",
  };
  const [overview, stock, movements, topItems, lowStock, restaurant] =
    await Promise.all([
      buildInventoryOverview(exportFilters),
      buildInventoryStock({ ...exportFilters, page: 1, pageSize: 10000 }),
      buildInventoryMovements({ ...exportFilters, page: 1, pageSize: 5000 }),
      buildInventoryTopItems(exportFilters),
      buildInventoryLowStock({ ...exportFilters, page: 1, pageSize: 10000 }),
      Restaurant.findById(filters.restaurantId).select("name").lean(),
    ]);

  return {
    restaurantName: restaurant?.name || "Tasty Bites",
    overview,
    stock,
    movements,
    topItems,
    lowStock,
  };
}
