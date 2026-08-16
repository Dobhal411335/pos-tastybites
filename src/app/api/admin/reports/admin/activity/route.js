import { adminReportGetHandler } from "@/lib/reports/admin/handler";
import { buildAdminActivity } from "@/lib/reports/admin/activity";

export const GET = adminReportGetHandler(
  buildAdminActivity,
  "Admin activity report retrieved",
  { paginate: true }
);
