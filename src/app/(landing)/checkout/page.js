"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Check, Lock, Mail, Store } from "lucide-react";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/context/CartContext";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import { publicApiBase } from "@/lib/public/clientConfig";

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, clearCart, itemCount, displaySubtotal } = useCart();
  const { restaurant, slug, refresh } = useRestaurantPublic();
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingGuest, setPendingGuest] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputsRef = useRef([]);
  const [seconds, setSeconds] = useState(42);

  const slots = restaurant?.pickupSlots || [];
  const brandName = restaurant?.name || "Tasty Bites";

  useEffect(() => {
    refresh?.();
  }, [refresh]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      pickupTime: "",
      message: "",
    },
  });

  useEffect(() => {
    if (itemCount === 0) return;
    let cancelled = false;
    async function runQuote() {
      setQuoting(true);
      try {
        const res = await fetch(`${publicApiBase(slug)}/orders/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cartItems }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to calculate totals");
        }
        if (!cancelled) setQuote(json.data);
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          toast.error(err.message || "Could not calculate tax/total");
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }
    runQuote();
    return () => {
      cancelled = true;
    };
  }, [cartItems, itemCount, slug]);

  useEffect(() => {
    if (!otpOpen) {
      setDigits(["", "", "", ""]);
      setSeconds(42);
      return;
    }
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [otpOpen]);

  const totals = useMemo(() => {
    if (quote) {
      return {
        subTotal: quote.subTotal,
        taxTotal: quote.taxTotal,
        totalAmount: quote.totalAmount,
      };
    }
    return {
      subTotal: displaySubtotal,
      taxTotal: null,
      totalAmount: null,
    };
  }, [quote, displaySubtotal]);

  const sendOtp = async (data) => {
    setSendingOtp(true);
    try {
      const res = await fetch(`${publicApiBase(slug)}/orders/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, fullName: data.fullName }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to send verification code");
      }
      setPendingGuest(data);
      setOtpOpen(true);
      if (json.data?.devOtp) {
        toast.success(`Dev OTP: ${json.data.devOtp}`);
      } else {
        toast.success("Verification code sent to your email");
      }
    } catch (err) {
      toast.error(err.message || "Could not send verification code");
    } finally {
      setSendingOtp(false);
    }
  };

  const placeOrder = async (otpCode) => {
    if (!pendingGuest) return;
    setPlacing(true);
    try {
      const res = await fetch(`${publicApiBase(slug)}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          fullName: pendingGuest.fullName,
          phone: pendingGuest.phone,
          email: pendingGuest.email,
          pickupTime: pendingGuest.pickupTime,
          customerNote: pendingGuest.message || "",
          otp: otpCode,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to place order");
      }

      const orderNumber = json.data.orderNumber;
      const phone = String(pendingGuest.phone).replace(/\D/g, "");
      clearCart();
      toast.success("Order placed! Pay at the restaurant when you pick up.");
      router.push(
        `/order/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`
      );
    } catch (err) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (itemCount === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--customer-surface)]">
        <Navbar />
        <main className="mx-auto flex-1 space-y-4 px-4 py-20 text-center max-w-lg">
          <h1 className="text-3xl font-bold text-[var(--customer-ink)]">Your cart is empty</h1>
          <p className="text-sm text-[var(--customer-muted)]">
            Add items from the menu to checkout.
          </p>
          <Button asChild className="h-12 bg-primary px-8 text-sm font-semibold text-white hover:bg-primary-hover">
            <Link href="/menu">Browse Menu</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--customer-surface)]">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-8">
        <div className="mb-8 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Checkout</p>
          <h1 className="text-3xl font-bold text-[var(--customer-ink)] md:text-4xl">
            Same-day pickup
          </h1>
          <p className="text-sm text-[var(--customer-muted)]">
            Verify your email, then pay at {brandName} when you pick up.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(sendOtp)}
          className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]"
        >
          <div className="space-y-6 rounded-2xl border border-[var(--border)]/20 bg-white p-6">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)]/20 bg-[var(--customer-surface-low)] px-4 py-3 text-sm font-semibold text-[var(--customer-ink)]">
              <Store className="h-4 w-4 text-primary" />
              Order type: <span className="text-primary">Pickup (same day)</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fullName">Full name *</Label>
                <Input
                  id="fullName"
                  className="h-11"
                  {...register("fullName", { required: "Name is required" })}
                />
                {errors.fullName && (
                  <p className="text-xs text-red-600">{errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  className="h-11"
                  {...register("phone", {
                    required: "Phone is required",
                    minLength: { value: 10, message: "Enter a valid phone number" },
                  })}
                />
                {errors.phone && (
                  <p className="text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (OTP verification) *</Label>
                <Input
                  id="email"
                  type="email"
                  className="h-11"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email",
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupTime">Pickup time today *</Label>
              {slots.length === 0 ? (
                <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-700">
                  Online pickup is closed for today. Please try again during restaurant hours or call us.
                </p>
              ) : (
                <select
                  id="pickupTime"
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                  {...register("pickupTime", { required: "Pickup time is required" })}
                >
                  <option value="">Select a time</option>
                  {slots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              )}
              {errors.pickupTime && (
                <p className="text-xs text-red-600">{errors.pickupTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Special instructions (optional)</Label>
              <textarea
                id="message"
                rows={3}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
                {...register("message")}
              />
            </div>
          </div>

          <aside className="sticky top-24 space-y-4 rounded-2xl border border-[var(--border)]/20 bg-white p-6">
            <h2 className="font-bold text-[var(--customer-ink)]">Order summary</h2>
            <ul className="max-h-56 space-y-3 overflow-y-auto">
              {cartItems.map((item) => (
                <li key={item.cartKey} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 text-[var(--customer-muted)]">
                    <span className="font-semibold text-[var(--customer-ink)]">
                      {item.quantity}×
                    </span>{" "}
                    {item.name}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-zinc-100 pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span className="tabular-nums">${Number(totals.subTotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tax</span>
                <span className="tabular-nums">
                  {quoting
                    ? "…"
                    : totals.taxTotal == null
                      ? "—"
                      : `$${Number(totals.taxTotal).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2 text-base font-extrabold">
                <span>Total</span>
                <span className="tabular-nums text-primary">
                  {totals.totalAmount == null
                    ? "—"
                    : `$${Number(totals.totalAmount).toFixed(2)}`}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Payment due at pickup · UNPAID online</p>
            </div>

            <Button
              type="submit"
              disabled={sendingOtp || quoting || slots.length === 0 || !quote}
              className="h-12 w-full bg-primary text-sm font-bold text-white hover:bg-primary-hover"
            >
              <Lock className="mr-2 h-4 w-4" />
              {sendingOtp ? "Sending code…" : "Verify Email & Place Order"}
            </Button>
            <Button asChild variant="outline" className="h-11 w-full text-sm font-bold">
              <Link href="/menu">Continue Ordering</Link>
            </Button>
          </aside>
        </form>
      </main>
      <Footer />

      {otpOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--customer-ink)]/60 backdrop-blur-sm"
            onClick={() => setOtpOpen(false)}
          />
          <div className="relative flex w-full max-w-md flex-col items-center rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-primary">
              <Mail className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold">Verify Your Email</h2>
            <p className="mt-1 mb-4 text-sm text-[var(--customer-muted)]">
              Code sent to <span className="font-bold">{pendingGuest?.email}</span>
            </p>
            <div className="mb-4 flex gap-3">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  value={d}
                  onChange={(e) => {
                    const char = e.target.value.replace(/\D/g, "").slice(-1);
                    const next = [...digits];
                    next[i] = char;
                    setDigits(next);
                    if (char && i < 3) inputsRef.current[i + 1]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digits[i] && i > 0) {
                      inputsRef.current[i - 1]?.focus();
                    }
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  className="h-14 w-12 rounded-xl bg-[var(--customer-surface-low)] text-center text-2xl font-bold focus:outline-none focus:shadow-[0_0_0_2px_var(--primary)]"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <p className="mb-4 text-sm text-[var(--customer-muted)]">
              {seconds > 0 ? (
                <>
                  Resend in <span className="font-bold text-primary">0:{String(seconds).padStart(2, "0")}</span>
                </>
              ) : (
                <button
                  type="button"
                  className="font-semibold text-primary"
                  onClick={() => pendingGuest && sendOtp(pendingGuest)}
                >
                  Resend code
                </button>
              )}
            </p>
            <Button
              disabled={placing || digits.join("").length < 4}
              onClick={() => placeOrder(digits.join(""))}
              className="h-12 w-full bg-primary font-bold text-white hover:bg-primary-hover"
            >
              <Check className="mr-2 h-4 w-4" />
              {placing ? "Placing order…" : "Confirm & Place Order"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
