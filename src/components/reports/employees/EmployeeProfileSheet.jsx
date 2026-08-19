"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, ChevronRightCircle, MonitorSmartphone, MoveRight } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <span className="inline-flex items-center gap-1 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-semibold uppercase tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
        Clocked In
      </span>
    );
  }
  return (
    <span className="inline-flex items-center py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-semibold uppercase tracking-wide">
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
    <div className="bg-zinc-50 rounded-xl p-2">
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

const SESSION_PREVIEW_COUNT = 3;

function hourInTz(value, timeZone) {
  if (!value) return null;
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(new Date(value))
  );
  return hour === 24 ? 0 : hour;
}

function SessionLogCard({ session, timezone }) {
  return (
    <div className="bg-zinc-50 p-3 space-y-1.5 border-b border-zinc-500 last:border-b-0">
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
      <p className="text-xs text-zinc-800">
        {formatDateTz(session.loginTime, timezone)} · Duration{" "}
        {formatDurationSeconds(session.durationSeconds)}
      </p>
      <div className="flex items-start gap-2 text-xs text-zinc-600">
        <MonitorSmartphone className="h-5 w-5 mt-0.5 shrink-0 text-zinc-400" />
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
  );
}

function FullLogsBody({ employee, sessions, timezone }) {
  const [filterBy, setFilterBy] = useState("day");
  const [dayKey, setDayKey] = useState("ALL");
  const [timeWindow, setTimeWindow] = useState("ALL");
  const [sortDir, setSortDir] = useState("desc");

  const dayOptions = useMemo(() => {
    const keys = [...new Set((sessions || []).map((row) => row.dayKey).filter(Boolean))];
    return keys.sort((a, b) => String(b).localeCompare(String(a)));
  }, [sessions]);

  const visible = useMemo(() => {
    let rows = [...(sessions || [])];
    if (filterBy === "day" && dayKey !== "ALL") {
      rows = rows.filter((row) => row.dayKey === dayKey);
    }
    if (filterBy === "time" && timeWindow !== "ALL") {
      rows = rows.filter((row) => {
        const hour = hourInTz(row.loginTime, timezone);
        if (hour == null) return false;
        if (timeWindow === "morning") return hour < 12;
        if (timeWindow === "afternoon") return hour >= 12 && hour < 17;
        if (timeWindow === "evening") return hour >= 17;
        return true;
      });
    }
    rows.sort((a, b) => {
      const left = new Date(a.loginTime || 0).getTime();
      const right = new Date(b.loginTime || 0).getTime();
      return sortDir === "asc" ? left - right : right - left;
    });
    return rows;
  }, [sessions, filterBy, dayKey, timeWindow, sortDir, timezone]);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div>
        <p className="text-md text-zinc-900">{employee?.name}</p>
        <h3 className="text-sm font-semibold text-zinc-900">Login logs</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{visible.length} of {sessions.length} sessions</p>
      </div>

      <div className="flex bg-zinc-100 border border-zinc-200 rounded-lg p-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`flex-1 h-8 text-xs ${
            filterBy === "day" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
          }`}
          onClick={() => setFilterBy("day")}
        >
          By day
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`flex-1 h-8 text-xs ${
            filterBy === "time" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
          }`}
          onClick={() => setFilterBy("time")}
        >
          By time
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {filterBy === "day" ? (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-black">Day</p>
            <Select value={dayKey} onValueChange={setDayKey}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue placeholder="All days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All days</SelectItem>
                {dayOptions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {formatDateTz(`${key}T12:00:00`, timezone)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-black">Time of day</p>
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All hours</SelectItem>
                <SelectItem value="morning">Morning (before 12pm)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12–5pm)</SelectItem>
                <SelectItem value="evening">Evening (after 5pm)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Sort</p>
          <Select value={sortDir} onValueChange={setSortDir}>
            <SelectTrigger className="h-9 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-500 bg-zinc-50 rounded-xl px-3 py-4 text-center">
          No login sessions match these filters.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((session) => (
            <SessionLogCard key={session.id} session={session} timezone={timezone} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full bg-zinc-200 shrink-0" />
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <Skeleton className="h-6 w-40 bg-zinc-200" />
          <Skeleton className="h-3 w-28 bg-zinc-200" />
          <Skeleton className="h-5 w-20 rounded-full bg-zinc-200" />
        </div>
      </div>

      <div>
        <Skeleton className="h-3 w-32 bg-zinc-200 mb-2" />
        <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 bg-zinc-200" />
              <Skeleton className="h-3 w-44 bg-zinc-200" />
            </div>
            <Skeleton className="h-5 w-12 bg-zinc-200" />
          </div>
          <Skeleton className="h-10 w-full rounded-full bg-zinc-200" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-28 bg-zinc-200" />
          <Skeleton className="h-4 w-16 bg-zinc-200" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl bg-zinc-200" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="bg-zinc-50 rounded-xl p-3 space-y-2">
            <Skeleton className="h-3 w-16 bg-zinc-200" />
            <Skeleton className="h-6 w-20 bg-zinc-200" />
            <Skeleton className="h-1.5 w-full rounded-full bg-zinc-200" />
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-24 bg-zinc-200" />
          <Skeleton className="h-5 w-20 rounded-md bg-zinc-200" />
        </div>
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="px-3 py-2.5 flex items-center justify-between border-b border-zinc-100 last:border-b-0"
            >
              <Skeleton className="h-4 w-24 bg-zinc-200" />
              <Skeleton className="h-4 w-16 bg-zinc-200" />
              <Skeleton className="h-4 w-12 bg-zinc-200" />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 space-y-3">
        <Skeleton className="h-3 w-36 bg-zinc-200" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100 space-y-2">
              <Skeleton className="h-3 w-14 bg-zinc-200" />
              <Skeleton className="h-4 w-16 bg-zinc-200" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100 space-y-2">
              <Skeleton className="h-3 w-20 bg-zinc-200" />
              <Skeleton className="h-4 w-16 bg-zinc-200" />
            </div>
          ))}
        </div>
        <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 space-y-3">
          <Skeleton className="h-3 w-32 bg-zinc-200" />
          <Skeleton className="h-24 w-full rounded-md bg-zinc-200" />
        </div>
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="px-3 py-2.5 grid grid-cols-5 gap-2 border-b border-zinc-100 last:border-b-0"
            >
              <Skeleton className="h-3 w-12 bg-zinc-200" />
              <Skeleton className="h-3 w-16 bg-zinc-200" />
              <Skeleton className="h-3 w-20 bg-zinc-200" />
              <Skeleton className="h-3 w-8 bg-zinc-200 ml-auto" />
              <Skeleton className="h-4 w-12 rounded bg-zinc-200 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 bg-zinc-200" />
        <Skeleton className="h-6 w-44 bg-zinc-200" />
        <Skeleton className="h-5 w-20 rounded-full bg-zinc-200" />
      </div>
      <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
        <Skeleton className="h-5 w-36 bg-zinc-200" />
        <Skeleton className="h-10 w-full rounded-full bg-zinc-200" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-zinc-50 rounded-xl p-3 space-y-2">
            <Skeleton className="h-3 w-14 bg-zinc-200" />
            <Skeleton className="h-6 w-16 bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 bg-zinc-200" />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="bg-zinc-50 rounded-xl p-3 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32 bg-zinc-200" />
              <Skeleton className="h-4 w-14 rounded bg-zinc-200" />
            </div>
            <Skeleton className="h-3 w-24 bg-zinc-200" />
            <Skeleton className="h-3 w-40 bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="bg-zinc-50 rounded-xl p-3 space-y-2">
            <Skeleton className="h-3 w-12 bg-zinc-200" />
            <Skeleton className="h-5 w-16 bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-16 bg-zinc-200" />
        <div className="rounded-xl overflow-hidden border border-zinc-100">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="px-3 py-2.5 flex flex-col gap-2 border-b border-zinc-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 bg-zinc-200" />
                <Skeleton className="h-4 w-14 rounded bg-zinc-200" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-28 bg-zinc-200" />
                <Skeleton className="h-4 w-12 bg-zinc-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32 bg-zinc-200" />
        <Skeleton className="h-3 w-48 bg-zinc-200" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-zinc-50 rounded-xl p-3 space-y-2">
            <Skeleton className="h-3 w-16 bg-zinc-200" />
            <Skeleton className="h-5 w-20 bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="rounded-xl overflow-hidden border border-zinc-100">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="px-3 py-2.5 flex items-center justify-between border-b border-zinc-100 last:border-b-0"
          >
            <Skeleton className="h-4 w-36 bg-zinc-200" />
            <Skeleton className="h-4 w-12 bg-zinc-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CancelledItemsTable({ rows, onSelectOrder, timezone, emptyLabel }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-zinc-500 bg-zinc-50 rounded-xl px-3 py-4 text-center">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="rounded-md border border-zinc-300 overflow-hidden">
      <Table className="border-collapse">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-red-800 bg-red-50 border border-zinc-300">
              Order
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-red-800 bg-red-50 border border-zinc-300">
              Item
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-red-800 bg-red-50 border border-zinc-300 text-right">
              Value
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const even = index % 2 === 1;
            const clickable = typeof onSelectOrder === "function";
            return (
              <TableRow
                key={`${row.orderId}-${index}`}
                className={`${even ? "bg-red-50/70" : "bg-white"} ${
                  clickable ? "cursor-pointer hover:bg-orange-100" : ""
                }`}
                onClick={clickable ? () => onSelectOrder(row.orderId) : undefined}
              >
                <TableCell className={`border border-zinc-300 align-top ${even ? "bg-red-50/70" : ""}`}>
                  <div className="text-xs font-semibold tabular-nums text-zinc-900">
                    {row.orderNumber}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        STATUS_BADGE[row.status] || "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {row.status}
                    </span>
                    {timezone && row.createdAt ? (
                      <span className="text-[10px] text-zinc-500">
                        {formatTimeTz(row.createdAt, timezone)}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={`border border-zinc-300 align-top ${even ? "bg-red-50/70" : ""}`}>
                  <div className="text-xs text-zinc-900">
                    {row.item}
                    {row.qty > 1 ? ` ×${row.qty}` : ""}
                  </div>
                  {row.waiveReason ? (
                    <p className="text-[11px] text-amber-800 mt-1 line-clamp-2">
                      Reason: {row.waiveReason}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell
                  className={`border border-zinc-300 text-right align-top tabular-nums text-xs font-semibold text-red-700 ${
                    even ? "bg-red-50/70" : ""
                  }`}
                >
                  -{money(row.value)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
  onSelectOrder,
}) {
  const latest = attendance.find((row) => row.clockIn) || attendance[0] || null;
  const salesSeries = charts?.salesOverTime || [];
  const hoursSeries = charts?.hoursOverTime || [];
  const showSalesChart = salesSeries.some((row) => Number(row.sales) > 0);
  const showHoursChart = hoursSeries.some((row) => Number(row.hours) > 0);
  const maxCharges = Math.max(Number(overview?.serviceCharges) || 0, 1);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-lg font-semibold shrink-0">
          {employeeInitials(employee.name)}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-zinc-900 truncate">{employee.name}</h3>
          <p className="text-xs text-black font-semibold">
            {employee.role}
            {employee.employeeCode ? ` · ${employee.employeeCode}` : ""}
          </p>
          <div className="mt-1">
            <ClockBadge clockedIn={employee.clockedIn} />
          </div>
          {employee.lastLoginIP && employee.lastLoginIP !== "unknown" ? (
            <p className="text-[12px] text-black mt-1">
              Last IP {employee.lastLoginIP}
              {employee.lastLoginPlatform && employee.lastLoginPlatform !== "unknown"
                ? ` · ${employee.lastLoginPlatform}`
                : ""}
            </p>
          ) : null}
        </div>
      </div>  
      <Separator className="bg-black/20"/>
      <div>
        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-black mb-2">
          Attendance timeline
        </h4>
        <AttendanceTimeline row={latest} timezone={timezone} />
      </div>

      <Separator className="bg-black/30"/>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-black">
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
          <p className="text-[11px] text-zinc-500 mt-1">
            {Number(overview?.tipPercent || employee.tipPercent) || 0}% of {money(overview?.tipPool)} pool
          </p>
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

      <Separator className="bg-black/30"/>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-black">
            Cancelled items
          </h4>
          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
            {(overview?.cancelCount ?? cancelledItems.length)} cancelled
          </Badge>
        </div>
        <CancelledItemsTable
          rows={cancelledItems.slice(0, 8)}
          onSelectOrder={onSelectOrder}
          timezone={timezone}
          emptyLabel="No cancelled items in this period."
        />
      </div>

      <Separator className="bg-black/30"/>

      <div className="space-y-2">
        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-black">
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
            <div key={label} className="bg-zinc-50 rounded p-2.5 border border-zinc-500">
              <p className="text-[10px] uppercase tracking-wider text-black">{label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${label === "Absent" ? "text-red-700" : "text-zinc-900"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-50 rounded p-2.5 border border-zinc-500">
            <p className="text-[10px] uppercase tracking-wider text-black">Total scheduled</p>
            <p className="text-sm font-semibold text-zinc-900 mt-0.5">
              {formatHoursLabel(attendanceStats?.scheduledHours)}
            </p>
          </div>
          <div className="bg-zinc-50 rounded p-2.5 border border-zinc-500">
            <p className="text-[10px] uppercase tracking-wider text-black">Total worked</p>
            <p className="text-sm font-semibold text-orange-700 mt-0.5">
              {formatHoursLabel(attendanceStats?.workedHours)}
            </p>
          </div>
        </div>

        <div className="bg-zinc-50 rounded p-3 border border-zinc-500">
          <p className="text-[10px] uppercase tracking-wider text-black mb-2">Daily working hours</p> 
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
          <div className="mt-3 pt-3 border-t border-zinc-500 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
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

        <div className="rounded border border-zinc-400 overflow-hidden">
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
                      className="cursor-pointer hover:bg-orange-200"
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
                      <TableCell className="text-right flex items-center justify-end gap-1">
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1 py-1 rounded text-[10px] font-semibold ${
                              ATTENDANCE_BADGE[status] || "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-black"/>
                        </div>
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
  allSessions = [],
  orders,
  cancelledItems,
  timezone,
  onSelectOrder,
  onViewAllLogs,
}) {
  const sales = orders
    .filter((row) => row.status !== "CANCELLED" && row.status !== "WAIVED")
    .reduce((sum, row) => sum + ((Number(row.subTotal) || 0) - (Number(row.discountTotal) || 0)), 0);
  const tips = orders.reduce((sum, row) => sum + (Number(row.tipAmount) || 0), 0);
  const logins = sessions.length || (day.clockIn ? 1 : 0);
  const previewSessions = sessions.slice(0, SESSION_PREVIEW_COUNT);
  const hasMoreLogs = sessions.length > SESSION_PREVIEW_COUNT || allSessions.length > SESSION_PREVIEW_COUNT;

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div>
        <p className="text-md text-zinc-900">{employee.name}</p>
        <h3 className="text-sm font-semibold text-zinc-900">
          {formatDateTz(day.date || day.clockIn, timezone)}
        </h3>
        <div className="mt-1">
          <ClockBadge clockedIn={day.isIncomplete} />
        </div>
      </div>
      <Separator className="bg-black/20"/>

      <AttendanceTimeline row={day} timezone={timezone} />

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-black">Logins</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">{logins}</p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-black">Hours</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">
            {day.isIncomplete ? `${formatDuration(day.workedMinutes)}+` : formatDuration(day.workedMinutes)}
          </p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-black">Orders</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">{orders.length}</p>
        </div>
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-black">Sales</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-1">{money(sales)}</p>
        </div>
      </div>
      <Separator className="bg-black/20"/>

      <div>
        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-900 underline mb-2">
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
            {previewSessions.map((session) => (
              <SessionLogCard key={session.id} session={session} timezone={timezone} />
            ))}
          </div>
        )}
        {hasMoreLogs ? (
          <Button
            type="button"
            variant="outline"
            className="w-full h-9 mt-2 bg-white text-xs"
            onClick={onViewAllLogs}
          >
            View all logs
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : null}
      </div>

      <Separator className="bg-black/20"/>

      <div className="bg-zinc-50 rounded-xl p-3 text-sm">
        <p className="text-[11px] uppercase tracking-wider text-black">Order tips</p>
        <p className="font-semibold tabular-nums mt-1">{money(tips)}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-black">
            Cancelled / waived
          </h4>
          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
            {cancelledItems.length}
          </Badge>
        </div>
        <CancelledItemsTable
          rows={cancelledItems}
          onSelectOrder={onSelectOrder}
          timezone={timezone}
          emptyLabel="No cancelled or waived orders this day."
        />
      </div>

      <Separator className="bg-black/20"/>

      <div>
        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-black mb-2">
          Orders
        </h4>
        {orders.length === 0 ? (
          <p className="text-sm text-zinc-500 bg-zinc-50 rounded-xl px-3 py-4 text-center">
            No orders taken this day.
          </p>
        ) : (
          <div className="rounded  overflow-hidden border border-zinc-500">
            {orders.map((row) => (
              <button
                key={row.orderId}
                type="button"
                onClick={() => onSelectOrder(row.orderId)}
                className="w-full px-3 py-2.5 flex flex-col gap-1 bg-white border-b border-zinc-300 last:border-b-0 text-left hover:bg-orange-200 hover:cursor-pointer"
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
  const [showingLogs, setShowingLogs] = useState(false);
  const showingOrder = Boolean(orderDetail) || orderLoading;
  const showingLogHistory = showingLogs && !showingOrder;
  const showingDay = Boolean(selectedDay) && !showingOrder && !showingLogHistory;
  const bodyKey = showingOrder
    ? `order-${orderDetail?._id || "loading"}`
    : showingLogHistory
      ? `logs-${employee?.employeeId || employee?.id || "emp"}`
      : showingDay
        ? `day-${selectedDay?.id}`
        : `emp-${employee?.employeeId || employee?.id || "emp"}`;

  const handleOpenChange = (next) => {
    if (!next) setShowingLogs(false);
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[600px] custom-scrollbar p-0 flex flex-col gap-0 overflow-hidden"
      >
        <SheetHeader className="bg-zinc-50 px-4 py-3 pr-12 border-b border-zinc-200 text-left space-y-0">
          {showingOrder ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 -ml-2 bg-orange-500 text-white"
                onClick={onBackToDay}
              >
                <ArrowLeft className="h-4 w-4 mr-1 text-white" />
                Back
              </Button>
              <div>
                <SheetTitle className="text-base">
                  Order #{orderDetail?.orderNumber || "Order"}
                </SheetTitle>
                <SheetDescription className="text-xs text-zinc-500">Order details</SheetDescription>
              </div>
            </div>
          ) : showingLogHistory ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 -ml-2"
                onClick={() => setShowingLogs(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <SheetTitle className="text-base">Login logs</SheetTitle>
                <SheetDescription>Filter by day or time</SheetDescription>
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
              <OrderDetailSkeleton />
            ) : orderDetail ? (
              <OrderDetailBody order={orderDetail} />
            ) : null
          ) : loading && !detail ? (
            showingDay ? <DayDetailSkeleton /> : <EmployeeProfileSkeleton />
          ) : showingLogHistory ? (
            <FullLogsBody
              employee={detail?.employee || employee}
              sessions={detail?.sessions || []}
              timezone={timezone}
            />
          ) : showingDay && selectedDay ? (
            <DayDetailBody
              employee={detail?.employee || employee}
              day={selectedDay}
              sessions={(detail?.sessions || []).filter(
                (session) => session.dayKey === selectedDay.dayKey
              )}
              allSessions={detail?.sessions || []}
              orders={(detail?.orders || []).filter((order) => order.dayKey === selectedDay.dayKey)}
              cancelledItems={(detail?.cancelledItems || []).filter(
                (item) => item.dayKey === selectedDay.dayKey
              )}
              timezone={timezone}
              onSelectOrder={onSelectOrder}
              onViewAllLogs={() => setShowingLogs(true)}
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
              onSelectOrder={onSelectOrder}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
