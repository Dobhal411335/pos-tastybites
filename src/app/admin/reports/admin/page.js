"use client";

import EodReportPage from "@/components/eod/EodReportPage";

export default function AdminEndOfDayReportsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <EodReportPage
          fetchFn={fetch}
          showHistory
          title="End-of-Day Report"
        />
      </div>
    </div>
  );
}
