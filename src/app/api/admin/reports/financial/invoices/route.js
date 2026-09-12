import { financialGetHandler } from "@/lib/reports/financial/handler";
import { buildFinancialInvoices } from "@/lib/reports/financial/invoices";

export const GET = financialGetHandler(
  buildFinancialInvoices,
  "Financial invoices report retrieved",
  { paginate: true }
);
