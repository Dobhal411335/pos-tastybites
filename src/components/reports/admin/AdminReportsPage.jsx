"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminReportFilters from "./AdminReportFilters";
import ActivitySection from "./ActivitySection";
import RevenueSection from "./RevenueSection";
import DailySummarySection from "./DailySummarySection";
import EodSection from "./EodSection";
import AuditSection from "./AuditSection";
import KitchenSection from "./KitchenSection";
import ExpensePlaceholder from "./ExpensePlaceholder";
import {
  DEFAULT_ADMIN_FILTERS,
  adminQueryString,
  useAdminReport,
} from "./useAdminReport";

export const ADMIN_SECTIONS = [
  { id: "activity", label: "Admin Activity" },
  { id: "revenue", label: "Revenue Generated" },
  { id: "daily-summary", label: "Daily Summary" },
  { id: "eod", label: "End of Day" },
  { id: "audit", label: "Transaction Audit" },
  { id: "kitchen", label: "Kitchen Log" },
  { id: "expenses", label: "Personal Expense" },
];

const SECTION_IDS = new Set(ADMIN_SECTIONS.map((s) => s.id));

const API_PATH = {
  activity: "/api/admin/reports/admin/activity",
  revenue: "/api/admin/reports/admin/revenue",
  "daily-summary": "/api/admin/reports/admin/daily-summary",
  audit: "/api/admin/reports/admin/audit",
  kitchen: "/api/admin/reports/admin/kitchen",
};

const PAGINATED = new Set(["activity", "audit", "kitchen"]);
const EXPORTABLE = new Set([
  "activity",
  "revenue",
  "daily-summary",
  "audit",
  "kitchen",
]);

export default function AdminReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawSection = searchParams.get("section") || "activity";
  const section = SECTION_IDS.has(rawSection) ? rawSection : "activity";

  const [filters, setFilters] = useState(DEFAULT_ADMIN_FILTERS);
  const [downloading, setDownloading] = useState(null);
  const stableFilters = useMemo(() => filters, [filters]);

  const paginate = PAGINATED.has(section);
  const report = useAdminReport(API_PATH[section], stableFilters, {
    paginate,
    enabled: Boolean(API_PATH[section]),
    section,
  });

  const setSection = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", next);
    router.replace(`${pathname}?${params.toString()}`);
    setFilters((prev) => ({ ...prev, page: 1, eventType: "ALL", kotStatus: "ALL" }));
  };

  const setPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleDownload = async (kind) => {
    if (!EXPORTABLE.has(section)) return;
    setDownloading(kind);
    try {
      const qs = adminQueryString(filters, { paginate: true, section });
      const res = await fetch(`/api/admin/reports/admin/${kind}?${qs}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to download ${kind}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Admin-${section}-${
        report.data?.meta?.dateFrom || "report"
      }-to-${report.data?.meta?.dateTo || "report"}.${
        kind === "excel" ? "xlsx" : "pdf"
      }`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${kind === "excel" ? "Excel" : "PDF"} downloaded`);
    } catch (err) {
      toast.error(err.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Reports
          </p>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
            Admin Reports
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Operational activity, revenue, closing, audit, and kitchen logs.
          </p>
        </div>
        {EXPORTABLE.has(section) ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!!downloading || report.loading}
              onClick={() => handleDownload("excel")}
            >
              {downloading === "excel" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              )}
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!!downloading || report.loading}
              onClick={() => handleDownload("pdf")}
            >
              {downloading === "pdf" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-1.5" />
              )}
              Export PDF
            </Button>
          </div>
        ) : null}
      </div>

      <AdminReportFilters
        value={filters}
        onChange={setFilters}
        section={section}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        <nav className="hidden lg:block w-52 shrink-0">
          <div className="border border-zinc-200 rounded-lg bg-white p-1.5 sticky top-2">
            {ADMIN_SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm ${
                  section === item.id
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="lg:hidden space-y-2">
          <div className="hidden sm:flex overflow-x-auto gap-1 border border-zinc-200 rounded-lg bg-white p-1">
            {ADMIN_SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs ${
                  section === item.id
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="sm:hidden">
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_SECTIONS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {section === "activity" ? (
            <ActivitySection
              data={report.data}
              loading={report.loading}
              onPage={setPage}
            />
          ) : null}
          {section === "revenue" ? (
            <RevenueSection data={report.data} loading={report.loading} />
          ) : null}
          {section === "daily-summary" ? (
            <DailySummarySection data={report.data} loading={report.loading} />
          ) : null}
          {section === "eod" ? <EodSection /> : null}
          {section === "audit" ? (
            <AuditSection
              data={report.data}
              loading={report.loading}
              onPage={setPage}
            />
          ) : null}
          {section === "kitchen" ? (
            <KitchenSection
              data={report.data}
              loading={report.loading}
              onPage={setPage}
            />
          ) : null}
          {section === "expenses" ? <ExpensePlaceholder /> : null}
        </div>
      </div>
    </div>
  );
}
