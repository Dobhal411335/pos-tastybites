import { redirect } from "next/navigation";

export default function PaymentsReportRedirect() {
  redirect("/admin/reports/financial/payments");
}
