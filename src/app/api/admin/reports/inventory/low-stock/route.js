import { inventoryGetHandler } from "@/lib/reports/inventory/handler";
import { buildInventoryLowStock } from "@/lib/reports/inventory/lowStock";

export const GET = inventoryGetHandler(
  buildInventoryLowStock,
  "Inventory low stock retrieved",
  { paginate: true }
);
