import { adminReportGetHandler } from "@/lib/reports/admin/handler";
import { buildAdminTodayOrders } from "@/lib/reports/admin/todayOrder";

export const GET = adminReportGetHandler(
  buildAdminTodayOrders,
  "Admin today order list retrieved",
  { paginate: true }
);
