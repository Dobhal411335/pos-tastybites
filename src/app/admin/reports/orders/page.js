import { redirect } from "next/navigation";

export default function OrdersReportRedirect() {
  redirect("/admin/reports/financial/orders");
}
