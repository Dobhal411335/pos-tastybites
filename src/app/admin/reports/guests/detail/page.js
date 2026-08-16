import { redirect } from "next/navigation";

export default function GuestDetailRedirect() {
  redirect("/admin/reports/guests");
}
