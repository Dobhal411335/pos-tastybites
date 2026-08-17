"use client";

import { ArrowLeft, Loader2, MonitorSmartphone } from "lucide-react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import OrderDetailBody from "@/components/reports/OrderDetailBody";
import { PALETTE } from "@/utils/paletteeColor";
import {
  ATTENDANCE_BADGE,
  STATUS_BADGE,
  dayStatusLabel,
  employeeInitials,
  formatDateShortTz,
  formatDateTz,
  formatDuration,
  formatDurationSeconds,
  formatHoursLabel,
  formatTimeTz,
  money,
  timelinePercents,
} from "./employeeFormat";

function ChartTooltip({ active, payload, label, moneyValue = false }) {
  if (!active || payload?.length === 0) return null;
  const value = payload[0].value;
  return (
    <div className="bg-white border border-zinc-200 rounded-md px-2 py-1 text-xs shadow-sm">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold text-zinc-900">
        {moneyValue ? money(value) : Number(value || 0).toLocaleString("en-US")}
      </p>
    </div>
  );
}

function ClockBadge({ clockedIn }) {
  if (clockedIn) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-semibold uppercase tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
        Clocked In
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-semibold uppercase tracking-wide">
      Clocked Out
    </span>
  );
}

function AttendanceTimeline({ row, timezone }) {
  if (!row?.clockIn) {
    return <p className="text-sm text-zinc-500">No clock-in recorded for this day.</p>;
  }
  const { inPct, width } = timelinePercents(
    row.clockIn,
    row.clockOut,
    row.scheduledStart,
    row.scheduledEnd
  );
  const overtime = Number(row.overtimeMinutes) || 0;

  return (
    <div className="bg-zinc-50 rounded-xl p-4">
      <div className="flex justify-between items-end gap-3 mb-3">
        <div>
          <p className="text-base font-semibold text-zinc-900">
            {formatDateTz(row.date || row.clockIn, timezone)}
          </p>
          <p className="text-xs text-zinc-500">
            Scheduled:{" "}
            {row.scheduledStart
              ? `${formatTimeTz(row.scheduledStart, timezone)} – ${formatTimeTz(row.scheduledEnd, timezone)}`
              : "—"}
            {row.scheduledShift ? ` · ${row.scheduledShift}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-zinc-900">
            {row.isIncomplete ? `${formatDuration(row.workedMinutes)}+` : formatDuration(row.workedMinutes)}
          </p>
          {overtime > 0 ? (
            <p className="text-[11px] font-semibold text-orange-700">{formatDuration(overtime)} overtime</p>
          ) : null}
        </div>
      </div>
      <div className="relative h-10 mt-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-200 -translate-y-1/2 rounded-full" />
        <div
          className="absolute top-1/2 h-1 bg-orange-500 -translate-y-1/2 rounded-full"
          style={{ left: `${inPct}%`, width: `${width}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${inPct}%` }}
        >
          <div className="w-3 h-3 rounded-full bg-white border-2 border-orange-500 z-10" />
          <span className="absolute top-4 text-[10px] tabular-nums whitespace-nowrap text-zinc-600">
            {formatTimeTz(row.clockIn, timezone)}
          </span>
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${inPct + width}%` }}
        >
          <div className={`w-3 h-3 rounded-full z-10 ${row.isIncomplete ? "bg-orange-500 animate-pulse" : "bg-orange-500"}`} />
          <span className="absolute top-4 text-[10px] tabular-nums whitespace-nowrap text-zinc-600">
            {row.isIncomplete ? "Now" : formatTimeTz(row.clockOut, timezone)}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmployeeProfileBody({
  employee,
  overview,
  attendance,
  cancelledItems,
  attendanceStats,
  charts,
  timezone,
  onSelectDay,
}) {
  const latest = attendance.find((row) => row.clockIn) || attendance[0] || null;
  const salesSeries = charts?.salesOverTime || [];
  const hoursSeries = charts?.hoursOverTime || [];
  const showSalesChart = salesSeries.some((row) => Number(row.sales) > 0);
  const showHoursChart = hoursSeries.some((row) => Number(row.hours) > 0);
  const maxTips = Math.max(Number(overview?.tips) || 0, 1);
  const maxCharges = Math.max(Number(overview?.serviceCharges) || 0, Number(overview?.tips) || 1);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-lg font-semibold shrink-0">
          {employeeInitials(employee.name)}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-zinc-900 truncate">{employee.name}</h3>
          <p className="text-xs text-zinc-500">
            {employee.role}
            {employee.employeeCode ? ` · ${employee.employeeCode}` : ""}
          </p>
          <div className="mt-1">
            <ClockBadge clockedIn={employee.clockedIn} />
          </div>
          {employee.lastLoginIP && employee.lastLoginIP !== "unknown" ? (
            <p className="text-[11px] text-zinc-400 mt-1">
              Last IP {employee.lastLoginIP}
              {employee.lastLoginPlatform && employee.lastLoginPlatform !== "unknown"
                ? ` · ${employee.lastLoginPlatform}`
                : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Attendance timeline
        </h4>
        <AttendanceTimeline row={latest} timezone={timezone} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Sales performance
          </h4>
          <span className="text-sm font-semibold tabular-nums text-orange-700">
            {money(overview?.sales)}
          </span>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3 h-40">
          {showSalesChart ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesSeries}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={36} />
                <Tooltip content={<ChartTooltip moneyValue />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke={PALETTE.accent}
                  fill="#FFEDD5"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-zinc-400">
              No sales in this period.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Tips</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">{money(overview?.tips)}</p>
          <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-2">
            <div
              className="bg-blue-500 h-full rounded-full"
              style={{ width: `${Math.min(100, ((Number(overview?.tips) || 0) / maxTips) * 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Service charge</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">
            {money(overview?.serviceCharges)}
          </p>
          <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-2">
            <div
              className="bg-zinc-500 h-full rounded-full"
              style={{ width: `${Math.min(100, ((Number(overview?.serviceCharges) || 0) / maxCharges) * 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Hours</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">
            {formatHoursLabel(overview?.hours)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            OT {formatHoursLabel(overview?.overtimeHours)}
          </p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Orders</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">
            {overview?.completedOrders || 0}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            {overview?.cancelCount || 0} cancelled
          </p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Avg order</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">
            {money(overview?.aov)}
          </p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Hourly rate</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">
            {money(employee.hourlyRate)}
          </p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Est. pay</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">
            {money(overview?.estimatedPay)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Reg {money(overview?.regularPay)} · OT {money(overview?.overtimePay)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Cancellations
          </h4>
          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
            {(overview?.cancelCount ?? cancelledItems.length)} cancelled
          </Badge>
        </div>
        {cancelledItems.length === 0 ? (
          <p className="text-sm text-zinc-500 bg-zinc-50 rounded-xl px-3 py-4 text-center">
            No cancelled items in this period.
          </p>
        ) : (
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-zinc-50">
                  <TableHead className="text-[11px]">Order #</TableHead>
                  <TableHead className="text-[11px]">Item</TableHead>
                  <TableHead className="text-[11px] text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancelledItems.slice(0, 8).map((row, index) => (
                  <TableRow key={`${row.orderId}-${index}`}>
                    <TableCell className="text-xs tabular-nums">{row.orderNumber}</TableCell>
                    <TableCell className="text-xs">
                      {row.item}
                      {row.qty > 1 ? ` ×${row.qty}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-red-700">
                      -{money(row.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-200 space-y-3">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Attendance & history
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Scheduled", `${attendanceStats?.scheduledDays || 0} days`],
            ["Worked", `${attendanceStats?.workedDays || 0} days`],
            ["Absent", `${attendanceStats?.absentDays || 0} days`],
            ["Off days", `${attendanceStats?.offDays || 0} days`],
            ["Late", `${attendanceStats?.lateDays || 0} days`],
            ["Avg / day", `${attendanceStats?.avgHoursPerDay || 0}h`],
          ].map(([label, value]) => (
            <div key={label} className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${label === "Absent" ? "text-red-700" : "text-zinc-900"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Total scheduled</p>
            <p className="text-sm font-semibold text-zinc-900 mt-0.5">
              {formatHoursLabel(attendanceStats?.scheduledHours)}
            </p>
          </div>
          <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Total worked</p>
            <p className="text-sm font-semibold text-orange-700 mt-0.5">
              {formatHoursLabel(attendanceStats?.workedHours)}
            </p>
          </div>
        </div>

        <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Daily working hours</p>
          <div className="h-24">
            {showHoursChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hoursSeries}>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#71717a" }} hide />
                  <YAxis tick={{ fontSize: 9, fill: "#71717a" }} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="hours" stroke={PALETTE.accent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-zinc-400">
                No hours in this period.
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-200 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-500">
            <span>
              Avg daily: <b className="text-zinc-800">{attendanceStats?.avgHoursPerDay || 0}h</b>
            </span>
            <span>
              Overtime: <b className="text-orange-700">{formatHoursLabel(attendanceStats?.overtimeHours)}</b>
            </span>
            <span>
              Earliest:{" "}
              <b className="text-zinc-800">{formatTimeTz(attendanceStats?.earliestClockIn, timezone)}</b>
            </span>
            <span>
              Latest:{" "}
              <b className="text-zinc-800">{formatTimeTz(attendanceStats?.latestClockOut, timezone)}</b>
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-zinc-50">
                <TableHead className="text-[10px] uppercase">Date</TableHead>
                <TableHead className="text-[10px] uppercase">Shift</TableHead>
                <TableHead className="text-[10px] uppercase">In/Out</TableHead>
                <TableHead className="text-[10px] uppercase text-right">Hrs</TableHead>
                <TableHead className="text-[10px] uppercase text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-zinc-500 text-center py-6">
                    No attendance rows for this period.
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((row) => {
                  const status = dayStatusLabel(row);
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => onSelectDay(row)}
                    >
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">
                        {formatDateShortTz(row.date || row.clockIn, timezone)}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                        {row.scheduledStart
                          ? `${formatTimeTz(row.scheduledStart, timezone)}–${formatTimeTz(row.scheduledEnd, timezone)}`
                          : row.shiftStatus === "Off"
                            ? "OFF"
                            : "—"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">
                        {formatTimeTz(row.clockIn, timezone)}
                        {" / "}
                        {row.isIncomplete ? "—" : formatTimeTz(row.clockOut, timezone)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {row.isIncomplete ? `${formatDuration(row.workedMinutes)}+` : formatDuration(row.workedMinutes)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            ATTENDANCE_BADGE[status] || "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function DayDetailBody({
  employee,
  day,
  sessions,
  orders,
  cancelledItems,
  timezone,
  onSelectOrder,
}) {
  const sales = orders
    .filter((row) => row.status !== "CANCELLED" && row.status !== "WAIVED")
    .reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0);
  const tips = orders.reduce((sum, row) => sum + (Number(row.tipAmount) || 0), 0);
  const logins = sessions.length || (day.clockIn ? 1 : 0);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div>
        <p className="text-xs text-zinc-500">{employee.name}</p>
        <h3 className="text-lg font-semibold text-zinc-900">
          {formatDateTz(day.date || day.clockIn, timezone)}
        </h3>
        <div className="mt-1">
          <ClockBadge clockedIn={day.isIncomplete} />
        </div>
      </div>

      <AttendanceTimeline row={day} timezone={timezone} />

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Logins</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">{logins}</p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Hours</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">
            {day.isIncomplete ? `${formatDuration(day.workedMinutes)}+` : formatDuration(day.workedMinutes)}
          </p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Orders</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">{orders.length}</p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Sales</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">{money(sales)}</p>
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Login & logout
        </h4>
        {sessions.length === 0 && !day.clockIn ? (
          <p className="text-sm text-zinc-500 bg-zinc-50 rounded-xl px-3 py-4 text-center">
            No login sessions for this day.
          </p>
        ) : sessions.length === 0 ? (
          <div className="bg-zinc-50 rounded-xl p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Clock in</span>
              <span className="font-medium tabular-nums">{formatTimeTz(day.clockIn, timezone)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Clock out</span>
              <span className="font-medium tabular-nums">
                {day.isIncomplete ? "—" : formatTimeTz(day.clockOut, timezone)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Device</span>
              <span className="font-medium">{day.loginDeviceName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Late</span>
              <span className="font-medium">{formatDuration(day.lateMinutes)}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="bg-zinc-50 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium tabular-nums text-zinc-900">
                    {formatTimeTz(session.loginTime, timezone)}
                    {" → "}
                    {session.logoutTime ? formatTimeTz(session.logoutTime, timezone) : "Active"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {session.status || "—"}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  Duration {formatDurationSeconds(session.durationSeconds)}
                </p>
                <div className="flex items-start gap-2 text-xs text-zinc-600">
                  <MonitorSmartphone className="h-3.5 w-3.5 mt-0.5 shrink-0 text-zinc-400" />
                  <div>
                    <p className="font-medium text-zinc-800">{session.deviceName || "Device"}</p>
                    <p>
                      {session.deviceType || "—"}
                      {session.platform && session.platform !== "—" && session.platform !== "unknown"
                        ? ` · ${session.platform}`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Tips</p>
          <p className="font-semibold tabular-nums mt-1">{money(tips)}</p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Cancelled</p>
          <p className="font-semibold tabular-nums mt-1">{cancelledItems.length}</p>
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Orders
        </h4>
        {orders.length === 0 ? (
          <p className="text-sm text-zinc-500 bg-zinc-50 rounded-xl px-3 py-4 text-center">
            No orders taken this day.
          </p>
        ) : (
          <div className="rounded-xl overflow-hidden border border-zinc-100">
            {orders.map((row) => (
              <button
                key={row.orderId}
                type="button"
                onClick={() => onSelectOrder(row.orderId)}
                className="w-full px-3 py-2.5 flex flex-col gap-1 bg-white border-b border-zinc-100 last:border-b-0 text-left hover:bg-orange-50/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-900">{row.orderNumber}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      STATUS_BADGE[row.status] || "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs">
                    {formatTimeTz(row.createdAt, timezone)}
                    {row.tableNo && row.tableNo !== "—" ? ` · Table ${row.tableNo}` : ""}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-zinc-900">
                    {money(row.totalAmount)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmployeeProfileSheet({
  open,
  onOpenChange,
  employee,
  detail,
  loading,
  timezone,
  selectedDay,
  onSelectDay,
  onBackToEmployee,
  orderDetail,
  orderLoading,
  onSelectOrder,
  onBackToDay,
}) {
  const showingOrder = Boolean(orderDetail) || orderLoading;
  const showingDay = Boolean(selectedDay) && !showingOrder;
  const bodyKey = showingOrder
    ? `order-${orderDetail?._id || "loading"}`
    : showingDay
      ? `day-${selectedDay?.id}`
      : `emp-${employee?.employeeId || employee?.id || "emp"}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[500px] custom-scrollbar p-0 flex flex-col gap-0 overflow-hidden"
      >
        <SheetHeader className="bg-zinc-50 px-4 py-3 pr-12 border-b border-zinc-200 text-left space-y-0">
          {showingOrder ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 -ml-2"
                onClick={onBackToDay}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <SheetTitle className="text-base">
                  {orderDetail?.orderNumber || "Order"}
                </SheetTitle>
                <SheetDescription>Order details</SheetDescription>
              </div>
            </div>
          ) : showingDay ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 -ml-2"
                onClick={onBackToEmployee}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <SheetTitle className="text-base">Day details</SheetTitle>
                <SheetDescription>
                  {formatDateTz(selectedDay.date || selectedDay.clockIn, timezone)}
                </SheetDescription>
              </div>
            </div>
          ) : (
            <>
              <SheetTitle className="text-base">Staff profile</SheetTitle>
              <SheetDescription className="sr-only">
                Attendance, sales, and login history
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <div key={bodyKey} className="flex-1 overflow-y-auto px-4 py-4 sheet-body-in">
          {showingOrder ? (
            orderLoading ? (
              <div className="py-10 flex justify-center text-sm text-zinc-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading order…
              </div>
            ) : orderDetail ? (
              <OrderDetailBody order={orderDetail} />
            ) : null
          ) : loading && !detail ? (
            <div className="py-10 flex justify-center text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading employee…
            </div>
          ) : showingDay && selectedDay ? (
            <DayDetailBody
              employee={detail?.employee || employee}
              day={selectedDay}
              sessions={(detail?.sessions || []).filter(
                (session) => session.dayKey === selectedDay.dayKey
              )}
              orders={(detail?.orders || []).filter((order) => order.dayKey === selectedDay.dayKey)}
              cancelledItems={(detail?.cancelledItems || []).filter(
                (item) => item.dayKey === selectedDay.dayKey
              )}
              timezone={timezone}
              onSelectOrder={onSelectOrder}
            />
          ) : detail ? (
            <EmployeeProfileBody
              employee={detail.employee || employee}
              overview={detail.overview}
              attendance={detail.attendance || []}
              cancelledItems={detail.cancelledItems || []}
              attendanceStats={detail.attendanceStats}
              charts={detail.charts}
              timezone={timezone}
              onSelectDay={onSelectDay}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
