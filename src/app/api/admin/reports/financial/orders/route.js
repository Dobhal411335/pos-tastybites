import { financialGetHandler } from "@/lib/reports/financial/handler";
import { buildFinancialOrders } from "@/lib/reports/financial/orders";

export const GET = financialGetHandler(
  buildFinancialOrders,
  "Financial orders report retrieved",
  { paginate: true }
);
