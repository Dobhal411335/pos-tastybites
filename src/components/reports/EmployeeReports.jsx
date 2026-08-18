"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { startOfMonth, startOfWeek } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Search,
  X,
  Users,
  Clock,
  Timer,
  Wallet,
  HeartHandshake,
  Receipt,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EmployeeProfileSheet from "@/components/reports/employees/EmployeeProfileSheet";
import EmployeeExportDialog from "@/components/reports/employees/EmployeeExportDialog";
import {
  employeeInitials,
  formatHoursLabel,
  formatTimeTz,
  money,
  staffGroup,
  startOfDay,
  toYmd,
} from "@/components/reports/employees/employeeFormat";
import { PALETTE } from "@/utils/paletteeColor";

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "Week" },
  { value: "this_month", label: "Month" },
  { value: "custom", label: "Custom" },
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

const STAFF_TABS = [
  { value: "all", label: "All Staff" },
  { value: "servers", label: "Servers" },
  { value: "kitchen", label: "Kitchen" },
];

function presetRange(preset, today = startOfDay()) {
  if (preset === "this_week") {
    return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
  }
  if (preset === "this_month") {
    return { from: startOfMonth(today), to: today };
  }
  return { from: today, to: today };
}

function defaultFilters() {
  const today = startOfDay();
  return {
    preset: "today",
    dateFrom: today,
    dateTo: today,
    shiftId: "ALL",
    orderStatus: "ALL",
    paymentMethod: "ALL",
  };
}

function syncEmployeeQuery(id) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("employeeId", id);
  else url.searchParams.delete("employeeId");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function KpiCard({ label, value, hint, icon: Icon, accent = false }) {
  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col justify-between h-28 relative overflow-hidden">
      <div className="flex justify-between items-start z-10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            accent ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="z-10">
        <p className="text-2xl font-semibold text-zinc-900 tabular-nums tracking-tight">
          {value}
        </p>
        {hint ? <p className="text-xs text-zinc-500 mt-0.5">{hint}</p> : null}
      </div>
    </div>
  );
}

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
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-700 font-semibold text-[10px] uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
        Clocked In
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full bg-zinc-100 text-zinc-500 font-semibold text-[10px] uppercase">
      Clocked Out
    </span>
  );
}

export default function EmployeeReports() {
  const [draft, setDraft] = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [ready, setReady] = useState(false);
  const [staffTab, setStaffTab] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const performersRef = useRef(null);
  const pendingEmployeeId = useRef(null);

  const timezone = report?.meta?.timezone || "Asia/Kolkata";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    pendingEmployeeId.current = params.get("employeeId");
    setReady(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  const summaryParams = useCallback(() => {
    const params = new URLSearchParams({
      dateFrom: toYmd(applied.dateFrom),
      dateTo: toYmd(applied.dateTo),
      orderStatus: applied.orderStatus,
      paymentMethod: applied.paymentMethod,
      section: "summary",
    });
    if (applied.shiftId && applied.shiftId !== "ALL")
      params.set("shiftId", applied.shiftId);
    return params;
  }, [applied]);

  const exportQuery = useMemo(() => {
    const params = summaryParams();
    if (search) params.set("search", search);
    if (staffTab !== "all") params.set("staffTab", staffTab);
    return params.toString();
  }, [summaryParams, search, staffTab]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reports/employees?${summaryParams()}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Unable to load employee report.");
      setReport(json.data);
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

  const openEmployee = useCallback(
    async (employeeId, snapshot = null) => {
      if (!employeeId) return;
      setSelectedEmployeeId(employeeId);
      setSelectedEmployee(snapshot);
      setSelectedDay(null);
      setOrderDetail(null);
      setDetail(null);
      setDetailLoading(true);
      syncEmployeeQuery(employeeId);
      try {
        const params = summaryParams();
        params.set("section", "detail");
        params.set("employeeId", employeeId);
        const res = await fetch(`/api/admin/reports/employees?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success)
          throw new Error(json.message || "Unable to load employee.");
        setDetail(json.data);
        setSelectedEmployee(json.data.employee);
      } catch (err) {
        toast.error(err.message || "Unable to load employee.");
      } finally {
        setDetailLoading(false);
      }
    },
    [summaryParams],
  );

  useEffect(() => {
    if (loading || !report || !pendingEmployeeId.current) return;
    const id = pendingEmployeeId.current;
    pendingEmployeeId.current = null;
    const row = (report.performance || []).find(
      (item) => item.employeeId === id,
    );
    openEmployee(id, row || null);
  }, [loading, report, openEmployee]);

  const applyDraft = (next) => {
    setDraft(next);
    setApplied(next);
  };

  const onPresetChange = (preset) => {
    if (preset === "custom") {
      setDraft((prev) => ({ ...prev, preset }));
      return;
    }
    const range = presetRange(preset);
    applyDraft({
      ...draft,
      preset,
      dateFrom: startOfDay(range.from),
      dateTo: startOfDay(range.to),
    });
  };

  const openOrder = async (orderId) => {
    setOrderDetail(null);
    setOrderLoading(true);
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
    } finally {
      setOrderLoading(false);
    }
  };

  const closeSheet = (open) => {
    if (open) return;
    setSelectedEmployeeId(null);
    setSelectedEmployee(null);
    setDetail(null);
    setSelectedDay(null);
    setOrderDetail(null);
    syncEmployeeQuery(null);
  };

  const hasActiveFilters = useMemo(() => {
    const defaults = defaultFilters();
    if (searchInput.trim() || staffTab !== "all") return true;
    if (applied.preset !== defaults.preset) return true;
    if (applied.shiftId !== defaults.shiftId) return true;
    if (applied.orderStatus !== defaults.orderStatus) return true;
    if (applied.paymentMethod !== defaults.paymentMethod) return true;
    if (toYmd(applied.dateFrom) !== toYmd(defaults.dateFrom)) return true;
    if (toYmd(applied.dateTo) !== toYmd(defaults.dateTo)) return true;
    return false;
  }, [applied, searchInput, staffTab]);

  const clearAllFilters = () => {
    const next = defaultFilters();
    setDraft(next);
    setApplied(next);
    setSearchInput("");
    setSearch("");
    setStaffTab("all");
    closeSheet(false);
  };

  const overview = report?.overview;
  const performance = report?.performance || [];
  const shifts = report?.filters?.shifts || [];

  const visibleStaff = useMemo(() => {
    return performance.filter((row) => {
      if (staffTab !== "all" && staffGroup(row.role) !== staffTab) return false;
      if (!search) return true;
      const haystack =
        `${row.name} ${row.role} ${row.employeeCode || ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [performance, staffTab, search]);

  const topPerformers = useMemo(() => {
    return [...performance]
      .filter(
        (row) =>
          Number(row.sales) > 0 ||
          Number(row.orders) > 0 ||
          Number(row.hours) > 0,
      )
      .sort((a, b) => b.sales - a.sales || b.hours - a.hours)
      .slice(0, 8);
  }, [performance]);

  const maxPerformerSales = Math.max(
    ...topPerformers.map((row) => Number(row.sales) || 0),
    1,
  );
  const clockedIn = Number(overview?.clockedIn) || 0;
  const totalStaff = Number(overview?.totalStaff || overview?.employees) || 0;
  const clockedPct =
    totalStaff > 0 ? Math.round((clockedIn / totalStaff) * 100) : 0;
  const charts = report?.charts || {};
  const salesOverTime = charts.salesOverTime || [];
  const tipsOverTime = charts.tipsOverTime || [];
  const salesByEmployee = (charts.salesByEmployee || []).slice(0, 8);
  const showSalesChart = salesOverTime.some((row) => Number(row.sales) > 0);
  const showTipsChart = tipsOverTime.some((row) => Number(row.tips) > 0);
  const showByEmployee = salesByEmployee.some((row) => Number(row.sales) > 0);

  const scrollPerformers = (dir) => {
    performersRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            Employee & Staff Reports
          </h1>
          <p className="text-sm text-zinc-500">
            Employee performance, attendance & sales analytics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-zinc-100 border border-zinc-300 rounded-lg p-1">
            {DATE_PRESETS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                size="sm"
                className={`h-8 px-3 text-xs ${
                  draft.preset === option.value
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-900 hover:text-zinc-900"
                }`}
                onClick={() => onPresetChange(option.value)}
              >
                {option.label === "Custom" ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Custom
                  </span>
                ) : (
                  option.label
                )}
              </Button>
            ))}
          </div>
          {draft.preset === "custom" ? (
            <DateRangePicker
              dateFrom={draft.dateFrom}
              dateTo={draft.dateTo}
              onChange={({ from, to }) =>
                applyDraft({
                  ...draft,
                  preset: "custom",
                  dateFrom: startOfDay(from),
                  dateTo: startOfDay(to || from),
                })
              }
            />
          ) : null}

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="h-10 bg-white">
                <Filter className="h-4 w-4 mr-1.5" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3 bg-white">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Shift
                </p>
                <Select
                  value={draft.shiftId}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, shiftId: value }))
                  }
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
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Order status
                </p>
                <Select
                  value={draft.orderStatus}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, orderStatus: value }))
                  }
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
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Payment
                </p>
                <Select
                  value={draft.paymentMethod}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, paymentMethod: value }))
                  }
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
              <Button
                type="button"
                className="w-full h-9 text-xs"
                onClick={() => setApplied({ ...draft })}
              >
                Apply filters
              </Button>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="outline"
            className="h-10 bg-white text-zinc-600"
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
          >
            <X className="h-4 w-4 mr-1.5" />
            Clear filters
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 bg-white"
            onClick={() => setExportOpen(true)}
            disabled={loading || !report}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-10 p-0 bg-white"
            onClick={fetchSummary}
            aria-label="Refresh report"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <div className="bg-white border border-zinc-200 rounded-xl h-48 flex flex-col items-center justify-center gap-3 text-sm text-zinc-500">
          <p>Unable to load employee report.</p>
          <Button
            type="button"
            variant="outline"
            className="h-8 text-xs"
            onClick={fetchSummary}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
            <KpiCard
              label="Total Staff"
              value={totalStaff}
              hint="Active"
              icon={Users}
              accent
            />
            <KpiCard
              label="Clocked In"
              value={
                <>
                  {clockedIn}
                  <span className="text-base font-normal text-zinc-400">
                    /{totalStaff}
                  </span>
                </>
              }
              hint={`${clockedPct}%`}
              icon={Clock}
              accent
            />
            <KpiCard
              label="Working Hrs"
              value={formatHoursLabel(overview?.totalHours)}
              hint={`OT ${formatHoursLabel(overview?.overtimeHours)}`}
              icon={Timer}
              accent
            />
            <KpiCard
              label="Est. Pay"
              value={money(overview?.estimatedPay)}
              hint={`Reg ${money(overview?.regularPay)} · OT ${money(overview?.overtimePay)}`}
              icon={Banknote}
              accent
            />
            <KpiCard
              label="Total Sales"
              value={money(overview?.totalSales)}
              hint={`${overview?.completedOrders || 0} orders`}
              icon={Wallet}
              accent
            />
            <KpiCard
              label="Total Tips"
              value={money(overview?.totalTips)}
              hint="Split by each staff tip%"
              icon={HeartHandshake}
              accent
            />
            <KpiCard
              label="Svc Charges"
              value={money(overview?.serviceCharges)}
              hint="On paid orders"
              icon={Receipt}
              accent
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Sales over time
              </p>
              <div className="h-40">
                {showSalesChart ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesOverTime}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        width={40}
                      />
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
            <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Tips over time
              </p>
              <div className="h-40">
                {showTipsChart ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tipsOverTime}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        width={40}
                      />
                      <Tooltip content={<ChartTooltip moneyValue />} />
                      <Area
                        type="monotone"
                        dataKey="tips"
                        stroke="#3b82f6"
                        fill="#DBEAFE"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-zinc-400">
                    No tips in this period.
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Sales by employee
              </p>
              <div className="h-40">
                {showByEmployee ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesByEmployee}
                      layout="vertical"
                      margin={{ left: 8 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        width={72}
                      />
                      <Tooltip content={<ChartTooltip moneyValue />} />
                      <Bar
                        dataKey="sales"
                        fill={PALETTE.accent}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-zinc-400">
                    No employee sales in this period.
                  </div>
                )}
              </div>
            </div>
          </div>

          {topPerformers.length > 0 ? (
            <div className="space-y-3 ">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Top Performers
                </h2>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 w-8 p-0 rounded-full bg-white"
                    onClick={() => scrollPerformers(-1)}
                    aria-label="Previous performers"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 w-8 p-0 rounded-full bg-white"
                    onClick={() => scrollPerformers(1)}
                    aria-label="Next performers"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div
                ref={performersRef}
                className="flex gap-4 overflow-x-auto pb-1 snap-x"
              >
                {topPerformers.map((row, index) => {
                  const kitchen = staffGroup(row.role) === "kitchen";
                  const width = Math.max(
                    8,
                    Math.round(
                      ((Number(row.sales) || 0) / maxPerformerSales) * 100,
                    ),
                  );
                  return (
                    <button
                      key={row.employeeId}
                      type="button"
                      onClick={() => openEmployee(row.employeeId, row)}
                      className={`bg-white rounded-xl shadow-sm border p-4 w-64 shrink-0 snap-start text-left hover:-translate-y-0.5 transition-transform my-3 relative ${
                        index === 0 ? "border-orange-500" : "border-zinc-200"
                      }`}
                    >
                      <div
                        className={`absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shadow-sm ${
                          index === 0
                            ? "bg-orange-500 text-white"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-semibold shrink-0">
                          {employeeInitials(row.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">
                            {row.name}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {row.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-zinc-500">
                          {kitchen ? "Orders" : "Sales"}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {kitchen ? row.orders : money(row.sales)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-zinc-500">
                          {kitchen ? "Hours" : "Tips"}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {kitchen
                            ? formatHoursLabel(row.hours)
                            : money(row.tips)}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${index === 0 ? "bg-orange-500" : "bg-zinc-400"}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
            <div className="p-3 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/80">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-zinc-100 rounded-lg p-1">
                  {STAFF_TABS.map((tab) => (
                    <Button
                      key={tab.value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-8 px-3 text-xs ${
                        staffTab === tab.value
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500"
                      }`}
                      onClick={() => setStaffTab(tab.value)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search employee..."
                    className="h-9 pl-8 text-sm bg-white"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="link"
                className="h-8 px-0 text-orange-700"
                asChild
              >
                <Link href="/admin/employee/shifts">
                  View Full Schedule
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-zinc-50">
                    <TableHead className="text-[11px] uppercase tracking-wide">
                      Employee
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide">
                      Clock In/Out
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">
                      Hrs
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">
                      Sales
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">
                      Tips
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">
                      Svc
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-right">
                      Cancels
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleStaff.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-sm text-zinc-500 text-center py-10"
                      >
                        No employees match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleStaff.map((row) => (
                      <TableRow
                        key={row.employeeId}
                        className={`cursor-pointer ${row.clockedIn ? "" : "opacity-90"}`}
                        onClick={() => openEmployee(row.employeeId, row)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                              {employeeInitials(row.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-zinc-900">
                                {row.name}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {row.role}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ClockBadge clockedIn={row.clockedIn} />
                        </TableCell>
                        <TableCell>
                          <p className="text-sm tabular-nums">
                            {formatTimeTz(row.clockIn, timezone)}
                          </p>
                          <p className="text-xs text-zinc-400 tabular-nums">
                            {row.clockedIn
                              ? "—"
                              : formatTimeTz(row.clockOut, timezone)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formatHoursLabel(row.hours)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {money(row.sales)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {money(row.tips)}
                          {Number(row.tipPercent) > 0 ? (
                            <p className="text-[10px] text-zinc-400">{row.tipPercent}%</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {money(row.serviceCharges)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.cancellations}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      <EmployeeProfileSheet
        open={Boolean(selectedEmployeeId)}
        onOpenChange={closeSheet}
        employee={selectedEmployee}
        detail={detail}
        loading={detailLoading}
        timezone={timezone}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onBackToEmployee={() => {
          setSelectedDay(null);
          setOrderDetail(null);
        }}
        orderDetail={orderDetail}
        orderLoading={orderLoading}
        onSelectOrder={openOrder}
        onBackToDay={() => setOrderDetail(null)}
      />

      <EmployeeExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        exportQuery={exportQuery}
        dateFrom={toYmd(applied.dateFrom)}
        dateTo={toYmd(applied.dateTo)}
        disabled={loading}
        rowCount={visibleStaff.length}
        employees={report?.filters?.employees || []}
      />
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 h-28"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
