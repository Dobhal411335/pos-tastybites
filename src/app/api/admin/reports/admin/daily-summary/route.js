import { adminReportGetHandler } from "@/lib/reports/admin/handler";
import { buildAdminDailySummary } from "@/lib/reports/admin/dailySummary";

export const GET = adminReportGetHandler(
  buildAdminDailySummary,
  "Admin daily summary retrieved"
);
