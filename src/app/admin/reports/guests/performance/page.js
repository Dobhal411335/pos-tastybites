import { redirect } from "next/navigation";

export default function GuestPerformanceRedirect() {
  redirect("/admin/reports/guests");
}
