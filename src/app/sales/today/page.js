"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Clock, ChevronRight, X, 
  Receipt, ShoppingBag, Loader2, ArrowLeft, RefreshCw,
  DollarSign, Wallet, CreditCard, Banknote, Gift, User, Users, UtensilsCrossed
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import PrintPreviewModal from "@/components/receipts/PrintPreviewModal";
import TodayOrderPaymentModal from "@/components/sales/TodayOrderPaymentModal";
import {
  getOrderLocationLabel,
  getOrderTypeLabel,
  getOrderTypeBadgeClass,
  getOrderPartyLabel,
  shouldShowTable,
} from "@/utils/orderDisplay";

const STATUSES = ["All", "PENDING", "CONFIRMED", "CANCELLED", "WAIVED", "PAID", "ONLINE"];
const STATUS_RANK = {
  PENDING: 0,
  CONFIRMED: 1,
  COMPLETED: 2,
  PAID: 2,
  WAIVED: 3,
  CANCELLED: 4,
};

function getPlacerName(order) {
  if (order.processedByName) return order.processedByName;
  const p = order.processedBy;
  if (p && typeof p === "object") {
    return p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || null;
  }
  return null;
}

function getOrderGrandTotal(order) {
  return Number(order?.totalAmount || 0) + Number(order?.tipAmount || 0);
}

function isOrderPaid(order) {
  return order?.paymentStatus === "PAID" || order?.status === "PAID";
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

export default function TodayOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printType, setPrintType] = useState("kot");
  const [pendingReleaseAfterPrint, setPendingReleaseAfterPrint] =
    useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [serviceTax, setServiceTax] = useState(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isReleasingTable, setIsReleasingTable] = useState(false);
  const [releaseOrder, setReleaseOrder] = useState(null);
  const [isWaiveModalOpen, setIsWaiveModalOpen] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [isWaiving, setIsWaiving] = useState(false);

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/orders/employee?today=true");
      const data = await res.json();
      if (data.success) {
        const next = data.data || [];
        setOrders(next);
        setSelectedOrder((prev) => {
          if (!prev) return null;
          return next.find((o) => o._id === prev._id) || null;
        });
      }
    } catch (err) {
      toast.error("Failed to fetch today's orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const loadServiceTax = async () => {
      try {
        const res = await fetch("/api/tax/servicetax?active=1");
        const json = await res.json();
        if (json.success) {
          const list = Array.isArray(json.data) ? json.data : [];
          setServiceTax(
            list.find((t) => t.status === "Active") || list[0] || null,
          );
        }
      } catch {
        setServiceTax(null);
      }
    };
    loadServiceTax();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchOrders({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchOrders]);

  const stats = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "WAIVED");
    const totalOrders = valid.length;
    const totalSales = valid.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const tipsEarned = valid.reduce((sum, o) => sum + Number(o.tipAmount || 0), 0);
    return [
      { label: "Total Sales", short: "Sales", value: `$${totalSales.toFixed(2)}`, icon: DollarSign },
      { label: "Total Orders", short: "Orders", value: totalOrders.toString(), icon: ShoppingBag },
      { label: "Avg Order Value", short: "Avg", value: `$${avgOrderValue.toFixed(2)}`, icon: Receipt },
      { label: "Tips Earned", short: "Tips", value: `$${tipsEarned.toFixed(2)}`, icon: Wallet },
    ];
  }, [orders]);

  const paymentStats = useMemo(() => {
    const paid = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "WAIVED" && isOrderPaid(o));
    const totals = { cash: 0, card: 0, gift: 0 };
    const counts = { cash: 0, card: 0, gift: 0 };

    paid.forEach((order) => {
      const method = String(order.paymentMethod || "").toLowerCase();
      const giftUsed = Number(order.giftcardUsedAmount || 0);
      const isCard = method.includes("card") && !method.includes("gift");
      const isCash = method.includes("cash");
      const isGift = method.includes("gift");
      const remaining = Math.max(0, Number(order.totalAmount || 0) - giftUsed);
      const tip = Number(order.tipAmount || 0);

      if (giftUsed > 0 || isGift) {
        totals.gift += giftUsed > 0 ? giftUsed : remaining + tip;
        counts.gift += 1;
      }
      if (isCash) {
        totals.cash += remaining + tip;
        counts.cash += 1;
      } else if (isCard) {
        totals.card += remaining + tip;
        counts.card += 1;
      }
    });

    return [
      {
        key: "cash",
        label: "Cash",
        value: `$${totals.cash.toFixed(2)}`,
        count: counts.cash,
        icon: Banknote,
        iconColor: "text-emerald-600",
      },
      {
        key: "card",
        label: "Card",
        value: `$${totals.card.toFixed(2)}`,
        count: counts.card,
        icon: CreditCard,
        iconColor: "text-sky-600",
      },
      {
        key: "gift",
        label: "Gift",
        value: `$${totals.gift.toFixed(2)}`,
        count: counts.gift,
        icon: Gift,
        iconColor: "text-violet-600",
      },
    ];
  }, [orders]);

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING": return "bg-amber-100 text-amber-700";
      case "CONFIRMED": return "bg-emerald-100 text-emerald-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      case "WAIVED": return "bg-slate-100 text-slate-700";
      case "PAID": return "bg-blue-100 text-blue-700";
      case "COMPLETED": return "bg-emerald-100 text-emerald-700";
      default: return "bg-zinc-100 text-zinc-700";
    }
  };

  const getPaymentColor = (paymentStatus) => {
    switch (paymentStatus?.toUpperCase()) {
      case "PAID": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "PARTIAL": return "bg-amber-100 text-amber-800 border-amber-200";
      case "REFUNDED": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-rose-100 text-rose-800 border-rose-200";
    }
  };

  const getTypeIcon = (order) => {
    const source = order?.source || "POS";
    if (source === "ONLINE") return <ShoppingBag className="w-6 h-6 text-white" />;
    if (source === "STAFF") return <Users className="w-6 h-6 text-white" />;
    if (source === "WALK_IN") return <User className="w-6 h-6 text-white" />;
    if (order?.tableSession || order?.tableNo) {
      return <UtensilsCrossed className="w-6 h-6 text-white" />;
    }
    return <Receipt className="w-6 h-6 text-white" />;
  };

  const getTypeIconBg = (order) => {
    const source = order?.source || "POS";
    if (source === "WALK_IN") return "bg-orange-500";
    if (source === "STAFF") return "bg-indigo-500";
    if (source === "ONLINE") return "bg-sky-500";
    if (order?.tableSession || order?.tableNo) return "bg-emerald-500";
    return "bg-orange-400";
  };

  const filteredOrders = orders
    .filter((o) => {
      const matchesTab =
        activeTab === "All"
          ? true
          : activeTab === "ONLINE"
            ? o.source === "ONLINE"
            : o.status?.toUpperCase() === activeTab;
      const placer = getPlacerName(o) || "";
      const typeLabel = getOrderTypeLabel(o);
      const searchString = `${o.orderNumber || ""} ${o.tableNo || ""} ${o.guestName || ""} ${o.partyName || ""} ${o.source || ""} ${typeLabel} ${placer}`.toLowerCase();
      const matchesSearch = searchString.includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    })
    .sort((a, b) => {
      const rankA = STATUS_RANK[a.status?.toUpperCase()] ?? 9;
      const rankB = STATUS_RANK[b.status?.toUpperCase()] ?? 9;
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const closePanel = () => {
    setSelectedOrder(null);
    setIsPaymentModalOpen(false);
    setIsReleaseModalOpen(false);
    setReleaseOrder(null);
    setPendingReleaseAfterPrint(false);
    setIsPrintModalOpen(false);
    setIsWaiveModalOpen(false);
    setWaiveReason("");
  };

  const getOrderSessionId = (order) => {
    const session = order?.tableSession;
    if (!session) return null;
    if (typeof session === "object") return session._id || session.id || null;
    return session;
  };

  const handleStayAfterPayment = () => {
    setIsReleaseModalOpen(false);
    setReleaseOrder(null);
  };

  const handleReleaseTable = async (shouldRelease) => {
    if (!shouldRelease) {
      handleStayAfterPayment();
      return;
    }

    const sessionId = getOrderSessionId(releaseOrder || selectedOrder);
    if (!sessionId) {
      toast.error("No table session found for this order.");
      handleStayAfterPayment();
      return;
    }

    try {
      setIsReleasingTable(true);
      const res = await fetch("/api/sales/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "RELEASE" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Table released.");
        setIsReleaseModalOpen(false);
        setReleaseOrder(null);
        await fetchOrders({ silent: true });
      } else {
        toast.error(json.message || "Failed to release table.");
      }
    } catch (err) {
      toast.error("Failed to release table.");
    } finally {
      setIsReleasingTable(false);
    }
  };

  const openWaiveModal = () => {
    setWaiveReason("");
    setIsWaiveModalOpen(true);
  };

  const handleWaiveBill = async () => {
    if (!selectedOrder?._id) return;
    const reason = waiveReason.trim();
    if (!reason) {
      toast.error("Please enter a reason for waiving this bill.");
      return;
    }

    try {
      setIsWaiving(true);
      const res = await fetch("/api/orders/employee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder._id,
          action: "waive",
          reason,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to waive bill.");
        return;
      }

      const updated = json.data;
      setSelectedOrder((prev) => ({ ...(prev || {}), ...updated }));
      setIsWaiveModalOpen(false);
      setWaiveReason("");
      toast.success(
        updated?.sessionReleased
          ? "Bill waived and table released."
          : "Bill waived successfully."
      );
      await fetchOrders({ silent: true });
    } catch (err) {
      toast.error("Failed to waive bill.");
    } finally {
      setIsWaiving(false);
    }
  };

  const isOnlineOrder = selectedOrder?.source === "ONLINE";
  const orderStatusUpper = String(selectedOrder?.status || "").toUpperCase();
  const canWaive =
    selectedOrder &&
    !isOnlineOrder &&
    !isOrderPaid(selectedOrder) &&
    ["PENDING", "CONFIRMED"].includes(orderStatusUpper);
  const showPayNow = canWaive;

  const openPaymentModal = () => {
    if (!selectedOrder) return;
    setIsPaymentModalOpen(true);
  };
  const releaseTableLabel =
    releaseOrder?.tableNo ||
    selectedOrder?.tableNo ||
    "";

  return (
    <div className="h-full min-h-0 flex overflow-hidden bg-zinc-50 font-sans">
      
      {/* MAIN LIST AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        
        {/* HEADER & FILTERS */}
        <div className="bg-white px-4 py-3 border-b border-zinc-200 shrink-0 z-10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" onClick={() => router.push("/sales/floor")} className="h-10 px-2 border bg-red-500 hover:bg-red-600 text-white shrink-0">
                <ArrowLeft className="w-4 h-4 mr-1" /> Floor
              </Button>
              <h1 className="text-xl font-bold text-zinc-900 leading-none truncate py-1">Today&apos;s Orders</h1>
            </div>
            
            <div className="flex gap-2 items-center shrink-0">
              <Button
                variant="outline"
                className="h-10 rounded-xl border-zinc-200 px-4"
                onClick={() => fetchOrders({ silent: true })}
                disabled={refreshing || loading}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""} sm:mr-2`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  placeholder="Search ID, name, table..." 
                  className="pl-9 w-40 md:w-56 bg-zinc-50 border border-orange-500 font-semibold rounded-xl h-10 text-sm focus-visible:ring-1 focus-visible:ring-orange-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <div className="grid grid-cols-7 gap-2 min-w-[820px] h-20">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2.5 rounded-xl border border-zinc-500 bg-zinc-50 px-3 py-2.5 min-w-0">
                  <div className="p-2 bg-orange-500 text-white rounded-lg shrink-0">
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-zinc-900 uppercase tracking-wide truncate">{stat.short}</p>
                    <p className="text-lg font-bold text-zinc-900 leading-tight tabular-nums truncate">{loading ? "—" : stat.value}</p>
                  </div>
                </div>
              ))}
              {paymentStats.map((stat) => (
                <div key={stat.key} className="flex items-center gap-2.5 rounded-xl border border-zinc-500 bg-zinc-50 px-3 py-2.5 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 bg-orange-500 text-white ${stat.iconColor}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-zinc-900 uppercase tracking-wide truncate">
                      {stat.label}
                      {!loading && <span className="normal-case tracking-normal text-zinc-900"> · {stat.count}</span>}
                    </p>
                    <p className="text-lg font-bold text-zinc-900 leading-tight tabular-nums truncate">{loading ? "—" : stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveTab(status)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  activeTab === status 
                    ? "bg-zinc-900 text-white shadow-sm" 
                    : "bg-zinc-200 text-zinc-900 border hover:bg-zinc-300"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* LIST */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
          <div className="max-w-5xl mx-auto space-y-3">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 border-dashed">
                <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-zinc-900">No orders found today</h3>
                <p className="text-zinc-500 text-sm mt-1">Orders placed today will appear here.</p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const placerName = getPlacerName(order);
                const tip = Number(order.tipAmount || 0);
                const paymentType = getPaymentType(order);
                const PaymentIcon = paymentType.Icon;
                const orderTypeLabel = getOrderTypeLabel(order);
                const partyLabel = getOrderPartyLabel(order);
                const locationLabel = getOrderLocationLabel(order);
                return (
                  <div 
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                      selectedOrder?._id === order._id 
                        ? "border-orange-500 ring-1 ring-orange-500 shadow-md" 
                        : "border-zinc-200 hover:border-orange-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0 ${getTypeIconBg(order)}`}>
                        {getTypeIcon(order)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-zinc-900">Order #{order.orderNumber}</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getOrderTypeBadgeClass(order)}`}
                          >
                            {orderTypeLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="font-bold text-zinc-600">{locationLabel}</span>
                          {partyLabel && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                              <span className="font-semibold text-zinc-500">{partyLabel}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-wider flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />{" "}
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {placerName && <span className="normal-case tracking-normal">{placerName}</span>}
                          <span>{order.items?.length || 0} Items</span>
                          {tip > 0 && <span className="text-orange-600 normal-case tracking-normal">Tip ${tip.toFixed(2)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end border-t sm:border-none pt-3 sm:pt-0 border-zinc-100 mt-2 sm:mt-0">
                      <div className="text-right">
                        <div className="font-bold text-lg text-zinc-900">${getOrderGrandTotal(order).toFixed(2)}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${paymentType.className}`}>
                        <PaymentIcon className="w-3.5 h-3.5 shrink-0" />
                        {paymentType.label}
                      </span>
                      <Badge className={`${getStatusColor(order.status)} px-3 py-1 text-[11px] font-bold uppercase tracking-wider border-none shadow-none`}>
                        {order.status}
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-orange-500 transition-colors hidden sm:block" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div
          className="fixed top-16 bottom-12 left-0 right-0 bg-black/20 z-20"
          onClick={closePanel}
          aria-hidden="true"
        />
      )}

      <div 
        className={`fixed top-16 bottom-12 right-0 w-[400px] xl:w-[450px] bg-white border-l border-zinc-200 shadow-2xl transition-transform duration-300 z-30 flex flex-col ${
          selectedOrder ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {selectedOrder && (
          <>
            <div className="p-5 border-b border-zinc-100 flex justify-between items-start bg-zinc-50 shrink-0 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl font-bold text-zinc-900">Order #{selectedOrder.orderNumber}</h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getOrderTypeBadgeClass(selectedOrder)}`}
                  >
                    {getOrderTypeLabel(selectedOrder)}
                  </span>
                  <Badge className={`${getStatusColor(selectedOrder.status)} text-[10px] uppercase font-bold px-2 py-0.5 border-none shadow-none`}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-zinc-800">
                  {getOrderLocationLabel(selectedOrder)}
                  {getOrderPartyLabel(selectedOrder) &&
                    ` · ${getOrderPartyLabel(selectedOrder)}`}
                </p>
                {getPlacerName(selectedOrder) && (
                  <p className="text-xs font-bold text-zinc-900 mt-1">
                    By {getPlacerName(selectedOrder)}
                    {selectedOrder.processedByRole ? ` (${selectedOrder.processedByRole})` : ""}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="rounded-md border border-zinc-500 bg-red-500 text-white hover:bg-red-500 hover:text-white shrink-0" onClick={closePanel}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
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
                        {selectedOrder.source === "STAFF" ? "Staff Member" : "Party"}
                      </span>
                      <span className="text-zinc-900 font-bold text-right">
                        {selectedOrder.partyName || selectedOrder.guestName}
                      </span>
                    </div>
                  )}
                  {selectedOrder.source === "STAFF" && selectedOrder.staffOrderReason && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
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

              <div className="h-px bg-zinc-200"></div>

              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Payment</h3>
                <div className="space-y-3 text-sm">
                  <div className={`rounded-xl border-2 px-4 py-3 flex justify-between items-center ${
                    orderStatusUpper === "WAIVED"
                      ? "bg-slate-100 text-slate-800 border-slate-200"
                      : getPaymentColor(selectedOrder.paymentStatus)
                  }`}>
                    <span className="text-sm font-bold uppercase tracking-wide">Status</span>
                    <span className="text-md font-black uppercase tracking-tight">
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
                      <span className="text-zinc-800">{selectedOrder.paymentMethod}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-500 font-medium">
                    <span>Tip</span>
                    <span className="text-zinc-800">${Number(selectedOrder.tipAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-500"></div>
              
              <div>
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4">Order Items</h3>
                <div className="space-y-4">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex gap-3 min-w-0">
                        <span className="text-base font-black text-zinc-900 shrink-0">{item.qty}x</span>
                        <div className="min-w-0">
                          <span className="text-base font-bold text-zinc-900 block">{item.name}</span>
                          {item.size && item.size !== "Standard" && (
                            <span className="text-sm mt-1 text-zinc-900 font-semibold block">Variant: {item.size}</span>
                          )}
                          {item.preparationStyle && (
                            <span className="text-sm mt-1 text-zinc-900 font-semibold italic block">
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
                              <span key={i} className="text-sm mt-1 text-zinc-900 font-semibold block italic">
                                + {opt}
                              </span>
                            ))}
                        </div>
                      </div>
                      <span className="text-base font-bold text-zinc-900 shrink-0 ml-3">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.specialNote && (
                <>
                  <div className="h-px bg-zinc-100"></div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Note</h3>
                    <p className="text-sm text-zinc-600">{selectedOrder.specialNote}</p>
                  </div>
                </>
              )}

              <div className="h-px bg-zinc-100"></div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span className="text-zinc-800">Subtotal</span>
                  <span className="text-zinc-900">${(selectedOrder.subTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span className="text-zinc-800">Tax</span>
                  <span className="text-zinc-900">${(selectedOrder.taxTotal || 0).toFixed(2)}</span>
                </div>
                {Number(selectedOrder.discountTotal || 0) > 0 && (
                  <div className="flex justify-between text-zinc-500 font-medium">
                    <span className="text-zinc-800">Discount{selectedOrder.discountCode ? ` (${selectedOrder.discountCode})` : ""}</span>
                    <span className="text-zinc-900">-${Number(selectedOrder.discountTotal).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedOrder.giftcardUsedAmount || 0) > 0 && (
                  <div className="flex justify-between text-zinc-500 font-medium">
                    <span className="text-zinc-800">Gift Card</span>
                    <span className="text-zinc-900">-${Number(selectedOrder.giftcardUsedAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span className="text-zinc-800">Tip</span>
                  <span className="text-zinc-900">${Number(selectedOrder.tipAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-zinc-900 pt-2 border-t border-zinc-200 mt-2">
                  <span className="text-zinc-800">Total</span>
                  <span>${getOrderGrandTotal(selectedOrder).toFixed(2)}</span>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-zinc-400 shrink-0 bg-white space-y-2">
              {isOnlineOrder && (
                <Button
                  onClick={() => {
                    setPrintType("kot");
                    setPendingReleaseAfterPrint(false);
                    setIsPrintModalOpen(true);
                  }}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-none"
                >
                  Kitchen / KOT
                </Button>
              )}
              {showPayNow && (
                <Button
                  onClick={openPaymentModal}
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-none"
                >
                  Pay Now
                </Button>
              )}
              {canWaive && (
                <Button
                  onClick={openWaiveModal}
                  variant="outline"
                  className="w-full h-11 rounded border-slate-400 bg-slate-700 text-white hover:bg-slate-800 hover:text-white font-bold shadow-none"
                >
                  Waive Off
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full h-11 rounded border-zinc-500 bg-orange-500 text-white hover:bg-orange-600 hover:text-white font-bold"
                onClick={closePanel}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </div>

      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          if (printType === "customer" && pendingReleaseAfterPrint) {
            setPendingReleaseAfterPrint(false);
            setIsReleaseModalOpen(true);
            return;
          }
          setPendingReleaseAfterPrint(false);
        }}
        printType={printType}
        order={selectedOrder}
        kotItems={selectedOrder?.items || []}
        guestCount={selectedOrder?.guestCount}
        specialNote={selectedOrder?.specialNote}
        serverName={getPlacerName(selectedOrder || {})}
      />

      <TodayOrderPaymentModal
        key={selectedOrder?._id || "payment"}
        order={selectedOrder}
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        serviceTax={serviceTax}
        onPaid={async (updatedOrder) => {
          const paid = updatedOrder || selectedOrder;
          if (paid) {
            setSelectedOrder((prev) => ({ ...(prev || {}), ...paid }));
          }
          await fetchOrders({ silent: true });

          const sessionId = getOrderSessionId(paid);
          setReleaseOrder(sessionId ? paid : null);
          setPendingReleaseAfterPrint(Boolean(sessionId));
          setPrintType("customer");
          setIsPrintModalOpen(true);
        }}
        redeemNote="Today Orders Payment"
      />

      {isReleaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900">Release Table?</h2>
              <p className="text-sm font-semibold text-zinc-500 mt-1">
                Payment is complete
                {releaseTableLabel ? ` for ${releaseTableLabel}` : ""}.
                Do you want to release this table now, or stay on this order?
              </p>
            </div>
            <div className="p-5 flex gap-3">
              <Button
                variant="outline"
                disabled={isReleasingTable}
                onClick={() => handleReleaseTable(false)}
                className="flex-1 h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none"
              >
                Stay on Order
              </Button>
              <Button
                disabled={isReleasingTable}
                onClick={() => handleReleaseTable(true)}
                className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none"
              >
                {isReleasingTable ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Yes, Release"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isWaiveModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900">Waive Off Bill?</h2>
              <p className="text-sm font-semibold text-zinc-500 mt-1">
                Order #{selectedOrder.orderNumber}
                {selectedOrder.tableNo ? ` · ${selectedOrder.tableNo}` : ""}. Enter a reason to waive this unpaid bill.
              </p>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                rows={4}
                placeholder="e.g. Customer refused to pay after food was served"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                disabled={isWaiving}
              />
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <Button
                variant="outline"
                disabled={isWaiving}
                onClick={() => {
                  setIsWaiveModalOpen(false);
                  setWaiveReason("");
                }}
                className="flex-1 h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none"
              >
                Cancel
              </Button>
              <Button
                disabled={isWaiving || !waiveReason.trim()}
                onClick={handleWaiveBill}
                className="flex-1 h-12 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold shadow-none disabled:opacity-50"
              >
                {isWaiving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Confirm Waive"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
