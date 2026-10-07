"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CreditCard,
  DoorOpen,
  Loader2,
  Plus,
  Printer,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PrintPreviewModal from "@/components/receipts/PrintPreviewModal";
import {
  filterItemsBySeat,
  filterItemsBySeats,
  formatMergedSeatLabel,
  formatSeatLabel,
  normalizeSeatNumber,
  proportionalOrderTotalsForItems,
} from "@/lib/orders/seatHelpers";
import {
  getOrderLocationLabel,
  getOrderPartyLabel,
  shouldShowTable,
} from "@/utils/orderDisplay";

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function seatsFromSplit(split) {
  if (Array.isArray(split?.seatNumbers) && split.seatNumbers.length) {
    return split.seatNumbers;
  }
  if (split?.seatNumber !== undefined && split?.seatNumber !== null) {
    return [split.seatNumber];
  }
  return [];
}

function splitDisplayName(split, index) {
  const name = String(split?.name || "").trim();
  if (name) return name;
  const seats = seatsFromSplit(split);
  if (seats.length > 1) return formatMergedSeatLabel(seats);
  if (seats.length === 1) return formatSeatLabel(seats[0]);
  return `Payer ${index + 1}`;
}

export default function SalesPaymentThankYouPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params?.orderId;
  const sessionIdParam = searchParams?.get("sessionId") || null;
  const returnTo = searchParams?.get("returnTo") || null;
  const seatParam = searchParams?.get("seat");
  const seatMode =
    seatParam === null || seatParam === undefined || seatParam === ""
      ? null
      : seatParam === "table"
        ? "table"
        : seatParam;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const [isSeatReleaseOpen, setIsSeatReleaseOpen] = useState(false);
  const [isNewOrderReleaseOpen, setIsNewOrderReleaseOpen] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [tableReleased, setTableReleased] = useState(false);

  const resolvedSessionId = useMemo(() => {
    if (sessionIdParam) return sessionIdParam;
    const raw = order?.tableSession;
    if (!raw) return null;
    if (typeof raw === "object") return raw._id || raw.id || null;
    return raw;
  }, [sessionIdParam, order?.tableSession]);

  const seatPayNumber =
    seatMode === "table" || seatMode === "TABLE"
      ? null
      : seatMode != null
        ? normalizeSeatNumber(seatMode)
        : null;
  const seatPayLabel =
    seatMode != null ? formatSeatLabel(seatPayNumber) : null;

  const isPartial =
    String(order?.paymentStatus || "").toUpperCase() === "PARTIAL";

  const paymentSplits = useMemo(
    () => (Array.isArray(order?.paymentSplits) ? order.paymentSplits : []),
    [order?.paymentSplits],
  );

  const seatRows = useMemo(() => {
    if (!paymentSplits.length) return [];
    return paymentSplits.map((split, index) => {
      const seats = seatsFromSplit(split);
      const tip = Number(split.tipAmount) || 0;
      const cash = Number(split.cashAmount) || 0;
      const card = Number(split.cardAmount) || 0;
      const gift =
        Number(split.giftAmount) ||
        Number(split.giftcardUsedAmount) ||
        Number(split.giftUseAmount) ||
        0;
      const amount = Number(split.amount) || cash + card + gift || 0;
      return {
        id: split._id || split.id || `split-${index}`,
        name: splitDisplayName(split, index),
        seatsLabel:
          seats.length > 1
            ? formatMergedSeatLabel(seats)
            : seats.length === 1
              ? formatSeatLabel(seats[0])
              : null,
        method: String(split.method || split.paymentMethod || "").trim() || "—",
        amount,
        tip,
        cash,
        card,
        gift,
      };
    });
  }, [paymentSplits]);

  const grandTotal = useMemo(() => {
    const base = Number(order?.totalAmount) || 0;
    const tip = Number(order?.tipAmount) || 0;
    if (paymentSplits.length) {
      const fromSplits = paymentSplits.reduce((sum, s) => {
        return (
          sum +
          (Number(s.amount) || 0) +
          (Number(s.tipAmount) || 0)
        );
      }, 0);
      if (fromSplits > 0.009) return fromSplits;
    }
    return base + tip;
  }, [order, paymentSplits]);

  const isTableSession = Boolean(resolvedSessionId);

  const printSlips = useMemo(() => {
    if (!order) return null;
    if (!paymentSplits.length) return null;

    return paymentSplits.map((split, index) => {
      const seats = seatsFromSplit(split);
      const label =
        seats.length > 1
          ? formatMergedSeatLabel(seats)
          : seats.length === 1
            ? formatSeatLabel(seats[0])
            : splitDisplayName(split, index);
      const tipAmt = Number(split.tipAmount) || 0;
      const cashAmt = Number(split.cashAmount) || 0;
      const cardAmt = Number(split.cardAmount) || 0;
      const giftAmt =
        Number(split.giftAmount) ||
        Number(split.giftcardUsedAmount) ||
        Number(split.giftUseAmount) ||
        0;
      const amount = Number(split.amount) || 0;
      const method =
        String(split.method || split.paymentMethod || "").trim() || "Card";
      const partyName = splitDisplayName(split, index);

      const items =
        seats.length > 1
          ? filterItemsBySeats(order.items || [], seats)
          : seats.length === 1
            ? filterItemsBySeat(order.items || [], seats[0])
            : order.items || [];

      const totals = seats.length
        ? proportionalOrderTotalsForItems(order, items)
        : {
            subTotal: order.subTotal,
            taxTotal: order.taxTotal,
            discountTotal: order.discountTotal,
            serviceChargeTotal: order.serviceChargeTotal,
            totalAmount: amount || order.totalAmount,
            taxBreakdown: order.taxBreakdown,
          };

      const previewOrder = {
        ...order,
        items: order.items || [],
        subTotal: Number(totals.subTotal || 0),
        taxTotal: Number(totals.taxTotal || 0),
        discountTotal: Number(totals.discountTotal || 0),
        serviceChargeTotal: Number(totals.serviceChargeTotal || 0),
        totalAmount: amount > 0 ? amount : Number(totals.totalAmount || 0),
        tipAmount: tipAmt,
        tipMethod: tipAmt > 0 ? split.tipMethod || null : null,
        giftcardUsedAmount: giftAmt,
        cashAmount: cashAmt,
        cardAmount: cardAmt,
        paymentMethod: method,
        guestName: partyName,
        partyName,
        taxBreakdown: totals.taxBreakdown || order.taxBreakdown,
      };

      const jobMetadata = {
        isSplitReceipt: true,
        filterReceiptBySeat: seats.length > 0,
        splitIndex: index + 1,
        splitTotal: paymentSplits.length,
        splitSeatNumber: seats.length === 1 ? seats[0] : null,
        splitSeatNumbers: seats,
        splitName: partyName,
        splitAmount: amount,
        splitMethod: method,
        paymentMethod: method,
        cashAmount: cashAmt,
        cardAmount: cardAmt,
        tipAmount: tipAmt,
        giftcardUsedAmount: giftAmt,
        guestName: partyName,
        partyName,
      };

      return {
        id: split._id || split.id || `slip-${index}`,
        label,
        order: previewOrder,
        jobMetadata,
      };
    });
  }, [order, paymentSplits]);

  const goBack = useCallback(
    (extraQuery) => {
      if (returnTo) {
        let url = returnTo;
        if (extraQuery) {
          const sep = returnTo.includes("?") ? "&" : "?";
          url = `${returnTo}${sep}${extraQuery}`;
        }
        router.push(url);
        return;
      }
      if (resolvedSessionId) {
        router.push(
          `/sales/orders/${resolvedSessionId}${
            extraQuery ? `?${extraQuery}` : ""
          }`,
        );
        return;
      }
      if (order?.source === "STAFF") {
        router.push("/sales/staff");
        return;
      }
      if (order?.source === "TAKEAWAY" || order?.source === "WALK_IN") {
        router.push("/sales/take-away");
        return;
      }
      router.push("/sales/today");
    },
    [returnTo, resolvedSessionId, order?.source, router],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orderId) return;
      setLoading(true);
      setError("");
      try {
        if (typeof window !== "undefined") {
          const cached = sessionStorage.getItem(`payment-thankyou-${orderId}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed && parsed._id) setOrder(parsed);
            } catch {
              /* ignore bad cache */
            }
          }
        }
        const res = await fetch(`/api/orders/${orderId}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.success || !json.data) {
          setError(json.message || "Order not found");
          return;
        }
        setOrder(json.data);
        try {
          sessionStorage.removeItem(`payment-thankyou-${orderId}`);
        } catch {
          /* ignore */
        }
      } catch {
        if (!cancelled) setError("Failed to load order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const releaseSession = async (sid) => {
    if (!sid) return false;
    try {
      const res = await fetch("/api/sales/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, action: "RELEASE" }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch {
      return false;
    }
  };

  const releaseSeat = async ({ sid, oid, seat }) => {
    if (!sid || !oid) return false;
    try {
      const res = await fetch("/api/sales/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          action: "RELEASE_SEAT",
          orderId: oid,
          seatNumber: seat == null ? "table" : seat,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Could not release seat");
        return false;
      }
      return true;
    } catch {
      toast.error("Could not release seat");
      return false;
    }
  };

  const goToNewOrderOnTable = useCallback(() => {
    if (resolvedSessionId) {
      router.push(`/sales/orders/${resolvedSessionId}?fresh=1`);
      return;
    }
    if (order?.source === "STAFF") {
      router.push("/sales/staff");
      return;
    }
    if (order?.source === "TAKEAWAY" || order?.source === "WALK_IN") {
      router.push("/sales/take-away");
      return;
    }
    router.push("/sales/today");
  }, [resolvedSessionId, order?.source, router]);

  const handleReleaseTable = async ({ thenGoFloor = true } = {}) => {
    if (!resolvedSessionId) return false;
    setIsReleasing(true);
    const ok = await releaseSession(resolvedSessionId);
    setIsReleasing(false);
    if (ok) {
      setTableReleased(true);
      toast.success("Table released");
      if (thenGoFloor) router.push("/floor");
      return true;
    }
    toast.error("Could not release table");
    return false;
  };

  const handleDone = () => {
    // Seat-only pays still offer seat release; table release is its own button.
    if (seatMode != null && resolvedSessionId && !tableReleased) {
      setIsSeatReleaseOpen(true);
      return;
    }
    goBack(isPartial || seatMode != null ? "refreshPay=1" : undefined);
  };

  const handleNewOrder = () => {
    if (isTableSession && !tableReleased) {
      setIsNewOrderReleaseOpen(true);
      return;
    }
    if (tableReleased) {
      router.push("/floor");
      return;
    }
    goToNewOrderOnTable();
  };

  if (loading && !order) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm font-semibold">Loading receipt…</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-zinc-50 px-4">
        <p className="text-sm font-bold text-zinc-700">{error}</p>
        <Button
          type="button"
          onClick={() => goBack()}
          className="rounded-xl bg-zinc-900 px-4 font-bold text-white"
        >
          Go back
        </Button>
      </div>
    );
  }

  const party = getOrderPartyLabel(order) || order?.partyName || order?.guestName;
  const location = getOrderLocationLabel(order);
  const orderNumber = order?.orderNumber || "—";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-zinc-50">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(251,146,60,0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(16,185,129,0.12), transparent 50%)",
        }}
      />

      {/* Full-width scroll so the orange scrollbar sits on the page edge */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative flex h-24 w-24 items-center justify-center"
          >
            <motion.span
              className="absolute inset-0 rounded-full bg-emerald-400/25"
              initial={{ scale: 0.8, opacity: 0.9 }}
              animate={{ scale: 1.45, opacity: 0 }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <motion.span
              className="absolute inset-2 rounded-full bg-emerald-500/20"
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: 1.25, opacity: 0 }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.2,
              }}
            />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
              <motion.div
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <Check
                  className="h-10 w-10 text-white"
                  strokeWidth={3}
                  aria-hidden
                />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="mt-5 space-y-1"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">
              {isPartial ? "Payment recorded" : "Order completed"}
            </p>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">
              Thank you
            </h1>
            <p className="text-sm font-semibold text-zinc-500">
              {isPartial
                ? "Receipt slip is on the way to the printer."
                : "Payment collected · receipt is printing."}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.32, duration: 0.4 }}
          className="mt-4 space-y-4"
        >
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Order
                </p>
                <p className="mt-0.5 text-2xl font-black tabular-nums text-zinc-900">
                  #{orderNumber}
                </p>
                {party ? (
                  <p className="mt-1 text-sm font-bold text-zinc-600">
                    Party · {party}
                  </p>
                ) : null}
                {shouldShowTable(order) && location ? (
                  <p className="text-sm font-semibold text-zinc-500">
                    {location}
                  </p>
                ) : null}
                {seatPayLabel ? (
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-orange-600">
                    Paid · {seatPayLabel}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Collected
                </p>
                <p className="mt-0.5 text-2xl font-black tabular-nums text-emerald-600">
                  {money(grandTotal)}
                </p>
                <p className="mt-1 text-xs font-bold text-zinc-500">
                  {String(order?.paymentMethod || "").trim() ||
                    (isPartial ? "Partial" : "Paid")}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-sm font-semibold text-zinc-600 sm:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Subtotal
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-zinc-900">
                  {money(order?.subTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Tax
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-zinc-900">
                  {money(order?.taxTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Tip
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-zinc-900">
                  {money(order?.tipAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Server
                </p>
                <p className="mt-0.5 truncate text-base font-bold text-zinc-900">
                  {order?.processedByName || "—"}
                </p>
              </div>
            </div>
          </div>

          {seatRows.length > 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                  {seatRows.length > 1 ? "Seats & splits" : "Payment group"}
                </p>
              </div>
              <ul className="space-y-2">
                {seatRows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-zinc-900">
                        {row.name}
                      </p>
                      {row.seatsLabel ? (
                        <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                          {row.seatsLabel}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">
                        {row.method}
                        {row.cash > 0 ? ` · Cash ${money(row.cash)}` : ""}
                        {row.card > 0 ? ` · Card ${money(row.card)}` : ""}
                        {row.gift > 0 ? ` · Gift ${money(row.gift)}` : ""}
                        {row.tip > 0 ? ` · Tip ${money(row.tip)}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black tabular-nums text-zinc-900">
                      {money(row.amount + row.tip)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <Button
              type="button"
              onClick={handleNewOrder}
              className="h-14 w-full rounded-xl bg-emerald-600 text-base font-bold text-white shadow-none hover:bg-emerald-700 sm:text-lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              New order
            </Button>
            <div
              className={`grid gap-2 ${
                isTableSession && !tableReleased
                  ? "grid-cols-3"
                  : "grid-cols-2"
              }`}
            >
              <Button
                type="button"
                onClick={() => setIsPrintOpen(true)}
                className="h-14 rounded-xl bg-zinc-900 px-2 text-sm font-bold text-white shadow-none hover:bg-zinc-800 sm:text-base"
              >
                <Printer className="mr-1.5 h-5 w-5 shrink-0 sm:mr-2" />
                <span className="truncate">
                  Print bill
                  {printSlips && printSlips.length > 1
                    ? ` (${printSlips.length})`
                    : ""}
                </span>
              </Button>
              {isTableSession && !tableReleased ? (
                <Button
                  type="button"
                  onClick={() => setIsReleaseOpen(true)}
                  disabled={isReleasing}
                  className="h-14 rounded-xl bg-emerald-700 px-2 text-sm font-bold text-white shadow-none hover:bg-emerald-800 sm:text-base"
                >
                  <DoorOpen className="mr-1.5 h-5 w-5 shrink-0 sm:mr-2" />
                  <span className="truncate">Release table</span>
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={handleDone}
                className="h-14 rounded-xl bg-orange-500 px-2 text-sm font-bold text-white shadow-none hover:bg-orange-600 sm:text-base"
              >
                <span className="truncate">Done</span>
                <ArrowRight className="ml-1.5 h-5 w-5 shrink-0 sm:ml-2" />
              </Button>
            </div>
          </div>

          {tableReleased ? (
            <p className="text-center text-[11px] font-bold text-emerald-700">
              Table released — start a new sitting from the floor.
            </p>
          ) : (
            <p className="text-center text-[11px] font-medium text-zinc-400">
              <CreditCard className="mr-1 inline h-3.5 w-3.5" />
              {printSlips && printSlips.length > 1
                ? "Print bill opens each seat/group receipt."
                : "You can reprint the customer receipt anytime from Print bill."}
            </p>
          )}
        </motion.div>
        </div>
      </div>

      <PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        printType="customer"
        order={order}
        kotItems={order?.items || []}
        restaurantDetails={{
          name: order?.restaurantName || "TASTY BITES",
        }}
        guestCount={order?.guestCount}
        specialNote={order?.specialNote}
        serverName={order?.processedByName}
        slips={printSlips}
      />

      {isSeatReleaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 p-5">
              <h2 className="text-lg font-bold text-zinc-900">
                Release {seatPayLabel || "seat"}?
              </h2>
              <p className="mt-1 text-sm font-semibold text-zinc-500">
                Payment for {seatPayLabel || "this seat"} is done. Release only
                this seat so other guests can keep dining? The table will stay
                open.
              </p>
            </div>
            <div className="flex gap-2 p-5">
              <button
                type="button"
                disabled={isReleasing}
                onClick={() => {
                  setIsSeatReleaseOpen(false);
                  goBack("refreshPay=1");
                }}
                className="h-12 flex-1 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700"
              >
                Not now
              </button>
              <button
                type="button"
                disabled={isReleasing}
                onClick={async () => {
                  setIsReleasing(true);
                  const ok = await releaseSeat({
                    sid: resolvedSessionId,
                    oid: order?._id || orderId,
                    seat: seatPayNumber,
                  });
                  setIsReleasing(false);
                  setIsSeatReleaseOpen(false);
                  if (ok) toast.success(`${seatPayLabel || "Seat"} released`);
                  goBack("refreshPay=1");
                }}
                className="h-12 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
              >
                {isReleasing ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  `Yes, release ${seatPayLabel || "seat"}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isReleaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 p-5">
              <h2 className="text-lg font-bold text-zinc-900">Release Table?</h2>
              <p className="mt-1 text-sm font-semibold text-zinc-500">
                Clear this table so it is free for the next guests.
              </p>
            </div>
            <div className="flex gap-2 p-5">
              <button
                type="button"
                disabled={isReleasing}
                onClick={() => setIsReleaseOpen(false)}
                className="h-12 flex-1 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReleasing}
                onClick={async () => {
                  setIsReleaseOpen(false);
                  await handleReleaseTable({ thenGoFloor: true });
                }}
                className="h-12 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
              >
                {isReleasing ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  "Yes, Release"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewOrderReleaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 p-5">
              <h2 className="text-lg font-bold text-zinc-900">
                Release this table?
              </h2>
              <p className="mt-1 text-sm font-semibold text-zinc-500">
                You chose New order before releasing the table. Release it now
                and pick a table on the floor, or keep this table open and start
                another order here.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-5">
              <button
                type="button"
                disabled={isReleasing}
                onClick={async () => {
                  setIsNewOrderReleaseOpen(false);
                  const ok = await handleReleaseTable({ thenGoFloor: true });
                  if (!ok) return;
                }}
                className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
              >
                {isReleasing ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  "Yes, release table"
                )}
              </button>
              <button
                type="button"
                disabled={isReleasing}
                onClick={() => {
                  setIsNewOrderReleaseOpen(false);
                  goToNewOrderOnTable();
                }}
                className="h-12 w-full rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600"
              >
                No, keep table · new order here
              </button>
              <button
                type="button"
                disabled={isReleasing}
                onClick={() => setIsNewOrderReleaseOpen(false)}
                className="h-11 w-full rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
