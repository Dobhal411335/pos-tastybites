import { redirect } from "next/navigation";

export default function StockModuleIndex() {
  redirect("/admin/orders/staff/create");
}
