"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AdminReportsPage from "@/components/reports/admin/AdminReportsPage";

export default function AdminReportsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      }
    >
      <AdminReportsPage />
    </Suspense>
  );
}
