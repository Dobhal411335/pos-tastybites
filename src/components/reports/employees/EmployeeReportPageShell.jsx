"use client";

import { useState } from "react";
import EmployeeReportToolbar from "./EmployeeReportToolbar";
import EmployeeExportDialog from "./EmployeeExportDialog";
import EmployeeProfileSheet from "./EmployeeProfileSheet";
import { ReportError } from "./EmployeeReportUi";
import { toYmd } from "./employeeFormat";
import {
  useEmployeeDetailLoader,
  useEmployeeReport,
} from "./useEmployeeReportQuery";

/**
 * Shared shell for employee report pages.
 */
export default function EmployeeReportPageShell({
  title,
  description,
  section = "summary",
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
  children,
}) {
  const report = useEmployeeReport(section, { paginate, sort, sortDir, limit });
  const detail = useEmployeeDetailLoader(report.filters);
  const [exportOpen, setExportOpen] = useState(false);

  const filterOptions = report.data?.filters || { employees: [], shifts: [] };

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
          timezone: report.data?.meta?.timezone || "Asia/Kolkata",
        })
      )}

      <EmployeeProfileSheet
        open={Boolean(detail.selectedEmployeeId)}
        onOpenChange={detail.closeSheet}
        employee={detail.selectedEmployee}
        detail={detail.detail}
        loading={detail.detailLoading}
        timezone={report.data?.meta?.timezone || "Asia/Kolkata"}
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

      <EmployeeExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        exportQuery={report.exportQuery}
        dateFrom={toYmd(report.filters.dateFrom)}
        dateTo={toYmd(report.filters.dateTo)}
        disabled={report.loading}
        rowCount={(report.data?.performance || report.data?.rows || []).length}
        employees={filterOptions.employees || []}
      />
    </div>
  );
}
