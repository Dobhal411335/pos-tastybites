import { adminReportGetHandler } from "@/lib/reports/admin/handler";
import { buildAdminBar } from "@/lib/reports/admin/bar";

export const GET = adminReportGetHandler(
  buildAdminBar,
  "Admin bar log retrieved",
  { paginate: true }
);
