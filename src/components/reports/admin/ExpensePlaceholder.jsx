"use client";

import { Wallet } from "lucide-react";
import { AdminEmptyState } from "./adminReportUi";

export default function ExpensePlaceholder() {
  return (
    <AdminEmptyState
      icon={Wallet}
      title="No expenses yet"
      message="Expense management is not configured yet. Coming soon."
    />
  );
}
