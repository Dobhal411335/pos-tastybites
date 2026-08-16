import { financialGetHandler } from "@/lib/reports/financial/handler";
import { buildFinancialTips } from "@/lib/reports/financial/tips";

export const GET = financialGetHandler(
  buildFinancialTips,
  "Financial tips report retrieved"
);
