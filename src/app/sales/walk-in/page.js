"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  LayoutGrid,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  ShoppingBag,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSocket } from "@/components/providers/SocketProvider";
import TodayOrderPaymentModal from "@/components/sales/TodayOrderPaymentModal";
import PrintPreviewModal from "@/components/receipts/PrintPreviewModal";
import {
  getOrderPartyLabel,
  getOrderTypeBadgeClass,
} from "@/utils/orderDisplay";
import { cn } from "@/lib/utils";

const OPEN_STATUSES = new Set(["PENDING", "CONFIRMED"]);

function isOrderPaid(order) {
  return (
    String(order?.paymentStatus || "").toUpperCase() === "PAID" ||
    String(order?.status || "").toUpperCase() === "PAID"
  );
}

function isOrderOpen(order) {
  const status = String(order?.status || "").toUpperCase();
  return OPEN_STATUSES.has(status) && !isOrderPaid(order);
}

function getOrderGrandTotal(order) {
  return Number(order?.totalAmount || 0) + Number(order?.tipAmount || 0);
}

function getItemCount(order) {
  return (order?.items || []).reduce(
    (sum, item) => sum + (Number(item.qty ?? item.quantity) || 0),
    0,
  );
}

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function statusBadgeClass(order) {
  if (isOrderPaid(order)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  const status = String(order?.status || "").toUpperCase();
  if (status === "PENDING") {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  if (status === "CONFIRMED") {
    return "bg-sky-50 text-sky-800 border-sky-200";
  }
  if (status === "CANCELLED" || status === "WAIVED") {
    return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

function clearWalkInResumeKey() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("direct-order-walk-in");
}

const STAT_CARDS = [
  {
    id: "OPEN",
    label: "Unpaid",
    hint: "Need payment",
    Icon: Wallet,
    tone: {
      idle: "border-amber-200 bg-amber-50/80 hover:bg-amber-50",
      active: "border-amber-500 bg-amber-100 ring-1 ring-amber-200",
      icon: "bg-amber-500 text-white",
      value: "text-amber-900",
      label: "text-amber-800",
    },
  },
  {
    id: "PAID",
    label: "Paid today",
    hint: "Completed",
    Icon: CheckCircle2,
    tone: {
      idle: "border-emerald-200 bg-emerald-50/80 hover:bg-emerald-50",
      active: "border-emerald-500 bg-emerald-100 ring-1 ring-emerald-200",
      icon: "bg-emerald-600 text-white",
      value: "text-emerald-900",
      label: "text-emerald-800",
    },
  },
  {
    id: "ALL",
    label: "All orders",
    hint: "Today total",
    Icon: LayoutGrid,
    tone: {
      idle: "border-orange-200 bg-orange-50/80 hover:bg-orange-50",
      active: "border-orange-500 bg-orange-100 ring-1 ring-orange-200",
      icon: "bg-orange-500 text-white",
      value: "text-orange-950",
      label: "text-orange-800",
    },
  },
];

export default function WalkInHubPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const listRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("OPEN");
  const [payOrder, setPayOrder] = useState(null);
  const [serviceTax, setServiceTax] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch("/api/orders/employee?today=true");
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Failed to load walk-in orders.");
        return;
      }
      const walkIns = (data.data || []).filter(
        (order) => String(order.source || "").toUpperCase() === "WALK_IN",
      );
      setOrders(walkIns);
      setPayOrder((prev) => {
        if (!prev) return null;
        return walkIns.find((o) => o._id === prev._id) || null;
      });
    } catch {
      toast.error("Failed to load walk-in orders.");
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
          setServiceTax(list[0] || null);
        }
      } catch {
        /* optional */
      }
    };
    loadServiceTax();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => fetchOrders({ silent: true });
    socket.on("order:created", refresh);
    socket.on("order:updated", refresh);
    socket.on("payment:completed", refresh);
    return () => {
      socket.off("order:created", refresh);
      socket.off("order:updated", refresh);
      socket.off("payment:completed", refresh);
    };
  }, [socket, fetchOrders]);

  const stats = useMemo(() => {
    const openOrders = orders.filter(isOrderOpen);
    const paidOrders = orders.filter(isOrderPaid);
    const unpaidTotal = openOrders.reduce(
      (sum, o) => sum + getOrderGrandTotal(o),
      0,
    );
    const paidTotal = paidOrders.reduce(
      (sum, o) => sum + getOrderGrandTotal(o),
      0,
    );
    return {
      OPEN: { count: openOrders.length, amount: unpaidTotal },
      PAID: { count: paidOrders.length, amount: paidTotal },
      ALL: {
        count: orders.length,
        amount: unpaidTotal + paidTotal,
      },
    };
  }, [orders]);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (filter === "OPEN") {
      list = list.filter(isOrderOpen);
    } else if (filter === "PAID") {
      list = list.filter(isOrderPaid);
    }
    return list.sort((a, b) => {
      const aOpen = isOrderOpen(a) ? 0 : 1;
      const bOpen = isOrderOpen(b) ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [orders, filter]);

  const activeFilterMeta = STAT_CARDS.find((c) => c.id === filter) || STAT_CARDS[0];

  const selectFilter = (id) => {
    setFilter(id);
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const startNewWalkIn = () => {
    clearWalkInResumeKey();
    router.push("/sales/orders/walk-in?fresh=1");
  };

  const continueOrder = (order) => {
    const id = order?._id;
    if (!id) return;
    if (!isOrderOpen(order)) {
      toast.error("Only open walk-in orders can be continued.");
      return;
    }
    sessionStorage.setItem("direct-order-walk-in", String(id));
    router.push(`/sales/orders/walk-in?orderId=${encodeURIComponent(id)}`);
  };

  return (
    <div className="flex h-[calc(100vh-60px)] w-full flex-col overflow-hidden bg-zinc-50">
      <div className="shrink-0 border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl border-zinc-200"
              onClick={() => router.push("/floor")}
              aria-label="Back to Floor"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">
                Walk-in Orders
              </h1>
              <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
                Same-day walk-in sales · tap a card to filter
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-11 gap-2 rounded-xl border-zinc-200 font-bold"
              disabled={refreshing || loading}
              onClick={() => fetchOrders({ silent: true })}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button
              className="h-11 gap-2 rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600"
              onClick={startNewWalkIn}
            >
              <Plus className="h-4 w-4" />
              New walk-in order
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STAT_CARDS.map((card) => {
            const active = filter === card.id;
            const data = stats[card.id];
            const Icon = card.Icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => selectFilter(card.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-all",
                  active ? card.tone.active : card.tone.idle,
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      card.tone.icon,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-[10px] font-extrabold uppercase tracking-wider",
                        card.tone.label,
                      )}
                    >
                      {card.label}
                    </p>
                    <div className="mt-1 flex items-center gap-2.5">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-lg font-black tabular-nums leading-none",
                            card.tone.value,
                          )}
                        >
                          {data.count}
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                          {data.count === 1 ? "order" : "orders"}
                        </p>
                      </div>
                      <div className="h-7 w-px shrink-0 bg-zinc-300/70" />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-lg font-black tabular-nums leading-none",
                            card.tone.value,
                          )}
                        >
                          ${data.amount.toFixed(2)}
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                          total
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div ref={listRef} className="mx-auto max-w-6xl scroll-mt-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-orange-600">
                Showing
              </p>
              <h2 className="text-lg font-extrabold text-zinc-900">
                {activeFilterMeta.label}
                <span className="ml-2 text-sm font-bold text-zinc-400">
                  ({filtered.length})
                </span>
              </h2>
            </div>
            {filter === "OPEN" && stats.OPEN.count > 0 ? (
              <p className="text-sm font-bold tabular-nums text-amber-800">
                Unpaid total ${stats.OPEN.amount.toFixed(2)}
              </p>
            ) : null}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-sm font-semibold">Loading walk-in orders…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-zinc-900">
                  {filter === "OPEN"
                    ? "No unpaid walk-in orders"
                    : filter === "PAID"
                      ? "No paid walk-in orders yet today"
                      : "No walk-in orders today"}
                </h3>
                <p className="text-sm font-semibold text-zinc-500">
                  Start a new walk-in order to take a guest order without a table.
                </p>
              </div>
              <Button
                className="h-11 gap-2 rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600"
                onClick={startNewWalkIn}
              >
                <Plus className="h-4 w-4" />
                New walk-in order
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((order) => {
                const open = isOrderOpen(order);
                const paid = isOrderPaid(order);
                const party = getOrderPartyLabel(order) || "Walk-in";
                const total = getOrderGrandTotal(order);
                const items = getItemCount(order);
                const statusLabel = paid
                  ? "PAID"
                  : String(order.status || "PENDING").toUpperCase();

                return (
                  <article
                    key={order._id}
                    className={cn(
                      "flex flex-col rounded-2xl border bg-white p-4 shadow-sm",
                      open
                        ? "border-amber-200"
                        : paid
                          ? "border-emerald-100"
                          : "border-zinc-200",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-zinc-900">
                            #{order.orderNumber || "—"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`border text-[10px] font-extrabold uppercase tracking-wide ${statusBadgeClass(order)}`}
                          >
                            {statusLabel}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`border text-[10px] font-bold ${getOrderTypeBadgeClass(order)}`}
                          >
                            Walk-in
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-800">
                          <User className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="truncate">{party}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black tabular-nums text-zinc-900">
                          ${total.toFixed(2)}
                        </p>
                        <p className="flex items-center justify-end gap-1 text-[11px] font-semibold text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {formatTime(order.createdAt || order.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-zinc-500">
                      {items} item{items === 1 ? "" : "s"}
                      {order.processedByName
                        ? ` · ${order.processedByName}`
                        : ""}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                      {open ? (
                        <>
                          <Button
                            className="h-10 flex-1 rounded-xl bg-zinc-900 font-bold text-white hover:bg-zinc-800"
                            onClick={() => continueOrder(order)}
                          >
                            Continue
                          </Button>
                          <Button
                            className="h-10 flex-1 gap-1.5 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                            onClick={() => setPayOrder(order)}
                          >
                            <DollarSign className="h-4 w-4" />
                            Pay
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-10 flex-1 gap-1.5 rounded-xl border-zinc-200 font-bold"
                          onClick={() => {
                            setPrintOrder(order);
                            setIsPrintOpen(true);
                          }}
                        >
                          <Receipt className="h-4 w-4" />
                          Print receipt
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TodayOrderPaymentModal
        key={payOrder?._id || "walk-in-pay"}
        order={payOrder}
        open={Boolean(payOrder)}
        onClose={() => setPayOrder(null)}
        serviceTax={serviceTax}
        onPaid={async (updatedOrder) => {
          const paid = updatedOrder || payOrder;
          if (paid?._id) {
            const stored = sessionStorage.getItem("direct-order-walk-in");
            if (stored && String(stored) === String(paid._id)) {
              clearWalkInResumeKey();
            }
          }
          setPayOrder(null);
          await fetchOrders({ silent: true });
          if (paid) {
            setPrintOrder(paid);
            setIsPrintOpen(true);
          }
          toast.success("Walk-in order paid");
        }}
        redeemNote="Walk-in Payment"
      />

      <PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => {
          setIsPrintOpen(false);
          setPrintOrder(null);
        }}
        printType="customer"
        order={printOrder}
        kotItems={printOrder?.items || []}
        restaurantDetails={{
          name: printOrder?.restaurantName || "TASTY BITES",
        }}
        guestCount={printOrder?.guestCount}
        specialNote={printOrder?.specialNote}
        serverName={printOrder?.processedByName}
      />
    </div>
  );
}
