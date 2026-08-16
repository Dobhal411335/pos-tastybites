import { inventoryGetHandler } from "@/lib/reports/inventory/handler";
import { buildInventoryStock } from "@/lib/reports/inventory/stock";

export const GET = inventoryGetHandler(
  buildInventoryStock,
  "Inventory stock retrieved",
  { paginate: true }
);
