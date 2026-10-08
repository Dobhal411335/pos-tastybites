"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import OrderPaymentView from "@/components/sales/OrderPaymentView";
import NetworkErrorPanel from "@/components/common/NetworkErrorPanel";
import { isActiveServiceTax } from "@/lib/orders/serviceCharge";
import { normalizeSeatNumber } from "@/lib/orders/seatHelpers";

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
  const [reloadKey, setReloadKey] = useState(0);

  const resolvedSessionId = useMemo(() => {
    if (sessionIdParam) return sessionIdParam;
    const raw = order?.tableSession;
    if (!raw) return null;
    if (typeof raw === "object") return raw._id || raw.id || null;
    return raw;
  }, [sessionIdParam, order?.tableSession]);

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
  }, [orderId, reloadKey]);

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

    try {
      sessionStorage.setItem(
        `payment-thankyou-${paid._id || orderId}`,
        JSON.stringify(receiptOrder),
      );
    } catch {
      /* ignore quota */
    }

    const q = new URLSearchParams();
    if (resolvedSessionId) q.set("sessionId", String(resolvedSessionId));
    if (returnTo) q.set("returnTo", returnTo);
    if (seatMode != null) {
      q.set(
        "seat",
        seatMode === "table" || seatMode === "TABLE"
          ? "table"
          : String(normalizeSeatNumber(seatMode) ?? seatMode),
      );
    }
    const qs = q.toString();
    router.push(
      `/sales/thank-you/${paid._id || orderId}${qs ? `?${qs}` : ""}`,
    );
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
        <NetworkErrorPanel
          title="Unable to load payment"
          message={error}
          onRetry={() => setReloadKey((n) => n + 1)}
        />
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
    </div>
  );
}
