"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import OrderPaymentView from "@/components/sales/OrderPaymentView";
import PrintPreviewModal from "@/components/receipts/PrintPreviewModal";
import { isActiveServiceTax } from "@/lib/orders/serviceCharge";
import { formatSeatLabel, normalizeSeatNumber } from "@/lib/orders/seatHelpers";

export default function SalesPaymentPage() {
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
  const [serviceTax, setServiceTax] = useState(null);
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printOrder, setPrintOrder] = useState(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const [isSeatReleaseOpen, setIsSeatReleaseOpen] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [pendingSeatRelease, setPendingSeatRelease] = useState(null);

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
        const [orderRes, taxRes] = await Promise.all([
          fetch(`/api/orders/${orderId}`),
          fetch("/api/tax/servicetax?active=1"),
        ]);
        const orderJson = await orderRes.json();
        const taxJson = await taxRes.json();
        if (cancelled) return;
        if (!orderJson.success || !orderJson.data) {
          setError(orderJson.message || "Order not found");
          setOrder(null);
          return;
        }
        const loaded = orderJson.data;
        if (
          loaded.paymentStatus === "PAID" ||
          loaded.status === "PAID"
        ) {
          setError("This order has already been paid.");
          setOrder(loaded);
          return;
        }
        setOrder(loaded);
        setGuestName(loaded.partyName || loaded.guestName || "");
        const rd = loaded.restaurantDetails;
        setRestaurantDetails({
          name: rd?.name || loaded.restaurantName || "TASTY BITES",
          phone: rd?.phone || null,
          address: rd?.address || null,
        });
        if (taxJson.success) {
          const list = Array.isArray(taxJson.data) ? taxJson.data : [];
          const active =
            list.find((t) => isActiveServiceTax(t)) || list[0] || null;
          setServiceTax(active);
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

  const finishAfterPay = () => {
    if (resolvedSessionId) {
      setIsReleaseOpen(true);
      return;
    }
    goBack();
  };

  const openSeatReleasePrompt = (paidOrder) => {
    setPendingSeatRelease({
      orderId: paidOrder?._id || orderId,
      seatNumber: seatPayNumber,
      label: seatPayLabel || formatSeatLabel(seatPayNumber),
    });
    setIsSeatReleaseOpen(true);
  };

  const handlePaid = (updatedOrder) => {
    const paid = updatedOrder || order;
    if (!paid) return;

    if (typeof window !== "undefined" && paid?._id) {
      const source = String(paid?.source || order?.source || "").toUpperCase();
      if (source === "WALK_IN" || source === "TAKEAWAY") {
        const stored =
          sessionStorage.getItem("direct-order-takeaway") ||
          sessionStorage.getItem("direct-order-walk-in");
        if (stored && String(stored) === String(paid._id)) {
          sessionStorage.removeItem("direct-order-takeaway");
          sessionStorage.removeItem("direct-order-walk-in");
        }
      }
      if (source === "STAFF") {
        const stored = sessionStorage.getItem("direct-order-staff");
        if (stored && String(stored) === String(paid._id)) {
          sessionStorage.removeItem("direct-order-staff");
        }
      }
    }

    const isPartial =
      String(paid?.paymentStatus || "").toUpperCase() === "PARTIAL";

    const receiptOrder = {
      ...order,
      ...paid,
      paymentStatus: paid?.paymentStatus || (isPartial ? "PARTIAL" : "PAID"),
      status: isPartial
        ? paid?.status || order?.status || "CONFIRMED"
        : "PAID",
      partyName: guestName || paid?.partyName || paid?.guestName || "",
      guestName: guestName || paid?.guestName || "",
    };
    setOrder(receiptOrder);

    // Seat-scoped pay: never release the whole table — prompt seat release only
    if (seatMode != null) {
      toast.success(
        isPartial
          ? "Seat payment recorded · remaining seats still unpaid"
          : "Seat payment collected",
      );
      if (resolvedSessionId) {
        openSeatReleasePrompt(receiptOrder);
      } else {
        goBack("refreshPay=1");
      }
      return;
    }

    if (isPartial) {
      toast.success("Partial payment recorded");
      goBack("refreshPay=1");
      return;
    }

    const splitCount = Array.isArray(receiptOrder?.paymentSplits)
      ? receiptOrder.paymentSplits.length
      : 0;

    if (splitCount >= 1) {
      toast.success(
        splitCount > 1
          ? `${splitCount} split receipt slips sent to the printer`
          : "Payment collected · receipt slip queued",
      );
      finishAfterPay();
      return;
    }

    setPrintOrder(receiptOrder);
    setIsPrintOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold">Loading payment…</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-zinc-50 px-4">
        <p className="text-sm font-bold text-zinc-700">{error}</p>
        <button
          type="button"
          onClick={() => goBack()}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white"
        >
          Go back
        </button>
      </div>
    );
  }

  if (error && order?.paymentStatus === "PAID") {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-zinc-50 px-4">
        <p className="text-sm font-bold text-zinc-700">{error}</p>
        <button
          type="button"
          onClick={() => goBack()}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-50">
      <OrderPaymentView
        order={order}
        sessionId={resolvedSessionId || undefined}
        guestName={guestName}
        onGuestNameChange={setGuestName}
        serviceTax={serviceTax}
        onCancel={() => goBack()}
        onPaid={handlePaid}
        redeemNote="POS Payment"
        seatMode={seatMode}
        restaurantDetails={restaurantDetails}
      />

      <PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => {
          setIsPrintOpen(false);
          setPrintOrder(null);
          finishAfterPay();
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

      {isSeatReleaseOpen && pendingSeatRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 p-5">
              <h2 className="text-lg font-bold text-zinc-900">
                Release {pendingSeatRelease.label}?
              </h2>
              <p className="mt-1 text-sm font-semibold text-zinc-500">
                Payment for {pendingSeatRelease.label} is done. Release only
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
                  setPendingSeatRelease(null);
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
                  const label = pendingSeatRelease.label;
                  const seat = pendingSeatRelease.seatNumber;
                  const oid = pendingSeatRelease.orderId;
                  setIsReleasing(true);
                  const ok = await releaseSeat({
                    sid: resolvedSessionId,
                    oid,
                    seat,
                  });
                  setIsReleasing(false);
                  setIsSeatReleaseOpen(false);
                  setPendingSeatRelease(null);
                  if (ok) toast.success(`${label} released`);
                  goBack("refreshPay=1");
                }}
                className="h-12 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
              >
                {isReleasing ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  `Yes, release ${pendingSeatRelease.label}`
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
                Payment is complete. Do you want to release this table now?
              </p>
            </div>
            <div className="flex gap-2 p-5">
              <button
                type="button"
                disabled={isReleasing}
                onClick={() => {
                  setIsReleaseOpen(false);
                  goBack();
                }}
                className="h-12 flex-1 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700"
              >
                Stay / Go back
              </button>
              <button
                type="button"
                disabled={isReleasing}
                onClick={async () => {
                  setIsReleasing(true);
                  const ok = await releaseSession(resolvedSessionId);
                  setIsReleasing(false);
                  setIsReleaseOpen(false);
                  if (ok) toast.success("Table released");
                  else toast.error("Could not release table");
                  router.push("/floor");
                }}
                className="h-12 flex-1 rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600"
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
    </div>
  );
}
