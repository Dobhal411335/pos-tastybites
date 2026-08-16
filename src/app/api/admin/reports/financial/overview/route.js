import { financialGetHandler } from "@/lib/reports/financial/handler";
import { buildFinancialOverview } from "@/lib/reports/financial/overview";

export const GET = financialGetHandler(
  buildFinancialOverview,
  "Financial overview retrieved"
);
