"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EmployeeReportPageShell from "../EmployeeReportPageShell";
import {
  ChartCard,
  EmployeeKpiCards,
  NamedBarChart,
  ReportEmpty,
  TableSkeleton,
} from "../EmployeeReportUi";
import {
  formatDateTz,
  formatHoursLabel,
  formatTimeTz,
  money,
} from "../employeeFormat";

export default function EmployeeClockReport() {
  return (
    <EmployeeReportPageShell
      title="Clock In / Out"
      description="Attendance punches for the selected period."
      section="attendance"
      exportView="clock"
      detailMode="clock"
      paginate
      showShift
      showStatus={false}
      showPayment={false}
      limit={50}
    >
      {({ data, loading, openEmployee, applyFilters, filters, timezone }) => {
        const rows = data?.rows || [];
        const summary = data?.summary || {};
        const pagination = data?.pagination || {};

        const hoursByEmp = {};
        for (const row of rows) {
          const key = row.employeeId || row.employeeName;
          if (!hoursByEmp[key]) {
            hoursByEmp[key] = { label: row.employeeName, value: 0, employeeId: row.employeeId };
          }
          hoursByEmp[key].value += Number(row.workedHours) || 0;
        }
        const hoursChart = Object.values(hoursByEmp)
          .map((r) => ({ ...r, value: Math.round(r.value * 100) / 100 }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        if (!loading && rows.length === 0) {
          return <ReportEmpty message="No clock-in records for this period." />;
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              title="Clock-in highlights"
              description="Attendance punches and hours for this period"
              items={[
                { label: "Total Hours", value: formatHoursLabel(summary.totalHours) },
                { label: "Average Hours", value: formatHoursLabel(summary.averageHours) },
                { label: "Overtime", value: formatHoursLabel(summary.overtimeHours) },
                { label: "Currently Working", value: summary.currentlyWorking || 0 },
                { label: "Attendance Count", value: summary.attendanceCount || 0 },
              ]}
            />
            <ChartCard title="Working hours by employee" loading={loading} empty={!hoursChart.length}>
              <NamedBarChart data={hoursChart} moneyValue={false} color="#8b5cf6" />
            </ChartCard>
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              {loading ? (
                <div className="p-4"><TableSkeleton cols={8} /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50">
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">OT</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-orange-50/40"
                        onClick={() =>
                          row.employeeId &&
                          openEmployee(row.employeeId, {
                            employeeId: row.employeeId,
                            name: row.employeeName,
                            role: row.role,
                          })
                        }
                      >
                        <TableCell>
                          <p className="text-sm font-semibold">{row.employeeName}</p>
                          <p className="text-xs text-zinc-500">{row.role}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTz(row.date || row.clockIn, timezone)}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {formatTimeTz(row.clockIn, timezone)}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {row.isIncomplete ? "—" : formatTimeTz(row.clockOut, timezone)}
                        </TableCell>
                        <TableCell className="text-zinc-400">—</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatHoursLabel(row.workedHours)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatHoursLabel(row.overtimeHours)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {row.isIncomplete
                            ? "Working"
                            : row.attendanceStatus || row.shiftStatus || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {pagination.pages > 1 ? (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() => applyFilters({ page: filters.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-xs text-zinc-500">
                  Page {pagination.page} / {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= pagination.pages}
                  onClick={() => applyFilters({ page: filters.page + 1 })}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}

export function EmployeeTimesheetReport() {
  return (
    <EmployeeReportPageShell
      title="Timesheet Details"
      description="Scheduled vs actual worked time from attendance logs."
      section="attendance"
      exportView="timesheet"
      detailMode="clock"
      showScheduleInSheet
      paginate
      showShift
      showStatus={false}
      showPayment={false}
    >
      {({ data, loading, openEmployee, applyFilters, filters, timezone }) => {
        const rows = data?.rows || [];
        const pagination = data?.pagination || {};
        const summary = data?.summary || {};
        const pageHours = rows.reduce((s, r) => s + (Number(r.workedHours) || 0), 0);
        const pageOt = rows.reduce((s, r) => s + (Number(r.overtimeHours) || 0), 0);
        const incomplete = rows.filter((r) => r.isIncomplete).length;

        if (!loading && rows.length === 0) {
          return <ReportEmpty message="No timesheet records for this period." />;
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              title="Timesheet highlights"
              description="Scheduled vs actual punches for this period"
              items={[
                {
                  label: "Total Hours",
                  value: formatHoursLabel(summary.totalHours ?? pageHours),
                },
                {
                  label: "Overtime",
                  value: formatHoursLabel(summary.overtimeHours ?? pageOt),
                },
                { label: "Punches", value: pagination.total || rows.length },
                { label: "Open shifts", value: incomplete },
              ]}
            />
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              {loading ? (
                <div className="p-4"><TableSkeleton cols={9} /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Scheduled Shift</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead className="text-right">Regular</TableHead>
                      <TableHead className="text-right">OT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-orange-50/40"
                        onClick={() =>
                          row.employeeId &&
                          openEmployee(row.employeeId, {
                            employeeId: row.employeeId,
                            name: row.employeeName,
                            role: row.role,
                          })
                        }
                      >
                        <TableCell className="text-sm">
                          {formatDateTz(row.date || row.clockIn, timezone)}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-semibold">{row.employeeName}</p>
                          <p className="text-xs text-zinc-500">{row.role}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.scheduledShift || "—"}
                          {row.scheduledStart ? (
                            <p className="text-[11px] text-zinc-400">
                              {formatTimeTz(row.scheduledStart, timezone)}
                              {row.scheduledEnd
                                ? ` – ${formatTimeTz(row.scheduledEnd, timezone)}`
                                : ""}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {formatTimeTz(row.clockIn, timezone)}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {row.isIncomplete ? "—" : formatTimeTz(row.clockOut, timezone)}
                        </TableCell>
                        <TableCell className="text-zinc-400">—</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatHoursLabel(row.regularHours)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatHoursLabel(row.overtimeHours)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatHoursLabel(row.workedHours)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {pagination.pages > 1 ? (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() => applyFilters({ page: filters.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-xs text-zinc-500">
                  Page {pagination.page} / {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= pagination.pages}
                  onClick={() => applyFilters({ page: filters.page + 1 })}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}
