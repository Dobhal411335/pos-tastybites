import { financialGetHandler } from "@/lib/reports/financial/handler";
import { buildFinancialPayments } from "@/lib/reports/financial/payments";

export const GET = financialGetHandler(
  buildFinancialPayments,
  "Financial payments report retrieved",
  { paginate: true }
);
