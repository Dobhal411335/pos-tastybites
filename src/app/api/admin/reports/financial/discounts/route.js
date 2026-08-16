import { financialGetHandler } from "@/lib/reports/financial/handler";
import { buildFinancialDiscounts } from "@/lib/reports/financial/discounts";

export const GET = financialGetHandler(
  buildFinancialDiscounts,
  "Financial discounts report retrieved"
);
