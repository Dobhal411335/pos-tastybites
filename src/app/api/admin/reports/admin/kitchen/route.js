import { adminReportGetHandler } from "@/lib/reports/admin/handler";
import { buildAdminKitchen } from "@/lib/reports/admin/kitchen";

export const GET = adminReportGetHandler(
  buildAdminKitchen,
  "Admin kitchen log retrieved",
  { paginate: true }
);
