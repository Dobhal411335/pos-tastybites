"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ChefHat,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Loader2,
  ShieldCheck,
  Sunset,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AdminSectionNavItem } from "./adminReportUi";
import {
  DEFAULT_ADMIN_FILTERS,
  adminQueryString,
  useAdminReport,
} from "./useAdminReport";

export const ADMIN_SECTIONS = [
  {
    id: "daily-summary",
    label: "Daily Summary",
    icon: ClipboardList,
    subtitle: "End of day reconciliation for the current location.",
  },
  {
    id: "revenue",
    label: "Revenue Generated",
    icon: TrendingUp,
    subtitle: "Paid revenue by day, tender, category, and employee.",
  },
  {
    id: "activity",
    label: "Admin Activity",
    icon: Activity,
    subtitle: "Operational actions recorded for this location.",
  },
  {
    id: "eod",
    label: "End of Day",
    icon: Sunset,
    subtitle: "Close the business day and reconcile expected cash.",
  },
  {
    id: "audit",
    label: "Transaction Audit",
    icon: ShieldCheck,
    subtitle: "Exception events — cancellations, discounts, and gift cards.",
  },
  {
    id: "kitchen",
    label: "Kitchen Log",
    icon: ChefHat,
    subtitle: "Kitchen and bar tickets for the selected period.",
  },
  {
    id: "expenses",
    label: "Personal Expense",
    icon: Wallet,
    subtitle: "Personal expense tracking for this location.",
  },
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
  const rawSection = searchParams.get("section") || "daily-summary";
  const section = SECTION_IDS.has(rawSection) ? rawSection : "daily-summary";

  const [filters, setFilters] = useState(DEFAULT_ADMIN_FILTERS);
  const [downloading, setDownloading] = useState(null);
  const stableFilters = useMemo(() => filters, [filters]);

  const paginate = PAGINATED.has(section);
  const report = useAdminReport(API_PATH[section], stableFilters, {
    paginate,
    enabled: Boolean(API_PATH[section]),
    section,
  });

  const current = ADMIN_SECTIONS.find((item) => item.id === section);
  const TitleIcon = current?.icon || ClipboardList;

  const setSection = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", next);
    router.replace(`${pathname}?${params.toString()}`);
    setFilters((prev) => ({
      ...prev,
      page: 1,
      eventType: "ALL",
      kotStatus: "ALL",
    }));
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

  const exportDisabled = !!downloading || report.loading;

  const nav = (
    <Card className="rounded-lg border-zinc-200 shadow-sm sticky top-4">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-lg font-semibold text-zinc-900">
          Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-6 space-y-2">
        {ADMIN_SECTIONS.map((item) => (
          <AdminSectionNavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={section === item.id}
            onClick={() => setSection(item.id)}
          />
        ))}
        {EXPORTABLE.has(section) ? (
          <div className="pt-6 mt-4 border-t border-zinc-200 px-2">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-zinc-500 mb-4">
              Export
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={exportDisabled}
                onClick={() => handleDownload("pdf")}
              >
                {downloading === "pdf" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" strokeWidth={1.75} />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={exportDisabled}
                onClick={() => handleDownload("excel")}
              >
                {downloading === "excel" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" strokeWidth={1.75} />
                )}
                Excel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="hidden lg:block lg:w-64 shrink-0">{nav}</div>

      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                <TitleIcon
                  className="h-5 w-5 text-zinc-700"
                  strokeWidth={1.75}
                />
              </div>
              <h1 className="text-[32px] leading-10 font-bold text-zinc-900 m-0 tracking-tight">
                {current?.label || "Admin Reports"}
              </h1>
            </div>
            <p className="text-base text-zinc-500">
              {current?.subtitle ||
                "Operational activity, revenue, closing, audit, and kitchen logs."}
            </p>
          </div>
          <AdminReportFilters
            value={filters}
            onChange={setFilters}
            section={section}
          />
        </div>

        <div className="lg:hidden space-y-4">
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger className="h-11 bg-white">
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
          {EXPORTABLE.has(section) ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={exportDisabled}
                onClick={() => handleDownload("pdf")}
              >
                {downloading === "pdf" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" strokeWidth={1.75} />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={exportDisabled}
                onClick={() => handleDownload("excel")}
              >
                {downloading === "excel" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" strokeWidth={1.75} />
                )}
                Excel
              </Button>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
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
            <DailySummarySection
              data={report.data}
              loading={report.loading}
              onViewRevenue={() => setSection("revenue")}
              onOpenEod={() => setSection("eod")}
            />
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
