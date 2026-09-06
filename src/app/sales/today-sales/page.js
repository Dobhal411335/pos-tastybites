"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  TrendingUp, TrendingDown, Clock, DollarSign, ShoppingBag, 
  Receipt, Wallet, Search, ChevronDown, Calendar, ChevronLeft, ChevronRight, Loader2,
  RefreshCw, CreditCard, Banknote, Gift, User, Users, UtensilsCrossed, X, Eye, Printer,
  Wine, CheckCircle2, AlertTriangle, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { toast } from "sonner";
import moment from "moment";
import { useSocket } from "@/components/providers/SocketProvider";
import PrintPreviewModal from "@/components/receipts/PrintPreviewModal";
import {
  getOrderLocationLabel,
  getOrderTypeLabel,
  getOrderTypeBadgeClass,
  getOrderPartyLabel,
  shouldShowTable,
} from "@/utils/orderDisplay";

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];

const STATUS_OPTIONS = ["All", "PAID", "PENDING", "CONFIRMED", "WAIVED", "CANCELLED"];

function getOrderGrandTotal(order) {
  return Number(order?.totalAmount || 0) + Number(order?.tipAmount || 0);
}

function isOrderPaid(order) {
  return order?.paymentStatus === "PAID" || order?.status === "PAID";
}

function getPlacerName(order) {
  if (!order) return null;
  if (order.processedByName) return order.processedByName;
  const p = order.processedBy;
  if (p && typeof p === "object") {
    return p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || null;
  }
  return null;
}

function getPaymentType(order) {
  if (String(order?.status || "").toUpperCase() === "WAIVED") {
    return {
      label: "Waived",
      Icon: Wallet,
      className: "bg-slate-50 text-slate-700 border-slate-200",
    };
  }

  const method = String(order?.paymentMethod || "").trim();
  const usedGiftCard = Number(order?.giftcardUsedAmount || 0) > 0 || Boolean(order?.giftcardCode);
  const lower = method.toLowerCase();

  if (!method && !usedGiftCard) {
    return {
      label: "Unpaid",
      Icon: Wallet,
      className: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }

  const isCard = lower.includes("card") && !lower.includes("gift");
  const isCash = lower.includes("cash");
  const isGift = lower.includes("gift");

  if (usedGiftCard && (isCard || isCash)) {
    const cardType = method.replace(/^Card\s*-?\s*/i, "").trim();
    const other = isCard
      ? (cardType && cardType.toLowerCase() !== "card" ? `Card · ${cardType}` : "Card")
      : "Cash";
    return {
      label: `Gift + ${other}`,
      Icon: Gift,
      className: "bg-violet-50 text-violet-700 border-violet-200",
    };
  }

  if (isGift || (usedGiftCard && !isCard && !isCash)) {
    return {
      label: "Gift Card",
      Icon: Gift,
      className: "bg-violet-50 text-violet-700 border-violet-200",
    };
  }

  if (isCard) {
    const cardType = method.replace(/^Card\s*-\s*/i, "").trim();
    return {
      label: cardType && cardType.toLowerCase() !== "card" ? `Card · ${cardType}` : "Card",
      Icon: CreditCard,
      className: "bg-sky-50 text-sky-700 border-sky-200",
    };
  }

  if (isCash) {
    return {
      label: "Cash",
      Icon: Banknote,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  return {
    label: method,
    Icon: Wallet,
    className: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
}

const getStatusBadge = (status) => {
  switch (status?.toUpperCase()) {
    case "CONFIRMED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "CANCELLED":
      return "bg-red-100 text-red-700 border-red-200";
    case "WAIVED":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "PAID":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
};

const getPaymentColor = (paymentStatus) => {
  switch (paymentStatus?.toUpperCase()) {
    case "PAID":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "PARTIAL":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "REFUNDED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-rose-100 text-rose-800 border-rose-200";
  }
};

export default function EmployeeSalesPage() {
  const { socket } = useSocket();
  const [dateRange, setDateRange] = useState("Today");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sidebar Sheet State
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => String(o._id || o.id) === String(selectedOrderId)) || null;
  }, [orders, selectedOrderId]);

  // Print Preview Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printType, setPrintType] = useState("customer");

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/orders/employee");
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch sales data.");
      }
    } catch {
      toast.error("Failed to fetch sales data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (!cancelled) {
        await fetchOrders();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOrders]);

  // Socket live updates
  useEffect(() => {
    if (!socket) return;
    const onOrderOrPaymentChange = () => {
      fetchOrders(true);
    };
    socket.on("order:created", onOrderOrPaymentChange);
    socket.on("order:updated", onOrderOrPaymentChange);
    socket.on("payment:completed", onOrderOrPaymentChange);
    socket.on("table:released", onOrderOrPaymentChange);
    return () => {
      socket.off("order:created", onOrderOrPaymentChange);
      socket.off("order:updated", onOrderOrPaymentChange);
      socket.off("payment:completed", onOrderOrPaymentChange);
      socket.off("table:released", onOrderOrPaymentChange);
    };
  }, [socket, fetchOrders]);

  const closePanel = () => {
    setSelectedOrderId(null);
    setIsPrintModalOpen(false);
  };

  // Date Range Filtering
  const dateFilteredOrders = useMemo(() => {
    if (!orders.length) return [];
    if (dateRange === "All") return orders;
    return orders.filter((o) => {
      const d = moment(o.createdAt);
      if (!d.isValid()) return true;
      if (dateRange === "Today") {
        return d.isSame(moment(), "day");
      }
      if (dateRange === "This Week") {
        return d.isSame(moment(), "week");
      }
      if (dateRange === "This Month") {
        return d.isSame(moment(), "month");
      }
      return true;
    });
  }, [orders, dateRange]);

  // Calculations — only fully paid orders; exclude waived/cancelled
  const validOrders = useMemo(() => {
    return dateFilteredOrders.filter(
      (o) =>
        o.status !== "CANCELLED" &&
        o.status !== "WAIVED" &&
        (o.status === "PAID" || o.paymentStatus === "PAID")
    );
  }, [dateFilteredOrders]);

  const totalOrders = validOrders.length;
  const totalSales = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const tipsEarned = validOrders.reduce((sum, o) => sum + Number(o.tipAmount || 0), 0);

  const stats = [
    { label: "Total Sales", value: `$${totalSales.toFixed(2)}`, icon: DollarSign, trend: `${validOrders.length} orders`, isUp: true },
    { label: "Paid Orders", value: totalOrders.toString(), icon: ShoppingBag, trend: `${dateFilteredOrders.length} total`, isUp: true },
    { label: "Avg Order Value", value: `$${avgOrderValue.toFixed(2)}`, icon: Receipt, trend: "per ticket", isUp: true },
    { label: "Tips Earned", value: `$${tipsEarned.toFixed(2)}`, icon: Wallet, trend: "collected", isUp: true },
  ];

  // Dynamic Chart Data
  const chartSalesData = useMemo(() => {
    if (!validOrders.length) {
      return [
        { time: "9am", sales: 0 },
        { time: "11am", sales: 0 },
        { time: "1pm", sales: 0 },
        { time: "3pm", sales: 0 },
        { time: "5pm", sales: 0 },
        { time: "7pm", sales: 0 },
        { time: "9pm", sales: 0 },
      ];
    }
    const hourly = {};
    validOrders.forEach((o) => {
      const hourStr = moment(o.createdAt).format("h A");
      hourly[hourStr] = (hourly[hourStr] || 0) + Number(o.totalAmount || 0);
    });
    return Object.entries(hourly).map(([time, sales]) => ({
      time,
      sales: Math.round(sales * 100) / 100,
    }));
  }, [validOrders]);

  const chartTopItemsData = useMemo(() => {
    const itemMap = {};
    validOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const name = item.name || "Item";
        itemMap[name] = (itemMap[name] || 0) + Number(item.qty || 1);
      });
    });
    const sorted = Object.entries(itemMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (!sorted.length) {
      return [{ name: "No items yet", count: 0 }];
    }
    return sorted;
  }, [validOrders]);

  const chartOrderTypeData = useMemo(() => {
    const counts = { "Dine-in": 0, "Takeaway": 0, "Online": 0, "Staff": 0 };
    dateFilteredOrders.forEach((o) => {
      const src = o.source || "POS";
      if (src === "ONLINE") counts["Online"] += 1;
      else if (src === "STAFF") counts["Staff"] += 1;
      else if (src === "WALK_IN") counts["Takeaway"] += 1;
      else counts["Dine-in"] += 1;
    });
    const res = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
    return res.length ? res : [{ name: "Dine-in", value: 1 }];
  }, [dateFilteredOrders]);

  // Search & Status Filtering
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter((o) => {
      const matchesStatus =
        statusFilter === "All"
          ? true
          : statusFilter === "PAID"
            ? o.status === "PAID" || o.paymentStatus === "PAID"
            : o.status === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesStatus;

      const orderNum = (o.orderNumber || "").toLowerCase();
      const table = (o.tableNo || "").toLowerCase();
      const guest = (o.guestName || "").toLowerCase();
      const party = (o.partyName || "").toLowerCase();
      const method = (o.paymentMethod || "").toLowerCase();
      const placer = (getPlacerName(o) || "").toLowerCase();
      const type = getOrderTypeLabel(o).toLowerCase();

      const matchesSearch =
        orderNum.includes(q) ||
        table.includes(q) ||
        guest.includes(q) ||
        party.includes(q) ||
        method.includes(q) ||
        placer.includes(q) ||
        type.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [dateFilteredOrders, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const currentOrders = useMemo(() => {
    return filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const orderStatusUpper = String(selectedOrder?.status || "").toUpperCase();
  const isOnlineOrder = selectedOrder?.source === "ONLINE";

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Sales Report</h1>
          <p className="text-sm text-zinc-500 font-medium">Your live restaurant performance &amp; transaction overview.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white rounded-xl p-1 border border-zinc-200 shadow-xs">
            {["Today", "This Week", "This Month", "All"].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => handleDateRangeChange(range)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  dateRange === range 
                    ? "bg-zinc-900 text-white shadow-xs" 
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="h-9 px-3 rounded-xl border-zinc-200 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* STATS ROW */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="rounded-2xl border-zinc-200 shadow-xs bg-white">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="border-none font-bold text-xs bg-emerald-50 text-emerald-700">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {stat.trend}
                  </Badge>
                </div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-bold text-zinc-900 mt-0.5">{stat.value}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Over Time (Line Chart) */}
        <Card className="rounded-2xl border-zinc-200 shadow-xs lg:col-span-2 bg-white">
          <CardHeader className="pb-2 border-b border-zinc-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <span>Sales Over Time</span>
            </CardTitle>
            <span className="text-xs text-zinc-400 font-medium">{dateRange}</span>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartSalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e4e4e7", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(val) => [`$${Number(val).toFixed(2)}`, "Sales"]}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: "#f97316", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Items & Order Type */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-zinc-200 shadow-xs bg-white">
            <CardHeader className="pb-2 border-b border-zinc-100">
              <CardTitle className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                <span>Top Selling Items</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartTopItemsData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#3f3f46", fontSize: 11, fontWeight: 600 }} width={110} />
                    <Tooltip cursor={{ fill: "#f4f4f5" }} contentStyle={{ borderRadius: "8px" }} />
                    <Bar dataKey="count" fill="#e4e4e7" radius={[0, 4, 4, 0]}>
                      {chartTopItemsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#f97316" : "#cbd5e1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 shadow-xs bg-white">
            <CardHeader className="pb-1 pt-3 border-b border-zinc-100">
              <CardTitle className="text-sm font-bold text-zinc-900 text-center">
                Order Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartOrderTypeData} innerRadius={30} outerRadius={48} paddingAngle={2} dataKey="value" stroke="none">
                      {chartOrderTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-3 mt-1 flex-wrap">
                {chartOrderTypeData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ORDER HISTORY TABLE */}
      <Card className="rounded-2xl border-zinc-200 shadow-xs overflow-hidden bg-white">
        {/* Table Controls Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-zinc-900">Recent Transactions</h2>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 font-semibold">
              {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto items-stretch sm:items-center">
            {/* Status Filter Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusFilterChange(status)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === status
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input 
                type="text" 
                placeholder="Search order #, table, guest..." 
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8.5 pr-7 bg-zinc-50 border-zinc-200 rounded-xl h-9 text-xs focus-visible:ring-1 focus-visible:ring-orange-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Table Content */}
        <div className="overflow-x-auto min-h-75">
          {loading ? (
            <div className="flex justify-center items-center h-56">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-zinc-50 border-b border-zinc-200">
                <TableRow className="hover:bg-transparent border-b border-zinc-200">
                  <TableHead className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-36">
                    Order #
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-44">
                    Table / Guest
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-28">
                    Items
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-28">
                    Total
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-36">
                    Payment
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-28">
                    Time
                  </TableHead>
                  <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-28 text-center">
                    Status
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-24 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-zinc-100">
                {currentOrders.map((order, i) => {
                  const payment = getPaymentType(order);
                  const PaymentIcon = payment.Icon;
                  const orderType = getOrderTypeLabel(order);
                  const isSelected = selectedOrder?._id === order._id;
                  const grandTotal = getOrderGrandTotal(order);
                  const totalItems = (order.items || []).reduce((acc, it) => acc + (it.qty || 1), 0);

                  return (
                    <TableRow 
                      key={order._id || i}
                      onClick={() => setSelectedOrderId(order._id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-orange-50/70 hover:bg-orange-50" 
                          : "hover:bg-zinc-50/80"
                      }`}
                    >
                      {/* Order # */}
                      <TableCell className="py-3 px-4 align-middle">
                        <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                          <span>#{order.orderNumber}</span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-bold uppercase tracking-wider ${getOrderTypeBadgeClass(order)}`}
                          >
                            {orderType}
                          </span>
                        </div>
                      </TableCell>

                      {/* Table / Guest */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="text-xs">
                          <span className="font-bold text-zinc-800 block">
                            {order.tableNo ? `Table ${order.tableNo}` : "Takeaway / Counter"}
                          </span>
                          {(order.partyName || order.guestName) && (
                            <span className="text-[11px] text-zinc-500 font-medium block truncate max-w-44">
                              {order.partyName || order.guestName}
                              {order.guestCount ? ` · ${order.guestCount} guests` : ""}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Items */}
                      <TableCell className="py-3 px-3 align-middle text-xs text-zinc-600 font-medium">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-semibold text-[11px]">
                          {totalItems} {totalItems === 1 ? "item" : "items"}
                        </span>
                      </TableCell>

                      {/* Total */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="font-bold text-zinc-900 text-sm">
                          ${grandTotal.toFixed(2)}
                        </div>
                        {Number(order.tipAmount || 0) > 0 && (
                          <span className="text-[10px] text-emerald-600 font-medium block">
                            +${Number(order.tipAmount).toFixed(2)} tip
                          </span>
                        )}
                      </TableCell>

                      {/* Payment */}
                      <TableCell className="py-3 px-3 align-middle">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${payment.className}`}>
                          <PaymentIcon className="w-3 h-3 shrink-0" />
                          <span>{payment.label}</span>
                        </span>
                      </TableCell>

                      {/* Time */}
                      <TableCell className="py-3 px-3 align-middle text-xs text-zinc-500 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{moment(order.createdAt).format("hh:mm A")}</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3 px-3 align-middle text-center">
                        <Badge className={`${getStatusBadge(order.status)} border px-2 py-0.5 shadow-none font-bold uppercase text-[10px] tracking-wider`}>
                          {order.status}
                        </Badge>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="py-3 px-4 align-middle text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(order._id);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {currentOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-zinc-500 font-medium">
                      No matching orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
        
        {/* PAGINATION */}
        {!loading && filteredOrders.length > 0 && (
          <div className="p-3.5 border-t border-zinc-100 flex items-center justify-between bg-zinc-50 text-xs text-zinc-600">
            <span>
              Showing <span className="font-semibold text-zinc-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-semibold text-zinc-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of{" "}
              <span className="font-semibold text-zinc-900">{filteredOrders.length}</span> orders
            </span>

            <div className="flex items-center gap-2">
              <span className="font-medium mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 px-2 bg-white border-zinc-200"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 px-2 bg-white border-zinc-200"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* SIDEBAR SHEET BACKDROP */}
      {selectedOrder && (
        <div
          className="fixed top-16 bottom-0 left-0 right-0 bg-black/30 z-30 transition-opacity"
          onClick={closePanel}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR SHEET (Matches Today Orders Drawer) */}
      <div 
        className={`fixed top-16 bottom-0 right-0 w-full sm:w-105 xl:w-115 bg-white border-l border-zinc-200 shadow-2xl transition-transform duration-300 z-40 flex flex-col ${
          selectedOrder ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {selectedOrder && (
          <>
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-100 flex justify-between items-start bg-zinc-50 shrink-0 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl font-bold text-zinc-900">Order #{selectedOrder.orderNumber}</h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getOrderTypeBadgeClass(selectedOrder)}`}
                  >
                    {getOrderTypeLabel(selectedOrder)}
                  </span>
                  <Badge className={`${getStatusBadge(selectedOrder.status)} text-[10px] uppercase font-bold px-2 py-0.5 border shadow-none`}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-zinc-800">
                  {getOrderLocationLabel(selectedOrder)}
                  {getOrderPartyLabel(selectedOrder) && ` · ${getOrderPartyLabel(selectedOrder)}`}
                </p>
                {getPlacerName(selectedOrder) && (
                  <p className="text-xs font-bold text-zinc-900 mt-1">
                    By {getPlacerName(selectedOrder)}
                    {selectedOrder.processedByRole ? ` (${selectedOrder.processedByRole})` : ""}
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-md border border-zinc-400 bg-red-500 text-white hover:bg-red-600 hover:text-white shrink-0" 
                onClick={closePanel}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Order Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3 font-medium">
                    <span className="text-zinc-500 shrink-0">Order Type</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getOrderTypeBadgeClass(selectedOrder)}`}
                    >
                      {getOrderTypeLabel(selectedOrder)}
                    </span>
                  </div>
                  {shouldShowTable(selectedOrder) && (
                    <div className="flex justify-between gap-3 font-medium">
                      <span className="text-zinc-500">Table</span>
                      <span className="text-zinc-900 font-bold">{selectedOrder.tableNo}</span>
                    </div>
                  )}
                  {(selectedOrder.partyName || selectedOrder.guestName) && (
                    <div className="flex justify-between gap-3 font-medium">
                      <span className="text-zinc-500 shrink-0">
                        {selectedOrder.source === "STAFF" ? "Staff Member" : "Party / Guest"}
                      </span>
                      <span className="text-zinc-900 font-bold text-right">
                        {selectedOrder.partyName || selectedOrder.guestName}
                      </span>
                    </div>
                  )}
                  {selectedOrder.guestCount != null && (
                    <div className="flex justify-between gap-3 font-medium">
                      <span className="text-zinc-500">Guests / Covers</span>
                      <span className="text-zinc-900 font-bold">{selectedOrder.guestCount}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 font-medium">
                    <span className="text-zinc-500">Placed At</span>
                    <span className="text-zinc-900 font-medium">
                      {moment(selectedOrder.createdAt).format("MMM D, YYYY · h:mm A")}
                    </span>
                  </div>
                  {selectedOrder.source === "STAFF" && selectedOrder.staffOrderReason && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 mt-2">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                        Reason
                      </span>
                      <p className="text-sm font-semibold text-indigo-900 whitespace-pre-wrap">
                        {selectedOrder.staffOrderReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-zinc-200" />

              {/* Payment Section */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Payment</h3>
                <div className="space-y-3 text-sm">
                  <div className={`rounded-xl border-2 px-4 py-3 flex justify-between items-center ${
                    orderStatusUpper === "WAIVED"
                      ? "bg-slate-100 text-slate-800 border-slate-200"
                      : getPaymentColor(selectedOrder.paymentStatus)
                  }`}>
                    <span className="text-xs font-bold uppercase tracking-wide">Status</span>
                    <span className="text-sm font-black uppercase tracking-tight">
                      {orderStatusUpper === "WAIVED"
                        ? "WAIVED"
                        : selectedOrder.paymentStatus || "UNPAID"}
                    </span>
                  </div>
                  {orderStatusUpper === "WAIVED" && selectedOrder.waiveReason && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Waive Reason
                      </span>
                      <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                        {selectedOrder.waiveReason}
                      </p>
                    </div>
                  )}
                  {selectedOrder.paymentMethod && (
                    <div className="flex justify-between text-zinc-500 font-medium">
                      <span>Method</span>
                      <span className="text-zinc-800 font-semibold">{selectedOrder.paymentMethod}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-500 font-medium">
                    <span>Tip</span>
                    <span className="text-zinc-800 font-semibold">${Number(selectedOrder.tipAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-200" />
              
              {/* Order Items */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
                  Order Items ({selectedOrder.items?.length || 0})
                </h3>
                <div className="space-y-3.5">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex gap-2.5 min-w-0">
                        <span className="text-sm font-black text-zinc-900 shrink-0">{item.qty}x</span>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-zinc-900 block">{item.name}</span>
                          {item.size && item.size !== "Standard" && (
                            <span className="text-xs text-zinc-600 font-semibold block">Variant: {item.size}</span>
                          )}
                          {item.preparationStyle && (
                            <span className="text-xs text-zinc-600 font-semibold italic block">
                              {item.preparationStyle}
                            </span>
                          )}
                          {item.options
                            ?.filter((opt) => {
                              const value = String(opt || "");
                              if (value.toLowerCase().startsWith("style:")) return false;
                              if (
                                item.preparationStyle &&
                                value.toLowerCase() === String(item.preparationStyle).toLowerCase()
                              ) {
                                return false;
                              }
                              return true;
                            })
                            .map((opt, i) => (
                              <span key={i} className="text-xs text-zinc-500 font-medium block italic">
                                + {opt}
                              </span>
                            ))}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-zinc-900 shrink-0 ml-3">
                        ${(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.specialNote && (
                <>
                  <div className="h-px bg-zinc-200" />
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Special Note</h3>
                    <p className="text-sm text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-200 italic">
                      &quot;{selectedOrder.specialNote}&quot;
                    </p>
                  </div>
                </>
              )}

              <div className="h-px bg-zinc-200" />

              {/* Financial Calculation Breakdown */}
              {(() => {
                const discountPct =
                  selectedOrder.discountPercent != null
                    ? Number(selectedOrder.discountPercent)
                    : selectedOrder.subTotal > 0 && selectedOrder.discountTotal > 0
                      ? Math.round(
                          (selectedOrder.discountTotal / selectedOrder.subTotal) * 1000
                        ) / 10
                      : null;
                const discountLabel =
                  discountPct != null && discountPct > 0
                    ? `Discount (${discountPct}%)`
                    : Number(selectedOrder.discountTotal) > 0
                      ? `Discount ($${Number(selectedOrder.discountTotal).toFixed(2)})`
                      : "Discount";

                const totalHstRate = (() => {
                  const breakdownRatesSum = (selectedOrder.taxBreakdown || []).reduce(
                    (sum, t) => sum + (Number(t.rate) || 0),
                    0
                  );
                  if (breakdownRatesSum > 0) return Math.round(breakdownRatesSum * 10) / 10;
                  const taxableBase = Math.max(
                    0,
                    (selectedOrder.subTotal || 0) - (selectedOrder.discountTotal || 0)
                  );
                  if (taxableBase > 0 && (selectedOrder.taxTotal || 0) > 0) {
                    return Math.round(((selectedOrder.taxTotal || 0) / taxableBase) * 1000) / 10;
                  }
                  if ((selectedOrder.subTotal || 0) > 0 && (selectedOrder.taxTotal || 0) > 0) {
                    return Math.round(((selectedOrder.taxTotal || 0) / (selectedOrder.subTotal || 0)) * 1000) / 10;
                  }
                  return null;
                })();
                const hstLabel = totalHstRate != null && totalHstRate > 0 ? `HST (${totalHstRate}%)` : "HST";

                return (
                  <div className="space-y-2 text-sm bg-zinc-50/80 p-4 rounded-xl border border-zinc-200">
                    <div className="flex justify-between text-zinc-600 font-medium">
                      <span>Subtotal</span>
                      <span className="text-zinc-900 font-semibold">${(selectedOrder.subTotal || 0).toFixed(2)}</span>
                    </div>
                    {Number(selectedOrder.discountTotal || 0) > 0 && (
                      <>
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>{discountLabel}</span>
                          <span>-${Number(selectedOrder.discountTotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-600 font-medium">
                          <span>Net Subtotal</span>
                          <span className="text-zinc-900 font-semibold">
                            ${Math.max(0, (selectedOrder.subTotal || 0) - (selectedOrder.discountTotal || 0)).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                    {(Number(selectedOrder.taxTotal || 0) > 0 || (Number(selectedOrder.discountTotal || 0) > 0 && totalHstRate > 0)) && (
                      <div className="flex justify-between text-zinc-600 font-medium">
                        <span>{hstLabel}</span>
                        <span className="text-zinc-900 font-semibold">${(selectedOrder.taxTotal || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {Number(selectedOrder.serviceChargeTotal || 0) > 0 && (
                      <div className="flex justify-between text-zinc-600 font-medium">
                        <span>{selectedOrder.serviceChargeName || "Service Charge"}</span>
                        <span className="text-zinc-900 font-semibold">${Number(selectedOrder.serviceChargeTotal).toFixed(2)}</span>
                      </div>
                    )}
                    {Number(selectedOrder.tipAmount || 0) > 0 && (
                      <>
                        <div className="flex justify-between text-zinc-600 font-medium">
                          <span>Order Total</span>
                          <span className="text-zinc-900 font-semibold">${Number(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-600 font-medium">
                          <span>Tip {selectedOrder.tipMethod ? `(${selectedOrder.tipMethod})` : ""}</span>
                          <span className="text-zinc-900 font-semibold">${Number(selectedOrder.tipAmount || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-base font-bold text-zinc-900 pt-2 border-t border-zinc-200 mt-1">
                      <span>Total</span>
                      <span className="text-orange-600">${getOrderGrandTotal(selectedOrder).toFixed(2)}</span>
                    </div>
                    {selectedOrder.paymentMethod && (
                      <div className="flex justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-200">
                        <span>Payment Method</span>
                        <span className="font-semibold text-zinc-700">{selectedOrder.paymentMethod}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-zinc-200 shrink-0 bg-white space-y-2">
              {(() => {
                const hasBarItems = Boolean(
                  selectedOrder?.items?.some(
                    (it) =>
                      it.productType === "BAR" ||
                      ["BAR", "WINE", "BEER", "DRINKS", "BEVERAGES", "COCKTAILS"].includes(
                        String(it.category || "").toUpperCase()
                      )
                  )
                );

                return (
                  <div className={`grid ${hasBarItems ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
                    <Button
                      onClick={() => {
                        setPrintType("customer");
                        setIsPrintModalOpen(true);
                      }}
                      className="h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-none text-xs"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      Receipt
                    </Button>
                    <Button
                      onClick={() => {
                        setPrintType("kot");
                        setIsPrintModalOpen(true);
                      }}
                      variant="outline"
                      className="h-10 border-zinc-200 text-zinc-800 hover:bg-zinc-100 font-bold rounded-xl shadow-none text-xs"
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 mr-1 text-zinc-600" />
                      KOT
                    </Button>
                    {hasBarItems && (
                      <Button
                        onClick={() => {
                          setPrintType("bar");
                          setIsPrintModalOpen(true);
                        }}
                        variant="outline"
                        className="h-10 border-zinc-200 text-zinc-800 hover:bg-zinc-100 font-bold rounded-xl shadow-none text-xs"
                      >
                        <Wine className="w-3.5 h-3.5 mr-1 text-zinc-600" />
                        Bar
                      </Button>
                    )}
                  </div>
                );
              })()}
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold text-xs"
                onClick={closePanel}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </div>

      {/* RECEIPT / KOT PRINT PREVIEW MODAL */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        order={selectedOrder}
        printType={printType}
        kotItems={selectedOrder?.items || []}
        taxBreakdown={selectedOrder?.taxBreakdown || []}
        restaurantDetails={{
          name: selectedOrder?.restaurantName || "TASTY BITES",
        }}
        restaurantName={selectedOrder?.restaurantName || "TASTY BITES"}
        serverName={getPlacerName(selectedOrder || {})}
        guestCount={selectedOrder?.guestCount}
        specialNote={selectedOrder?.specialNote}
      />
    </div>
  );
}