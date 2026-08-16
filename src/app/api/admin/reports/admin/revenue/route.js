import { adminReportGetHandler } from "@/lib/reports/admin/handler";
import { buildAdminRevenue } from "@/lib/reports/admin/revenue";

export const GET = adminReportGetHandler(
  buildAdminRevenue,
  "Admin revenue report retrieved"
);
