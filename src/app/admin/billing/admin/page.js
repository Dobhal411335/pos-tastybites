import { redirect } from "next/navigation";

export default function AdminBillingIndex() {
  redirect("/admin/billing/admin/create");
}
