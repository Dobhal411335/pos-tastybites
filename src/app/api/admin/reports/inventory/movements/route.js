import { inventoryGetHandler } from "@/lib/reports/inventory/handler";
import { buildInventoryMovements } from "@/lib/reports/inventory/movements";

export const GET = inventoryGetHandler(
  buildInventoryMovements,
  "Inventory movements retrieved",
  { paginate: true }
);
