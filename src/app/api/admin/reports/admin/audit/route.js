import { adminReportGetHandler } from "@/lib/reports/admin/handler";
import { buildAdminAudit } from "@/lib/reports/admin/audit";

export const GET = adminReportGetHandler(
  buildAdminAudit,
  "Admin transaction audit retrieved",
  { paginate: true }
);
