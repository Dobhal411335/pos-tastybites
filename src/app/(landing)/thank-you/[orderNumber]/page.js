"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Store,
  Truck,
} from "lucide-react";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { publicApiBase, getPublicRestaurantSlug } from "@/lib/public/clientConfig";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import {
  getItemLineTotal,
  getReceiptModifierLines,
} from "@/utils/productChoices";

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function ThankYouContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderNumber = params?.orderNumber;
  const phoneFromQuery = searchParams.get("phone") || "";
  const { restaurant } = useRestaurantPublic();
  const slug = getPublicRestaurantSlug();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const brandName = restaurant?.name || order?.restaurantName || "Tasty Bites";
  const address =
    restaurant?.address ||
    order?.restaurantDetails?.address ||
    order?.restaurantAddress ||
    "";

  const loadOrder = useCallback(async () => {
    if (!orderNumber) {
      setError("Missing order number.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem(
          `online-thankyou-${String(orderNumber).replace(/^#/, "")}`,
        );
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.orderNumber) setOrder(parsed);
          } catch {
            /* ignore */
          }
        }
      }

      const ticket = encodeURIComponent(String(orderNumber).replace(/^#/, ""));
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
        if (!contentType.includes("application/json")) continue;
        const json = await res.json();
        if (res.ok && json?.success && json.data) {
          loaded = json.data;
          break;
        }
        lastMessage = json?.message || lastMessage;
      }

      if (!loaded) throw new Error(lastMessage);
      setOrder(loaded);
      try {
        sessionStorage.removeItem(
          `online-thankyou-${String(orderNumber).replace(/^#/, "")}`,
        );
      } catch {
        /* ignore */
      }
    } catch (err) {
      if (!order) setError(err.message || "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [orderNumber, slug]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const trackHref = `/order/${encodeURIComponent(
    String(order?.orderNumber || orderNumber || "").replace(/^#/, ""),
  )}${
    phoneFromQuery
      ? `?phone=${encodeURIComponent(phoneFromQuery)}`
      : order?.contactNumber
        ? `?phone=${encodeURIComponent(
            String(order.contactNumber).replace(/\D/g, ""),
          )}`
        : ""
  }`;

  const pickupLabel = order?.pickup
    ? `${order.pickup.date || "Today"} · ${order.pickup.time || order.pickup.label || ""}`.trim()
    : "Same-day pickup";

  if (loading && !order) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--customer-surface)]">
        <Navbar />
        <main className="flex flex-1 items-center justify-center gap-3 text-[var(--customer-muted)]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-semibold">Loading your order…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--customer-surface)]">
        <Navbar />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild className="h-11 bg-primary font-bold text-white hover:bg-primary-hover">
              <Link href="/menu">Back to menu</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 font-bold">
              <Link href="/order">Track an order</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--customer-surface)] text-[var(--customer-ink)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 45% at 50% -8%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 55%), radial-gradient(ellipse 50% 35% at 85% 100%, rgba(16,185,129,0.1), transparent 50%)",
        }}
      />
      <Navbar />

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
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
                <Check className="h-10 w-10 text-white" strokeWidth={3} />
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.35 }}
              className="mt-5 space-y-1"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">
                Order confirmed
              </p>
              <h1 className="text-3xl font-black tracking-tight text-[var(--customer-ink)] sm:text-4xl">
                Thank you
              </h1>
              <p className="text-sm font-semibold text-[var(--customer-muted)]">
                The kitchen has your order. Pay at pickup.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.32, duration: 0.4 }}
            className="mt-8 space-y-4"
          >
            <div className="rounded-2xl border border-[var(--border)]/20 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--customer-muted)]">
                    Order
                  </p>
                  <p className="mt-0.5 text-2xl font-black tabular-nums text-[var(--customer-ink)]">
                    #{order?.orderNumber || orderNumber}
                  </p>
                  {order?.partyName ? (
                    <p className="mt-1 text-sm font-bold text-[var(--customer-muted)]">
                      {order.partyName}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--customer-muted)]">
                    Total due
                  </p>
                  <p className="mt-0.5 text-2xl font-black tabular-nums text-primary">
                    {money(order?.totalAmount)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[var(--customer-muted)]">
                    {order?.paymentStatus || "UNPAID"} · Pay at restaurant
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2">
                <div className="flex items-start gap-2.5 rounded-xl bg-[var(--customer-surface-low)] px-3 py-2.5 text-left">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--customer-muted)]">
                      Pickup
                    </p>
                    <p className="text-sm font-bold text-[var(--customer-ink)]">
                      {pickupLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl bg-[var(--customer-surface-low)] px-3 py-2.5 text-left">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--customer-muted)]">
                      Restaurant
                    </p>
                    <p className="truncate text-sm font-bold text-[var(--customer-ink)]">
                      {brandName}
                    </p>
                    {address ? (
                      <p className="mt-0.5 flex items-start gap-1 text-xs font-medium text-[var(--customer-muted)]">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{address}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-sm font-semibold sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--customer-muted)]">
                    Subtotal
                  </p>
                  <p className="mt-0.5 text-base font-bold tabular-nums">
                    {money(order?.subTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--customer-muted)]">
                    Tax
                  </p>
                  <p className="mt-0.5 text-base font-bold tabular-nums">
                    {money(order?.taxTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--customer-muted)]">
                    Items
                  </p>
                  <p className="mt-0.5 text-base font-bold tabular-nums">
                    {Array.isArray(order?.items) ? order.items.length : 0}
                  </p>
                </div>
              </div>
            </div>

            {Array.isArray(order?.items) && order.items.length > 0 ? (
              <div className="rounded-2xl border border-[var(--border)]/20 bg-white p-5 shadow-sm">
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-primary">
                  Your order
                </p>
                <ul className="space-y-3">
                  {order.items.map((item, idx) => {
                    const modifierLines = getReceiptModifierLines(item);
                    return (
                      <li
                        key={idx}
                        className="rounded-xl border border-zinc-100 bg-[var(--customer-surface-low)]/60 px-3.5 py-3 text-left text-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <span>
                            <span className="font-extrabold">{item.qty}×</span>{" "}
                            <span className="font-bold">{item.name}</span>
                            {item.size && item.size !== "Standard"
                              ? ` (${item.size})`
                              : ""}
                          </span>
                          <span className="shrink-0 font-black tabular-nums">
                            {money(getItemLineTotal(item))}
                          </span>
                        </div>
                        {modifierLines.length > 0 ? (
                          <ul className="mt-1 space-y-0.5 pl-5 text-xs text-[var(--customer-muted)]">
                            {modifierLines.map((line, lineIdx) => (
                              <li key={`${line.kind}-${lineIdx}`}>
                                {line.text}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {order.specialNote ? (
                  <p className="mt-4 border-t border-zinc-100 pt-3 text-sm text-[var(--customer-muted)]">
                    <span className="font-bold text-[var(--customer-ink)]">
                      Note:
                    </span>{" "}
                    {order.specialNote}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Button
                asChild
                className="h-14 w-full rounded-xl bg-emerald-600 text-base font-bold text-white shadow-none hover:bg-emerald-700 sm:text-lg"
              >
                <Link href="/menu">
                  <Plus className="mr-2 h-5 w-5" />
                  Make another order
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  asChild
                  className="h-14 rounded-xl bg-[var(--customer-ink)] px-2 text-sm font-bold text-white shadow-none hover:opacity-90 sm:text-base"
                >
                  <Link href={trackHref}>
                    <Truck className="mr-1.5 h-5 w-5 shrink-0" />
                    <span className="truncate">Track order</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-14 rounded-xl border-[var(--border)]/30 bg-white px-2 text-sm font-bold text-[var(--customer-ink)] shadow-none hover:bg-[var(--customer-surface-low)] sm:text-base"
                >
                  <Link href="/menu">
                    <ArrowLeft className="mr-1.5 h-5 w-5 shrink-0" />
                    <span className="truncate">Back to menu</span>
                  </Link>
                </Button>
              </div>
            </div>

            <p className="text-center text-[11px] font-medium text-[var(--customer-muted)]">
              Save your order number to check status anytime from Track order.
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function OnlineOrderThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--customer-muted)]">
          Loading…
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
