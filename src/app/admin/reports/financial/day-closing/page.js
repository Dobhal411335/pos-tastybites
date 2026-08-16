"use client";

import EodReportPage from "@/components/eod/EodReportPage";

export default function FinancialDayClosingPage() {
  return (
    <EodReportPage
      fetchFn={fetch}
      showHistory
      title="Day Closing"
    />
  );
}
