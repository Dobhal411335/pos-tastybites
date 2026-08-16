import { financialGetHandler } from "@/lib/reports/financial/handler";
import { buildFinancialTax } from "@/lib/reports/financial/tax";

export const GET = financialGetHandler(
  buildFinancialTax,
  "Financial tax report retrieved"
);
