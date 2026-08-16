import { inventoryGetHandler } from "@/lib/reports/inventory/handler";
import { buildInventoryTopItems } from "@/lib/reports/inventory/topItems";

export const GET = inventoryGetHandler(
  buildInventoryTopItems,
  "Inventory top items retrieved"
);
