import Restaurant from "@/models/Restaurant";
import { buildInventoryOverview } from "./overview";
import { buildInventoryStock } from "./stock";
import { buildInventoryMovements } from "./movements";
import { buildInventoryTopItems } from "./topItems";
import { buildInventoryLowStock } from "./lowStock";

export async function buildInventoryExportPayload(filters) {
  const [overview, stock, movements, topItems, lowStock, restaurant] =
    await Promise.all([
      buildInventoryOverview(filters),
      buildInventoryStock({ ...filters, page: 1, pageSize: 10000 }),
      buildInventoryMovements({ ...filters, page: 1, pageSize: 5000 }),
      buildInventoryTopItems(filters),
      buildInventoryLowStock({ ...filters, page: 1, pageSize: 10000 }),
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
