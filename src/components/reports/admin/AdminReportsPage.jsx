"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChefHat,
  ClipboardList,
  List,
  ShieldCheck,
  Sunset,
  TrendingUp,
  Wallet,
  Wine,
} from "lucide-react";
import AdminReportFilters from "./AdminReportFilters";
import AdminExportDialog from "./AdminExportDialog";
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
  {
    id: "daily-summary",
    label: "Daily Summary",
    icon: ClipboardList,
    subtitle: "End of day reconciliation for the current location.",
    href: "/admin/reports/admin",
  },
  {
    id: "today-order",
    label: "Today Order List",
    icon: List,
    subtitle: "Today's order list for the current location.",
    href: "/admin/reports/admin/today-order",
  },
  {
    id: "revenue",
    label: "Revenue Generated",
    icon: TrendingUp,
    subtitle: "Paid revenue by day, tender, category, and employee.",
    href: "/admin/reports/admin/revenue",
  },
  {
    id: "activity",
    label: "Admin Activity",
    icon: Activity,
    subtitle: "Operational actions recorded for this location.",
    href: "/admin/reports/admin/activity",
  },
  {
    id: "eod",
    label: "End of Day",
    icon: Sunset,
    subtitle: "Close the business day and reconcile expected cash.",
    href: "/admin/reports/admin/eod",
  },
  {
    id: "audit",
    label: "Transaction Audit",
    icon: ShieldCheck,
    subtitle: "Exception events — cancellations, discounts, and gift cards.",
    href: "/admin/reports/admin/audit",
  },
  {
    id: "kitchen",
    label: "Kitchen Log",
    icon: ChefHat,
    subtitle: "Kitchen and bar tickets for the selected period.",
    href: "/admin/reports/admin/kitchen",
  },
  {
    id: "Bar",
    label: "Bar Log",
    icon: Wine,
    subtitle: "Bar tickets for the selected period.",
    href: "/admin/reports/admin/bar",
  },
  {
    id: "expenses",
    label: "Personal Expense",
    icon: Wallet,
    subtitle: "Personal expense tracking for this location.",
    href: "/admin/reports/admin/expenses",
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

export default function AdminReportsPage({
  section: sectionProp = "daily-summary",
}) {
  const router = useRouter();
  const section = SECTION_IDS.has(sectionProp) ? sectionProp : "daily-summary";

  const [filters, setFilters] = useState(DEFAULT_ADMIN_FILTERS);
  const [exportOpen, setExportOpen] = useState(false);
  const stableFilters = useMemo(() => filters, [filters]);

  const paginate = PAGINATED.has(section);
  const report = useAdminReport(API_PATH[section], stableFilters, {
    paginate,
    enabled: Boolean(API_PATH[section]),
    section,
  });

  const current = ADMIN_SECTIONS.find((item) => item.id === section);
  const TitleIcon = current?.icon || ClipboardList;
  const canExport = EXPORTABLE.has(section);

  const setPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setFilters({ ...DEFAULT_ADMIN_FILTERS });
  };

  const exportQuery = adminQueryString(filters, {
    paginate: true,
    section,
  });

  const dateFrom =
    report.data?.meta?.dateFrom || filters.dateFrom || "";
  const dateTo = report.data?.meta?.dateTo || filters.dateTo || "";

  return (
    <div className="flex flex-col gap-8 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
              <TitleIcon className="h-5 w-5 text-zinc-700" strokeWidth={1.75} />
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
          loading={report.loading}
          canExport={canExport}
          onRefresh={report.reload}
          onClear={clearFilters}
          onExport={() => setExportOpen(true)}
        />
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
            onViewRevenue={() => router.push("/admin/reports/admin/revenue")}
            onOpenEod={() => router.push("/admin/reports/admin/eod")}
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

      <AdminExportDialog
        key={exportOpen ? "admin-export-open" : "admin-export-closed"}
        open={exportOpen}
        onOpenChange={setExportOpen}
        exportQuery={exportQuery}
        reportTitle={current?.label || "Admin Report"}
        dateFrom={dateFrom}
        dateTo={dateTo}
        section={section}
        disabled={report.loading}
      />
    </div>
  );
}
