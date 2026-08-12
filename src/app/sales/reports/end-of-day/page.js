"use client";

import EodReportPage from "@/components/eod/EodReportPage";
import { employeeFetch } from "@/lib/employeeFetch";

export default function SalesEndOfDayPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <EodReportPage
        fetchFn={employeeFetch}
        showHistory
        title="End-of-Day Report"
      />
    </div>
  );
}
