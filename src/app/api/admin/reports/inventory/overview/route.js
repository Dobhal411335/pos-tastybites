import { inventoryGetHandler } from "@/lib/reports/inventory/handler";
import { buildInventoryOverview } from "@/lib/reports/inventory/overview";

export const GET = inventoryGetHandler(
  buildInventoryOverview,
  "Inventory overview retrieved"
);
