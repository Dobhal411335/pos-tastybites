import { redirect } from "next/navigation";

export default function DayClosingReportRedirect() {
  redirect("/admin/reports/financial/day-closing");
}
