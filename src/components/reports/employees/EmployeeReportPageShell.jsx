"use client";

import { useState } from "react";
import EmployeeReportToolbar from "./EmployeeReportToolbar";
import EmployeeExportDialog from "./EmployeeExportDialog";
import EmployeeProfileSheet from "./EmployeeProfileSheet";
import FocusedEmployeeDetailSheet from "./sheets/FocusedEmployeeDetailSheet";
import { ReportError } from "./EmployeeReportUi";
import { toYmd } from "./employeeFormat";
import {
  useEmployeeDetailLoader,
  useEmployeeReport,
} from "./useEmployeeReportQuery";

/**
 * Shared shell for employee report pages.
 * detailMode: profile | sales | tips | service | orders | cancellations | clock | tipsByPayment | hours | labor
 * exportView: overview | sales | tips | service | hours | labor | clock | timesheet | orders | cancellations | tips-by-payment
 */
export default function EmployeeReportPageShell({
  title,
  description,
  section = "summary",
  exportView = "overview",
  detailMode = "profile",
  paginate = false,
  showEmployee = true,
  showRole = true,
  showShift = false,
  showStatus = true,
  showPayment = true,
  showSearch = false,
  searchPlaceholder,
  sort = "createdAt",
  sortDir = "desc",
  limit = 25,
  showScheduleInSheet = false,
  children,
}) {
  const report = useEmployeeReport(section, { paginate, sort, sortDir, limit });
  const detail = useEmployeeDetailLoader(report.filters, detailMode);
  const [exportOpen, setExportOpen] = useState(false);

  const filterOptions = report.data?.filters || { employees: [], shifts: [] };
  const timezone = report.data?.meta?.timezone || "Asia/Kolkata";
  const sheetOpen = Boolean(detail.selectedEmployeeId);

  const exportQuery = (() => {
    const params = new URLSearchParams(report.exportQuery || "");
    params.set("exportView", exportView);
    return params.toString();
  })();

  const exportRowCount = (
    report.data?.performance ||
    report.data?.rows ||
    report.data?.methods ||
    report.data?.tips?.employees ||
    report.data?.earnedByEmployee ||
    []
  ).length;

  return (
    <div className="space-y-4">
      <EmployeeReportToolbar
        title={title}
        description={description}
        filters={report.filters}
        onPresetChange={report.onPresetChange}
        onFiltersChange={(patch) => report.applyFilters(patch)}
        onClear={report.clearFilters}
        onRefresh={report.reload}
        onExport={() => setExportOpen(true)}
        loading={report.loading}
        filterOptions={filterOptions}
        showEmployee={showEmployee}
        showRole={showRole}
        showShift={showShift}
        showStatus={showStatus}
        showPayment={showPayment}
        showSearch={showSearch}
        searchPlaceholder={searchPlaceholder}
      />

      {report.error && !report.loading ? (
        <ReportError message={report.error} onRetry={report.reload} />
      ) : (
        children({
          ...report,
          filterOptions,
          openEmployee: detail.openEmployee,
          timezone,
        })
      )}

      {detailMode === "profile" ? (
        <EmployeeProfileSheet
          open={sheetOpen}
          onOpenChange={detail.closeSheet}
          employee={detail.selectedEmployee}
          detail={detail.detail}
          loading={detail.detailLoading}
          timezone={timezone}
          selectedDay={detail.selectedDay}
          onSelectDay={detail.setSelectedDay}
          onBackToEmployee={() => {
            detail.setSelectedDay(null);
            detail.setOrderDetail(null);
          }}
          orderDetail={detail.orderDetail}
          orderLoading={detail.orderLoading}
          onSelectOrder={detail.openOrder}
          onBackToDay={() => detail.setOrderDetail(null)}
        />
      ) : (
        <FocusedEmployeeDetailSheet
          open={sheetOpen}
          onOpenChange={detail.closeSheet}
          detailMode={detailMode}
          employee={detail.selectedEmployee}
          detail={detail.detail}
          loading={detail.detailLoading}
          timezone={timezone}
          orderDetail={detail.orderDetail}
          orderLoading={detail.orderLoading}
          onSelectOrder={detail.openOrder}
          onBackFromOrder={() => detail.setOrderDetail(null)}
          showSchedule={showScheduleInSheet}
        />
      )}

      <EmployeeExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        exportQuery={exportQuery}
        reportTitle={title}
        dateFrom={toYmd(report.filters.dateFrom)}
        dateTo={toYmd(report.filters.dateTo)}
        disabled={report.loading}
        rowCount={exportRowCount}
        employees={filterOptions.employees || []}
      />
    </div>
  );
}
