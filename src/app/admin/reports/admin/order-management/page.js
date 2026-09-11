"use client";

import { FolderKanban } from "lucide-react";
import OrderManagementSection from "@/components/reports/admin/OrderManagementSection";

export default function AdminOrderManagementPage() {
  return (
    <div className="flex flex-col gap-8 min-w-0">
      <div className="min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
            <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h1 className="text-[28px] sm:text-[32px] leading-9 sm:leading-10 font-bold text-zinc-900 m-0 tracking-tight">
            Order Management
          </h1>
        </div>
        <p className="text-sm sm:text-base text-zinc-500">
          Review active orders, soft-delete cash-only tickets, and restore from
          Deleted Orders. Soft-deleted orders are excluded from all active
          reports.
        </p>
      </div>
      <OrderManagementSection />
    </div>
  );
}
