"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowUpDown,
  Loader2,
  Search,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PALETTE } from "@/utils/paletteeColor";
import OrderDetailBody from "@/components/reports/OrderDetailBody";

const STATUS_OPTIONS = [
  { value: "PAID", label: "Paid" },
  { value: "ALL", label: "All statuses" },
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

const STATUS_BADGE = {
  PAID: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  WAIVED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const CHART_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#eab308"];

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toYmd(date) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy, h:mm a");
}

function formatDate(value) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy");
}

function dash(value) {
  if (value == null || value === "") return "—";
  return value;
}

function ChartCard({ title, children, empty }) {
  return (
    <div className="border border-zinc-200 rounded-lg bg-white p-3 min-h-52">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
        {title}
      </p>
      {empty ? (
        <div className="h-40 flex items-center justify-center text-sm text-zinc-400">
          Not enough data for this chart.
        </div>
      ) : (
        <div className="h-40">{children}</div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label, valueKey = "revenue", prefix = "$" }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="bg-white border border-zinc-200 rounded-md px-2 py-1 text-xs shadow-sm">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold text-zinc-900">
        {prefix === "$" ? money(value) : `${value} ${valueKey}`}
      </p>
    </div>
  );
}

export default function GuestDirectoryReport() {
  const [dateFrom, setDateFrom] = useState(() => startOfDay());
  const [dateTo, setDateTo] = useState(() => startOfDay());
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [orderStatus, setOrderStatus] = useState("PAID");
  const [sort, setSort] = useState("revenue");
  const [tab, setTab] = useState("info");

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  const [selectedGuestKey, setSelectedGuestKey] = useState(null);
  const [guestDetail, setGuestDetail] = useState(null);
  const [guestDetailLoading, setGuestDetailLoading] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateFrom: toYmd(dateFrom),
        dateTo: toYmd(dateTo),
        paymentMethod,
        orderStatus,
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/reports/guests?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load report");
      setReport(json.data);
    } catch (error) {
      toast.error(error.message || "Failed to load guest directory");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, paymentMethod, orderStatus, search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const clearFilters = () => {
    const today = startOfDay();
    setDateFrom(today);
    setDateTo(today);
    setSearchInput("");
    setSearch("");
    setPaymentMethod("ALL");
    setOrderStatus("PAID");
    setSort("revenue");
  };

  const guests = report?.guests || [];
  const history = report?.history || [];
  const charts = report?.charts || {};
  const hasActivity = guests.length > 0 || history.length > 0;

  const sortedGuests = useMemo(() => {
    const copy = [...guests];
    if (sort === "visits") {
      copy.sort((a, b) => b.visits - a.visits || b.totalSpent - a.totalSpent);
    } else if (sort === "orders") {
      copy.sort((a, b) => b.orders - a.orders || b.totalSpent - a.totalSpent);
    } else if (sort === "recent") {
      copy.sort(
        (a, b) =>
          new Date(b.lastVisit || 0) - new Date(a.lastVisit || 0) ||
          b.totalSpent - a.totalSpent
      );
    } else {
      copy.sort((a, b) => b.totalSpent - a.totalSpent || b.orders - a.orders);
    }
    return copy;
  }, [guests, sort]);

  const openGuest = async (guestKey) => {
    setSelectedGuestKey(guestKey);
    const local = guests.find((guest) => guest.guestKey === guestKey) || null;
    const localHistory = history.filter((row) => row.guestKey === guestKey);
    setGuestDetail({ guest: local, history: localHistory, charts: null });
    setGuestDetailLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reports/guests?guestKey=${encodeURIComponent(guestKey)}`,
        { credentials: "include", cache: "no-store" }
      );
      const json = await res.json();
      if (json.success) {
        setGuestDetail({
          guest: json.data.guests?.[0] || local,
          history: json.data.history || localHistory,
          charts: json.data.charts || null,
        });
      }
    } catch {
      // Keep the in-range snapshot already shown.
    } finally {
      setGuestDetailLoading(false);
    }
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
    } catch (error) {
      toast.error(error.message || "Failed to load order");
      setSelectedOrderId(null);
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const revenueSeries = charts.revenueOverTime || [];
  const topGuests = charts.topGuests || [];
  const spending = charts.spendingDistribution || [];
  const repeat = charts.repeatVsOneTime || { oneTime: 0, repeat: 0 };
  const showRevenueChart = revenueSeries.some((row) => Number(row.revenue) > 0);
  const showTopGuests = topGuests.length > 0;
  const showSpending =
    spending.some((row) => row.guests > 0) &&
    (report?.meta?.identifiedGuests || 0) >= 3;
  const showRepeat = (report?.meta?.identifiedGuests || 0) >= 1;
  const repeatPie = [
    { name: "One-time", value: repeat.oneTime },
    { name: "Repeat", value: repeat.repeat },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Guest Directory</h1>
        <p className="text-sm text-zinc-500">
          Guest activity derived from orders. Email is not stored on orders.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">From</Label>
            <DatePicker
              value={dateFrom}
              onChange={(value) => value && setDateFrom(startOfDay(value))}
              placeholder="Start date"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">To</Label>
            <DatePicker
              value={dateTo}
              onChange={(value) => value && setDateTo(startOfDay(value))}
              placeholder="End date"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">
              Guest search
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Name, phone, or order #"
                className="h-9 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">
              Payment
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-zinc-500">
              Status
            </Label>
            <Select value={orderStatus} onValueChange={setOrderStatus}>
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
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-8 text-xs"
            onClick={clearFilters}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear Filters
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-lg h-64 flex items-center justify-center text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading guest activity…
        </div>
      ) : !hasActivity ? (
        <div className="bg-white border border-zinc-200 rounded-lg h-48 flex items-center justify-center text-sm text-zinc-500">
          No guest activity found for this period.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ChartCard title="Guest Revenue Over Time" empty={!showRevenueChart}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={42} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={PALETTE.accent}
                    fill="#FFEDD5"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top Guests by Revenue" empty={!showTopGuests}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGuests} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={88}
                    tick={{ fontSize: 10, fill: "#71717a" }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" fill={PALETTE.accent} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Guest Spending Distribution" empty={!showSpending}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#71717a" }} width={28} />
                  <Tooltip
                    content={<ChartTooltip valueKey="guests" prefix="" />}
                  />
                  <Bar dataKey="guests" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Repeat vs One-Time Guests" empty={!showRepeat || repeatPie.length === 0}>
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repeatPie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={34}
                        outerRadius={56}
                        paddingAngle={2}
                      >
                        {repeatPie.map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-[11px] text-zinc-600">
                  {repeatPie.map((entry, index) => (
                    <span key={entry.name} className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      {entry.name} ({entry.value})
                    </span>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="bg-white border border-zinc-200 rounded-lg">
            <div className="px-3 pt-3">
              <TabsList className="h-8">
                <TabsTrigger value="info" className="text-xs">Guest Info</TabsTrigger>
                <TabsTrigger value="history" className="text-xs">Purchase History</TabsTrigger>
                <TabsTrigger value="revenue" className="text-xs">Guest Revenue</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="info" className="mt-0">
              <GuestTable
                guests={sortedGuests}
                onSelect={openGuest}
                columns="info"
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <HistoryTable rows={history} onSelectOrder={openOrder} />
            </TabsContent>

            <TabsContent value="revenue" className="mt-0">
              <div className="px-3 pb-2 flex items-center gap-2">
                <Label className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Sort
                </Label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-8 w-48 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Highest revenue</SelectItem>
                    <SelectItem value="visits">Most visits</SelectItem>
                    <SelectItem value="orders">Most orders</SelectItem>
                    <SelectItem value="recent">Recent visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <GuestTable
                guests={sortedGuests}
                onSelect={openGuest}
                columns="revenue"
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      <Sheet
        open={Boolean(selectedGuestKey)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedGuestKey(null);
            setGuestDetail(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              {guestDetail?.guest?.name || "Guest"}
            </SheetTitle>
            <SheetDescription>
              Order history for this guest. Records are grouped from existing orders.
            </SheetDescription>
          </SheetHeader>
          {guestDetailLoading && !guestDetail?.guest ? (
            <div className="py-10 flex justify-center text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading…
            </div>
          ) : guestDetail?.guest ? (
            <GuestDetailBody
              guest={guestDetail.guest}
              history={guestDetail.history}
              charts={guestDetail.charts}
              onSelectOrder={openOrder}
            />
          ) : null}
        </SheetContent>
      </Sheet>

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

function GuestTable({ guests, onSelect, columns }) {
  const isRevenue = columns === "revenue";
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] uppercase tracking-wide">Guest</TableHead>
            {!isRevenue && (
              <>
                <TableHead className="text-[11px] uppercase tracking-wide">Email</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Phone</TableHead>
              </>
            )}
            <TableHead className="text-[11px] uppercase tracking-wide text-right">Visits</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">Orders</TableHead>
            {isRevenue ? (
              <>
                <TableHead className="text-[11px] uppercase tracking-wide text-right">Subtotal</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-right">Discount</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-right">Tax</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-right">
                  <span className="inline-flex items-center gap-1">
                    Total Revenue <ArrowUpDown className="w-3 h-3" />
                  </span>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-right">Avg Order</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-[11px] uppercase tracking-wide">First Visit</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Last Visit</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-right">Total Spent</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-right">AOV</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-right">Discount Used</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {guests.map((guest) => (
            <TableRow
              key={guest.guestKey}
              className="cursor-pointer"
              onClick={() => onSelect(guest.guestKey)}
            >
              <TableCell className="text-sm font-medium text-zinc-900 whitespace-nowrap">
                {guest.name}
                {!guest.identified && (
                  <span className="ml-2 text-[10px] font-normal text-zinc-400">Unidentified</span>
                )}
              </TableCell>
              {!isRevenue && (
                <>
                  <TableCell className="text-sm text-zinc-500">{dash(guest.email)}</TableCell>
                  <TableCell className="text-sm text-zinc-700 whitespace-nowrap">
                    {dash(guest.phone)}
                  </TableCell>
                </>
              )}
              <TableCell className="text-sm text-right">{guest.visits}</TableCell>
              <TableCell className="text-sm text-right">{guest.orders}</TableCell>
              {isRevenue ? (
                <>
                  <TableCell className="text-sm text-right whitespace-nowrap">{money(guest.subtotal)}</TableCell>
                  <TableCell className="text-sm text-right whitespace-nowrap">{money(guest.discount)}</TableCell>
                  <TableCell className="text-sm text-right whitespace-nowrap">{money(guest.tax)}</TableCell>
                  <TableCell className="text-sm text-right font-semibold whitespace-nowrap">
                    {money(guest.totalSpent)}
                  </TableCell>
                  <TableCell className="text-sm text-right whitespace-nowrap">{money(guest.aov)}</TableCell>
                </>
              ) : (
                <>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(guest.firstVisit)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(guest.lastVisit)}</TableCell>
                  <TableCell className="text-sm text-right font-semibold whitespace-nowrap">
                    {money(guest.totalSpent)}
                  </TableCell>
                  <TableCell className="text-sm text-right whitespace-nowrap">{money(guest.aov)}</TableCell>
                  <TableCell className="text-sm text-right whitespace-nowrap">{money(guest.discountUsed)}</TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function HistoryTable({ rows, onSelectOrder }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] uppercase tracking-wide">Order #</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Date</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Guest</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Table</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Items</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">Subtotal</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">Discount</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">Tax</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">Total</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Payment</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.orderId}
              className="cursor-pointer"
              onClick={() => onSelectOrder(row.orderId)}
            >
              <TableCell className="text-sm font-medium whitespace-nowrap">{row.orderNumber}</TableCell>
              <TableCell className="text-sm whitespace-nowrap">{formatDateTime(row.createdAt)}</TableCell>
              <TableCell className="text-sm whitespace-nowrap">{row.guestName}</TableCell>
              <TableCell className="text-sm">{row.tableNo}</TableCell>
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
                <Badge
                  variant="outline"
                  className={`text-[10px] ${STATUS_BADGE[row.status] || "bg-zinc-50 text-zinc-600"}`}
                >
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GuestDetailBody({ guest, history, charts, onSelectOrder }) {
  const series = charts?.revenueOverTime || [];
  const showCharts = series.length >= 2 && series.some((row) => Number(row.revenue) > 0);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <DetailItem label="Email" value="—" />
        <DetailItem label="Phone" value={dash(guest.phone)} />
        <DetailItem label="Total visits" value={guest.visits} />
        <DetailItem label="Total orders" value={guest.orders} />
        <DetailItem label="Total spent" value={money(guest.totalSpent)} />
        <DetailItem label="Average order" value={money(guest.aov)} />
        <DetailItem label="First visit" value={formatDateTime(guest.firstVisit)} />
        <DetailItem label="Last visit" value={formatDateTime(guest.lastVisit)} />
      </div>

      {showCharts && (
        <div className="grid grid-cols-1 gap-3">
          <ChartCard title="Spending over time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Area dataKey="revenue" stroke={PALETTE.accent} fill="#FFEDD5" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          {charts?.ordersOverTime?.length >= 2 && (
            <ChartCard title="Orders over time">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.ordersOverTime}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#71717a" }} width={28} />
                  <Tooltip content={<ChartTooltip valueKey="orders" prefix="" />} />
                  <Bar dataKey="orders" fill={PALETTE.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
          {charts?.aovOverTime?.length >= 2 && (
            <ChartCard title="Average order value">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.aovOverTime}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={36} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area dataKey="aov" stroke="#3b82f6" fill="#DBEAFE" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
          Order History
        </p>
        <HistoryTable rows={history} onSelectOrder={onSelectOrder} />
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-zinc-900">{value}</p>
    </div>
  );
}
