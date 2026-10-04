"use client";

import React, { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { publicApiBase, getPublicRestaurantSlug } from "@/lib/public/clientConfig";
import OrderStatusTracker from "@/components/ordering/OrderStatusTracker";
import {
  getReceiptModifierLines,
  getItemLineTotal,
} from "@/utils/productChoices";

function OrderContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderNumber = params?.orderNumber;
  const phoneFromQuery = searchParams.get("phone") || "";

  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const slug = getPublicRestaurantSlug();

  const loadOrder = useCallback(async () => {
    if (!orderNumber) {
      setError("Missing order number.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ticket = encodeURIComponent(String(orderNumber).replace(/^#/, ""));
      // Prefer /orders/track/:n — nested /orders/:n was returning HTML 404 under Turbopack.
      // Fallback query on /orders stays on the always-registered route.
      const urls = [
        `${publicApiBase(slug)}/orders/track/${ticket}`,
        `${publicApiBase(slug)}/orders?orderNumber=${ticket}`,
      ];

      let lastMessage = "Order not found";
      let loaded = null;

      for (const url of urls) {
        const res = await fetch(url, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          lastMessage =
            res.status === 404
              ? "Order not found"
              : "Could not load order (invalid server response).";
          continue;
        }
        const json = await res.json();
        if (res.ok && json?.success && json.data) {
          loaded = json.data;
          break;
        }
        lastMessage = json?.message || lastMessage;
      }

      if (!loaded) {
        throw new Error(lastMessage);
      }
      setOrder(loaded);
    } catch (err) {
      setOrder(null);
      setError(err.message || "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [orderNumber, phoneFromQuery, slug]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!order) return;
    const id = setInterval(() => {
      loadOrder();
    }, 15000);
    return () => clearInterval(id);
  }, [order, loadOrder]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-8 py-10 space-y-8">
        <div className="space-y-3">
          <Link
            href="/order"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--customer-muted)] transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to order search
          </Link>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Order confirmation
            </p>
            <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] text-zinc-900">
              Order #{orderNumber}
            </h1>
            <p className="text-sm text-zinc-600">
              Same-day pickup · Pay at the restaurant
            </p>
          </div>
        </div>

        {loading && !order && (
          <p className="text-sm text-zinc-500">Loading order…</p>
        )}

        {error && !order && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 space-y-4">
            <p className="text-sm text-red-700">{error}</p>
            <Button asChild variant="outline" className="h-11 text-xs font-bold uppercase tracking-widest">
              <Link href="/order">Back to order search</Link>
            </Button>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            <OrderStatusTracker
              status={order.status}
              paymentStatus={order.paymentStatus}
            />

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Name</p>
                  <p className="font-semibold">{order.partyName}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Pickup</p>
                  <p className="font-semibold">
                    {order.pickup
                      ? `${order.pickup.date} · ${order.pickup.time}`
                      : "Same-day pickup"}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Payment</p>
                  <p className="font-semibold">{order.paymentStatus} · Pay at restaurant</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Total</p>
                  <p className="font-extrabold text-primary tabular-nums text-lg">
                    ${Number(order.totalAmount).toFixed(2)}
                  </p>
                </div>
              </div>

              <ul className="border-t border-zinc-100 pt-4 space-y-3">
                {order.items?.map((item, idx) => {
                  const modifierLines = getReceiptModifierLines(item);
                  return (
                    <li key={idx} className="text-sm">
                      <div className="flex justify-between gap-3">
                        <span>
                          <span className="font-semibold">{item.qty}×</span>{" "}
                          {item.name}
                          {item.size && item.size !== "Standard"
                            ? ` (${item.size})`
                            : ""}
                        </span>
                        <span className="tabular-nums font-bold">
                          ${getItemLineTotal(item).toFixed(2)}
                        </span>
                      </div>
                      {modifierLines.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 pl-5 text-xs text-zinc-600">
                          {modifierLines.map((line, lineIdx) => (
                            <li
                              key={`${line.kind}-${lineIdx}`}
                              className={
                                line.kind === "addon-choice-item" ||
                                line.kind === "choice-item"
                                  ? "pl-2 font-semibold text-sky-800"
                                  : "font-semibold text-zinc-700"
                              }
                            >
                              {line.text}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {item.notes ? (
                        <p className="mt-1 pl-5 text-xs text-amber-700">
                          Note: {item.notes}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {order.specialNote && (
                <p className="text-sm text-zinc-600 border-t border-zinc-100 pt-4">
                  <span className="font-bold">Note:</span> {order.specialNote}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="h-11 bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-widest"
              >
                <Link href="/menu">Continue Ordering</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 text-xs font-bold uppercase tracking-widest"
              >
                <Link href="/order">Search Another Order</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 text-xs font-bold uppercase tracking-widest"
                onClick={() => loadOrder()}
              >
                Refresh Status
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
}
