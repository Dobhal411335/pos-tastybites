"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderDetailBody, {
  STATUS_BADGE,
  money,
} from "@/components/reports/OrderDetailBody";
import { PALETTE } from "@/utils/paletteeColor";

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "WAIVED", label: "Waived" },
];

const PAYMENT_OPTIONS = [
  { value: "ALL", label: "All methods" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "GIFT_CARD", label: "Gift Card" },
];

const ATTENDANCE_BADGE = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Late: "bg-amber-50 text-amber-700 border-amber-200",
  Absent: "bg-red-50 text-red-700 border-red-200",
  "Half Day": "bg-orange-50 text-orange-700 border-orange-200",
  Leave: "bg-zinc-100 text-zinc-600 border-zinc-200",
  Holiday: "bg-blue-50 text-blue-700 border-blue-200",
  "Emergency Duty": "bg-violet-50 text-violet-700 border-violet-200",
};

const PERFORMANCE_SORTS = [
  { value: "sales", label: "Sales" },
  { value: "orders", label: "Orders" },
  { value: "hours", label: "Hours" },
  { value: "overtimeHours", label: "Overtime" },
  { value: "tips", label: "Tips" },
  { value: "estimatedPay", label: "Estimated Pay" },
  { value: "cancellations", label: "Cancellations" },
];

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toYmd(date) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function presetRange(preset, today = startOfDay()) {
  if (preset === "yesterday") {
    const yesterday = subDays(today, 1);
    return { from: yesterday, to: yesterday };
  }
  if (preset === "this_week") {
    return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
  }
  if (preset === "last_week") {
    const last = subWeeks(today, 1);
    return {
      from: startOfWeek(last, { weekStartsOn: 1 }),
      to: endOfWeek(last, { weekStartsOn: 1 }),
    };
  }
  if (preset === "this_month") {
    return { from: startOfMonth(today), to: today };
  }
  if (preset === "last_month") {
    const last = subMonths(today, 1);
    return { from: startOfMonth(last), to: endOfMonth(last) };
  }
  return { from: today, to: today };
}

function defaultFilters() {
  const today = startOfDay();
  return {
    employeeId: "ALL",
    preset: "today",
    dateFrom: today,
    dateTo: today,
    shiftId: "ALL",
    orderStatus: "ALL",
    paymentMethod: "ALL",
  };
}

function formatInTz(value, timeZone, options) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone, ...options }).format(new Date(value));
}

function formatTimeTz(value, timeZone) {
  return formatInTz(value, timeZone, { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDateTz(value, timeZone) {
  return formatInTz(value, timeZone, { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0 && rest === 0) return "0h";
  if (rest === 0) return `${hours}h`;
  if (hours === 0) return `${rest}m`;
  return `${hours}h ${rest}m`;
}

function hoursLabel(value) {
  return `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} hrs`;
}

function filterKey(filters) {
  return [
    filters.employeeId,
    toYmd(filters.dateFrom),
    toYmd(filters.dateTo),
    filters.shiftId,
    filters.orderStatus,
    filters.paymentMethod,
  ].join("|");
}

function syncEmployeeQuery(id) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id && id !== "ALL") url.searchParams.set("employeeId", id);
  else url.searchParams.delete("employeeId");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function ChartCard({ title, children, empty }) {
  return (
    <div className="border border-zinc-200 rounded-lg bg-white p-3 min-h-52">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
        {title}
      </p>
      {empty ? (
        <div className="h-40 flex items-center justify-center text-sm text-zinc-400">
          No data available for the selected period.
        </div>
      ) : (
        <div className="h-40">{children}</div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label, moneyValue = false }) {
  if (!active || !payload?.length) return null;
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

function KpiCard({ label, value }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-xl font-semibold text-zinc-900 tabular-nums leading-tight mt-0.5">
        {value}
      </p>
    </div>
  );
}

function SortHeader({ label, active, onClick, align = "right" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 ${align === "right" ? "ml-auto" : ""}`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${active ? "text-orange-500" : "text-zinc-400"}`} />
    </button>
  );
}

export default function EmployeeReports() {
  const [draft, setDraft] = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("overview");
  const [perfSort, setPerfSort] = useState("sales");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendancePage, setAttendancePage] = useState(1);

  const [orders, setOrders] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderSort, setOrderSort] = useState("createdAt");
  const [orderSortDir, setOrderSortDir] = useState("desc");

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const attendanceCacheKey = useRef("");
  const ordersCacheKey = useRef("");

  const appliedKey = filterKey(applied);
  const timezone = report?.meta?.timezone || "Asia/Kolkata";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const employeeId = params.get("employeeId");
    if (employeeId) {
      setDraft((prev) => ({ ...prev, employeeId }));
      setApplied((prev) => ({ ...prev, employeeId }));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setOrderSearch(orderSearchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [orderSearchInput]);

  const summaryParams = useCallback(() => {
    const params = new URLSearchParams({
      dateFrom: toYmd(applied.dateFrom),
      dateTo: toYmd(applied.dateTo),
      orderStatus: applied.orderStatus,
      paymentMethod: applied.paymentMethod,
      section: "summary",
    });
    if (applied.employeeId && applied.employeeId !== "ALL") {
      params.set("employeeId", applied.employeeId);
    }
    if (applied.shiftId && applied.shiftId !== "ALL") {
      params.set("shiftId", applied.shiftId);
    }
    return params;
  }, [applied]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/employees?${summaryParams()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Unable to load employee report.");
      setReport(json.data);
      setAttendance(null);
      setOrders(null);
      setAttendancePage(1);
      setOrdersPage(1);
      attendanceCacheKey.current = "";
      ordersCacheKey.current = "";
    } catch (err) {
      setError(err.message || "Unable to load employee report.");
      setReport(null);
      toast.error(err.message || "Unable to load employee report.");
    } finally {
      setLoading(false);
    }
  }, [summaryParams]);

  useEffect(() => {
    if (!ready) return;
    fetchSummary();
  }, [ready, fetchSummary]);

  const fetchAttendance = useCallback(
    async (page = 1) => {
      setAttendanceLoading(true);
      try {
        const params = summaryParams();
        params.set("section", "attendance");
        params.set("page", String(page));
        params.set("limit", "50");
        const res = await fetch(`/api/admin/reports/employees?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Unable to load attendance.");
        setAttendance(json.data);
      } catch (err) {
        toast.error(err.message || "Unable to load attendance.");
      } finally {
        setAttendanceLoading(false);
      }
    },
    [summaryParams]
  );

  const fetchOrders = useCallback(
    async (page = 1) => {
      setOrdersLoading(true);
      try {
        const params = summaryParams();
        params.set("section", "orders");
        params.set("page", String(page));
        params.set("limit", "25");
        params.set("sort", orderSort);
        params.set("sortDir", orderSortDir);
        if (orderSearch) params.set("search", orderSearch);
        const res = await fetch(`/api/admin/reports/employees?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Unable to load orders.");
        setOrders(json.data);
      } catch (err) {
        toast.error(err.message || "Unable to load orders.");
      } finally {
        setOrdersLoading(false);
      }
    },
    [summaryParams, orderSearch, orderSort, orderSortDir]
  );

  useEffect(() => {
    if (!ready || loading || error) return;
    if (tab !== "attendance") return;
    const key = `${appliedKey}|${attendancePage}`;
    if (attendance && attendanceCacheKey.current === key) return;
    attendanceCacheKey.current = key;
    fetchAttendance(attendancePage);
  }, [tab, appliedKey, attendancePage, attendance, ready, loading, error, fetchAttendance]);

  useEffect(() => {
    if (!ready || loading || error) return;
    if (tab !== "orders") return;
    const key = `${appliedKey}|${ordersPage}|${orderSearch}|${orderSort}|${orderSortDir}`;
    if (orders && ordersCacheKey.current === key) return;
    ordersCacheKey.current = key;
    fetchOrders(ordersPage);
  }, [tab, appliedKey, ordersPage, orderSearch, orderSort, orderSortDir, orders, ready, loading, error, fetchOrders]);

  const applyFilters = () => {
    setApplied({ ...draft });
    syncEmployeeQuery(draft.employeeId);
  };

  const clearFilters = () => {
    const next = defaultFilters();
    setDraft(next);
    setApplied(next);
    setOrderSearchInput("");
    setOrderSearch("");
    setPerfSort("sales");
    syncEmployeeQuery("ALL");
  };

  const selectEmployee = (employeeId) => {
    const nextId = employeeId || "ALL";
    setDraft((prev) => ({ ...prev, employeeId: nextId }));
    setApplied((prev) => ({ ...prev, employeeId: nextId }));
    setTab("overview");
    syncEmployeeQuery(nextId);
  };

  const updateDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const onPresetChange = (preset) => {
    if (preset === "custom") {
      updateDraft({ preset });
      return;
    }
    const range = presetRange(preset);
    updateDraft({ preset, dateFrom: startOfDay(range.from), dateTo: startOfDay(range.to) });
  };

  const openOrder = async (orderId) => {
    setSelectedOrderId(orderId);
    setOrderDetail(null);
    setOrderDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Order not found");
      setOrderDetail(json.data);
    } catch (err) {
      toast.error(err.message || "Failed to load order");
      setSelectedOrderId(null);
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const overview = report?.overview;
  const performance = report?.performance || [];
  const charts = report?.charts || {};
  const employees = report?.filters?.employees || [];
  const shifts = report?.filters?.shifts || [];
  const selected = report?.selectedEmployee;
  const hasActivity =
    Number(overview?.totalHours) > 0 ||
    Number(overview?.totalOrders) > 0 ||
    performance.some((row) => row.hours > 0 || row.totalOrders > 0);

  const sortedPerformance = useMemo(() => {
    const copy = [...performance];
    copy.sort((a, b) => {
      const diff = (Number(b[perfSort]) || 0) - (Number(a[perfSort]) || 0);
      return diff || a.name.localeCompare(b.name);
    });
    return copy;
  }, [performance, perfSort]);

  const rangeLabel = `${format(applied.dateFrom, "d MMM yyyy")} – ${format(applied.dateTo, "d MMM yyyy")}`;

  const toggleOrderSort = (key) => {
    setOrdersPage(1);
    if (orderSort === key) {
      setOrderSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setOrderSort(key);
    setOrderSortDir(key === "createdAt" ? "desc" : "asc");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Employee & Staff Reports</h1>
        <p className="text-sm text-zinc-500">
          Attendance, pay estimates, sales, tips, and orders from existing clock-in and POS data.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">Employee</Label>
            <Select
              value={draft.employeeId}
              onValueChange={(value) => updateDraft({ employeeId: value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">Date Range</Label>
            <Select value={draft.preset} onValueChange={onPresetChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">From</Label>
            <DatePicker
              value={draft.dateFrom}
              onChange={(value) =>
                value && updateDraft({ preset: "custom", dateFrom: startOfDay(value) })
              }
              placeholder="Start date"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">To</Label>
            <DatePicker
              value={draft.dateTo}
              onChange={(value) =>
                value && updateDraft({ preset: "custom", dateTo: startOfDay(value) })
              }
              placeholder="End date"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">Shift</Label>
            <Select
              value={draft.shiftId}
              onValueChange={(value) => updateDraft({ shiftId: value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All shifts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All shifts</SelectItem>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">Order Status</Label>
            <Select
              value={draft.orderStatus}
              onValueChange={(value) => updateDraft({ orderStatus: value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">Payment</Label>
            <Select
              value={draft.paymentMethod}
              onValueChange={(value) => updateDraft({ paymentMethod: value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="button" className="h-9 text-xs flex-1" onClick={applyFilters}>
              Apply Filters
            </Button>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={clearFilters}>
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {selected ? (
        <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-900">{selected.name}</p>
            <p className="text-xs text-zinc-500">
              {selected.role}
              {selected.employeeCode ? ` · ${selected.employeeCode}` : ""} · {rangeLabel}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => selectEmployee("ALL")}
          >
            All employees
          </Button>
        </div>
      ) : null}

      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <div className="bg-white border border-zinc-200 rounded-lg h-48 flex flex-col items-center justify-center gap-3 text-sm text-zinc-500">
          <p>Unable to load employee report.</p>
          <Button type="button" variant="outline" className="h-8 text-xs" onClick={fetchSummary}>
            Retry
          </Button>
        </div>
      ) : !hasActivity && !selected ? (
        <div className="bg-white border border-zinc-200 rounded-lg h-48 flex items-center justify-center text-sm text-zinc-500">
          No employee activity found for the selected period.
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-3">
          <div className="bg-white border border-zinc-200 rounded-lg px-3 pt-3 overflow-x-auto">
            <TabsList className="h-8">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
              <TabsTrigger value="sales" className="text-xs">Sales Performance</TabsTrigger>
              <TabsTrigger value="tips" className="text-xs">Tips & Charges</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <KpiCard label="Employees" value={overview.employees} />
              <KpiCard label="Total Hours" value={hoursLabel(overview.totalHours)} />
              <KpiCard label="Regular" value={hoursLabel(overview.regularHours)} />
              <KpiCard label="Overtime" value={hoursLabel(overview.overtimeHours)} />
              <KpiCard label="Regular Pay" value={money(overview.regularPay)} />
              <KpiCard label="Overtime Pay" value={money(overview.overtimePay)} />
              <KpiCard label="Estimated Pay" value={money(overview.estimatedPay)} />
              <KpiCard label="Total Sales" value={money(overview.totalSales)} />
              <KpiCard label="Tips" value={money(overview.totalTips)} />
              <KpiCard label="Service Charges" value={money(overview.serviceCharges)} />
              <KpiCard label="Orders" value={overview.totalOrders} />
              <KpiCard
                label="Completed / Cancelled"
                value={`${overview.completedOrders} / ${overview.cancelledOrders}`}
              />
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg">
              <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Employee performance
                </p>
                <Select value={perfSort} onValueChange={setPerfSort}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERFORMANCE_SORTS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        Sort by {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <PerformanceTable
                rows={sortedPerformance}
                sortKey={perfSort}
                onSort={setPerfSort}
                onSelect={selectEmployee}
              />
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-0">
            <div className="bg-white border border-zinc-200 rounded-lg">
              {attendanceLoading && !attendance ? (
                <div className="h-48 flex items-center justify-center text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading attendance…
                </div>
              ) : !attendance?.rows?.length ? (
                <div className="h-40 flex items-center justify-center text-sm text-zinc-500">
                  No employee activity found for the selected period.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] uppercase tracking-wide">Employee</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Date</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Scheduled Shift</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Clock In</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Clock Out</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-right">Worked</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-right">Regular</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-right">Overtime</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.rows.map((row) => (
                          <TableRow
                            key={row.id}
                            className="cursor-pointer"
                            onClick={() => row.employeeId && selectEmployee(row.employeeId)}
                          >
                            <TableCell className="text-sm font-medium whitespace-nowrap">
                              {row.employeeName}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatDateTz(row.date || row.clockIn, timezone)}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {row.scheduledShift ? `${row.scheduledShift} · ` : ""}
                              {row.scheduledStart
                                ? `${formatTimeTz(row.scheduledStart, timezone)} – ${formatTimeTz(row.scheduledEnd, timezone)}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatTimeTz(row.clockIn, timezone)}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {row.isIncomplete ? "—" : formatTimeTz(row.clockOut, timezone)}
                            </TableCell>
                            <TableCell className="text-sm text-right whitespace-nowrap">
                              {row.isIncomplete ? "—" : formatDuration(row.workedMinutes)}
                            </TableCell>
                            <TableCell className="text-sm text-right whitespace-nowrap">
                              {row.isIncomplete ? "—" : formatDuration(row.regularMinutes)}
                            </TableCell>
                            <TableCell className="text-sm text-right whitespace-nowrap">
                              {row.isIncomplete ? "—" : formatDuration(row.overtimeMinutes)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${ATTENDANCE_BADGE[row.attendanceStatus] || "bg-zinc-50 text-zinc-600"}`}
                              >
                                {row.isIncomplete ? `${row.attendanceStatus} · Open` : row.attendanceStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <PaginationBar
                    pagination={attendance.pagination}
                    loading={attendanceLoading}
                    onPage={setAttendancePage}
                  />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sales" className="mt-0 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ChartCard
                title="Sales by Employee"
                empty={!charts.salesByEmployee?.some((row) => Number(row.sales) > 0)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.salesByEmployee} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} />
                    <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 10, fill: "#71717a" }} />
                    <Tooltip content={<ChartTooltip moneyValue />} />
                    <Bar dataKey="sales" fill={PALETTE.accent} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Sales Over Time"
                empty={!charts.salesOverTime?.some((row) => Number(row.sales) > 0)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.salesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={42} />
                    <Tooltip content={<ChartTooltip moneyValue />} />
                    <Line type="monotone" dataKey="sales" stroke={PALETTE.accent} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Orders by Employee"
                empty={!charts.ordersByEmployee?.some((row) => Number(row.orders) > 0)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.ordersByEmployee} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#71717a" }} />
                    <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 10, fill: "#71717a" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Average Order Value by Employee"
                empty={!charts.aovByEmployee?.some((row) => Number(row.aov) > 0)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.aovByEmployee} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} />
                    <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 10, fill: "#71717a" }} />
                    <Tooltip content={<ChartTooltip moneyValue />} />
                    <Bar dataKey="aov" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wide">Employee</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Orders</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Completed</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Sales</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Avg Order</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Discount</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Cancelled</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Waived</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report.sales || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-zinc-500 text-center py-8">
                        No data available for the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.sales.map((row) => (
                      <TableRow
                        key={row.employeeId}
                        className="cursor-pointer"
                        onClick={() => selectEmployee(row.employeeId)}
                      >
                        <TableCell className="text-sm font-medium whitespace-nowrap">
                          {row.name}
                          <span className="ml-2 text-[11px] font-normal text-zinc-400">{row.role}</span>
                        </TableCell>
                        <TableCell className="text-sm text-right">{row.totalOrders}</TableCell>
                        <TableCell className="text-sm text-right">{row.completedOrders}</TableCell>
                        <TableCell className="text-sm text-right whitespace-nowrap">{money(row.sales)}</TableCell>
                        <TableCell className="text-sm text-right whitespace-nowrap">{money(row.aov)}</TableCell>
                        <TableCell className="text-sm text-right whitespace-nowrap">{money(row.discounts)}</TableCell>
                        <TableCell className="text-sm text-right">{row.cancelledOrders}</TableCell>
                        <TableCell className="text-sm text-right">{row.waivedOrders}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="mt-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <KpiCard label="Total Tips" value={money(report.tips?.totals?.tips)} />
              <KpiCard label="Average Tip" value={money(report.tips?.totals?.averageTip)} />
              <KpiCard label="Service Charges" value={money(report.tips?.totals?.serviceCharges)} />
              <KpiCard label="Tips + Charges" value={money(report.tips?.totals?.totalTipsAndCharges)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ChartCard
                title="Tips by Employee"
                empty={!charts.tipsByEmployee?.some((row) => Number(row.tips) > 0)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.tipsByEmployee} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} />
                    <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 10, fill: "#71717a" }} />
                    <Tooltip content={<ChartTooltip moneyValue />} />
                    <Bar dataKey="tips" fill={PALETTE.accent} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Tips Over Time"
                empty={!charts.tipsOverTime?.some((row) => Number(row.tips) > 0)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.tipsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={42} />
                    <Tooltip content={<ChartTooltip moneyValue />} />
                    <Line type="monotone" dataKey="tips" stroke={PALETTE.accent} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Service Charges by Employee"
                empty={!charts.serviceChargesByEmployee?.some((row) => Number(row.serviceCharges) > 0)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.serviceChargesByEmployee} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} />
                    <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 10, fill: "#71717a" }} />
                    <Tooltip content={<ChartTooltip moneyValue />} />
                    <Bar dataKey="serviceCharges" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Service Charges Over Time"
                empty={!charts.serviceChargesOverTime?.some((row) => Number(row.serviceCharges) > 0)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.serviceChargesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={42} />
                    <Tooltip content={<ChartTooltip moneyValue />} />
                    <Line type="monotone" dataKey="serviceCharges" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wide">Employee</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Orders</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Tips</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Average Tip</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Service Charges</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Average Charge</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Tips + Charges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report.tips?.employees || []).map((row) => (
                    <TableRow
                      key={row.employeeId}
                      className="cursor-pointer"
                      onClick={() => selectEmployee(row.employeeId)}
                    >
                      <TableCell className="text-sm font-medium whitespace-nowrap">{row.name}</TableCell>
                      <TableCell className="text-sm text-right">{row.orders}</TableCell>
                      <TableCell className="text-sm text-right whitespace-nowrap">{money(row.tips)}</TableCell>
                      <TableCell className="text-sm text-right whitespace-nowrap">{money(row.averageTip)}</TableCell>
                      <TableCell className="text-sm text-right whitespace-nowrap">{money(row.serviceCharges)}</TableCell>
                      <TableCell className="text-sm text-right whitespace-nowrap">{money(row.averageCharge)}</TableCell>
                      <TableCell className="text-sm text-right font-semibold whitespace-nowrap">
                        {money(row.totalTipsAndCharges)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <KpiCard label="Total Orders" value={report.cancellations?.totals?.totalOrders || 0} />
              <KpiCard label="Completed" value={report.cancellations?.totals?.completed || 0} />
              <KpiCard label="Cancelled" value={report.cancellations?.totals?.cancelled || 0} />
              <KpiCard label="Waived" value={report.cancellations?.totals?.waived || 0} />
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto">
              <div className="px-3 py-2 border-b border-zinc-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Cancellation breakdown
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wide">Employee</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Total Orders</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Cancelled</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Waived</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">Cancellation Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report.cancellations?.employees || []).map((row) => (
                    <TableRow
                      key={row.employeeId}
                      className="cursor-pointer"
                      onClick={() => selectEmployee(row.employeeId)}
                    >
                      <TableCell className="text-sm font-medium whitespace-nowrap">{row.name}</TableCell>
                      <TableCell className="text-sm text-right">{row.totalOrders}</TableCell>
                      <TableCell className="text-sm text-right">{row.cancelled}</TableCell>
                      <TableCell className="text-sm text-right">{row.waived}</TableCell>
                      <TableCell className="text-sm text-right">{row.cancellationRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg">
              <div className="px-3 py-2 flex flex-wrap items-center gap-2 border-b border-zinc-100">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <Input
                    value={orderSearchInput}
                    onChange={(event) => {
                      setOrderSearchInput(event.target.value);
                      setOrdersPage(1);
                    }}
                    placeholder="Search order number"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              {ordersLoading && !orders ? (
                <div className="h-48 flex items-center justify-center text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading orders…
                </div>
              ) : !orders?.rows?.length ? (
                <div className="h-40 flex items-center justify-center text-sm text-zinc-500">
                  No employee activity found for the selected period.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] uppercase tracking-wide">
                            <button type="button" onClick={() => toggleOrderSort("orderNumber")}>
                              Order #
                            </button>
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">
                            <button type="button" onClick={() => toggleOrderSort("createdAt")}>
                              Date
                            </button>
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Time</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">
                            <button type="button" onClick={() => toggleOrderSort("employee")}>
                              Employee
                            </button>
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Table</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Guest</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Items</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-right">Subtotal</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-right">Discount</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-right">Tax</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-right">
                            <button type="button" onClick={() => toggleOrderSort("totalAmount")}>
                              Total
                            </button>
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">Payment</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide">
                            <button type="button" onClick={() => toggleOrderSort("status")}>
                              Status
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.rows.map((row) => (
                          <TableRow
                            key={row.orderId}
                            className="cursor-pointer"
                            onClick={() => openOrder(row.orderId)}
                          >
                            <TableCell className="text-sm font-medium whitespace-nowrap">
                              {row.orderNumber}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatDateTz(row.createdAt, timezone)}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatTimeTz(row.createdAt, timezone)}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{row.employeeName}</TableCell>
                            <TableCell className="text-sm">{row.tableNo}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{row.guest}</TableCell>
                            <TableCell className="text-sm min-w-40">
                              <span className="text-zinc-500 mr-1">{row.itemCount}</span>
                              {row.itemSummary || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-right whitespace-nowrap">{money(row.subTotal)}</TableCell>
                            <TableCell className="text-sm text-right whitespace-nowrap">{money(row.discountTotal)}</TableCell>
                            <TableCell className="text-sm text-right whitespace-nowrap">{money(row.taxTotal)}</TableCell>
                            <TableCell className="text-sm text-right font-semibold whitespace-nowrap">
                              {money(row.totalAmount)}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{row.paymentLabel || "—"}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${STATUS_BADGE[row.status] || "bg-zinc-50 text-zinc-600"}`}
                                >
                                  {row.status}
                                </Badge>
                                {row.waiveReason ? (
                                  <p className="text-[10px] text-zinc-500 max-w-36 truncate" title={row.waiveReason}>
                                    {row.waiveReason}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <PaginationBar
                    pagination={orders.pagination}
                    loading={ordersLoading}
                    onPage={(page) => setOrdersPage(page)}
                  />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Sheet
        open={Boolean(selectedOrderId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrderId(null);
            setOrderDetail(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              {orderDetail?.orderNumber || "Order"}
            </SheetTitle>
            <SheetDescription>Existing order details</SheetDescription>
          </SheetHeader>
          {orderDetailLoading ? (
            <div className="py-10 flex justify-center text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading order…
            </div>
          ) : orderDetail ? (
            <OrderDetailBody order={orderDetail} />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PerformanceTable({ rows, sortKey, onSort, onSelect }) {
  if (!rows.length) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-zinc-500">
        No employee activity found for the selected period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] uppercase tracking-wide">Employee</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Role</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">
              <SortHeader label="Hours" active={sortKey === "hours"} onClick={() => onSort("hours")} />
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">
              <SortHeader label="OT" active={sortKey === "overtimeHours"} onClick={() => onSort("overtimeHours")} />
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">
              <SortHeader label="Sales" active={sortKey === "sales"} onClick={() => onSort("sales")} />
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">
              <SortHeader label="Orders" active={sortKey === "orders"} onClick={() => onSort("orders")} />
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">
              <SortHeader label="Tips" active={sortKey === "tips"} onClick={() => onSort("tips")} />
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">Charges</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">
              <SortHeader
                label="Cancelled"
                active={sortKey === "cancellations"}
                onClick={() => onSort("cancellations")}
              />
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">
              <SortHeader
                label="Pay"
                active={sortKey === "estimatedPay"}
                onClick={() => onSort("estimatedPay")}
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.employeeId}
              className="cursor-pointer"
              onClick={() => onSelect(row.employeeId)}
            >
              <TableCell className="text-sm font-medium whitespace-nowrap">{row.name}</TableCell>
              <TableCell className="text-sm text-zinc-500 whitespace-nowrap">{row.role}</TableCell>
              <TableCell className="text-sm text-right tabular-nums">{Number(row.hours || 0).toFixed(2)}</TableCell>
              <TableCell className="text-sm text-right tabular-nums">{Number(row.overtimeHours || 0).toFixed(2)}</TableCell>
              <TableCell className="text-sm text-right whitespace-nowrap">{money(row.sales)}</TableCell>
              <TableCell className="text-sm text-right">{row.orders}</TableCell>
              <TableCell className="text-sm text-right whitespace-nowrap">{money(row.tips)}</TableCell>
              <TableCell className="text-sm text-right whitespace-nowrap">{money(row.serviceCharges)}</TableCell>
              <TableCell className="text-sm text-right">{row.cancellations}</TableCell>
              <TableCell className="text-sm text-right font-semibold whitespace-nowrap">
                {money(row.estimatedPay)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PaginationBar({ pagination, loading, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-100 text-xs text-zinc-500">
      <span>
        Page {pagination.page} of {pagination.pages}
        {loading ? " · Updating…" : ""}
      </span>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={pagination.page <= 1}
          onClick={() => onPage(pagination.page - 1)}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={pagination.page >= pagination.pages}
          onClick={() => onPage(pagination.page + 1)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-zinc-200 rounded-lg p-3 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}
