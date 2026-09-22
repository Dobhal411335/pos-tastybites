"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Lock,
  Mail,
  Check,
  Store,
  Clock,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import { publicApiBase } from "@/lib/public/clientConfig";
import { cn } from "@/lib/utils";
import {
  getProductChoiceDetailLines,
  getAddonChoiceDetailLines,
} from "@/utils/productChoices";

function lineNote(item) {
  if (item.isOffer) {
    return (
      item.modifier ||
      [item.inclusions, item.choices, item.drinks].flat().filter(Boolean).join(", ") ||
      "Offer"
    );
  }
  const parts = [];
  if (item.size === "Extra" || item.selectedSize === "Extra") {
    if (item.parentProductName) parts.push(`Extra for ${item.parentProductName}`);
    else parts.push("Extra");
  } else if (item.selectedSize || item.size) {
    parts.push(item.selectedSize || item.size);
  }
  if (item.selectedAddons?.length) parts.push(item.selectedAddons.join(", "));
  if (item.preparationStyle) parts.push(item.preparationStyle);
  for (const line of getProductChoiceDetailLines(item)) {
    parts.push(`${line.label}: ${line.value}`);
  }
  for (const line of getAddonChoiceDetailLines(item)) {
    parts.push(`${line.label}: ${line.value}`);
  }
  return parts.join(" · ") || "Standard";
}

/**
 * @param {"drawer" | "menu"} mode
 * - drawer: slide-over cart (landing page / navbar)
 * - menu: sticky right sidebar on desktop + mobile drawer when `open`
 */
export default function CartDrawer({ open = false, onOpenChange, mode = "drawer" }) {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    itemCount,
    displaySubtotal,
  } = useCart();
  const { restaurant, slug, refresh } = useRestaurantPublic();
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowStep, setFlowStep] = useState(1);
  const [pendingGuest, setPendingGuest] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [placing, setPlacing] = useState(false);

  const isMenuMode = mode === "menu";
  const quoteActive = isMenuMode || open;

  const brandName = restaurant?.name || "Tasty Bites";
  const slots = restaurant?.pickupSlots || [];
  const address = restaurant?.address || "";

  // Fresh slots when opening checkout (timezone / clock sensitive).
  useEffect(() => {
    if (flowOpen && flowStep === 1) {
      refresh?.();
    }
  }, [flowOpen, flowStep, refresh]);

  useEffect(() => {
    if (!quoteActive || itemCount === 0) {
      setQuote(null);
      return;
    }
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
  }, [quoteActive, cartItems, itemCount, slug]);

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

  const resetFlow = () => {
    setFlowOpen(false);
    setFlowStep(1);
    setPendingGuest(null);
    setPlacedOrder(null);
    setSendingOtp(false);
    setPlacing(false);
  };

  const closeAll = () => {
    onOpenChange?.(false);
    if (flowStep === 3) {
      resetFlow();
    } else {
      setFlowOpen(false);
    }
  };

  const openCheckout = () => {
    if (itemCount === 0) {
      toast.error("Your bag is empty.");
      return;
    }
    setFlowStep(1);
    setPlacedOrder(null);
    setPendingGuest(null);
    setFlowOpen(true);
  };

  const handleCheckoutSubmit = async (data) => {
    setSendingOtp(true);
    try {
      const res = await fetch(`${publicApiBase(slug)}/orders/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          fullName: data.fullName,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to send verification code");
      }
      setPendingGuest(data);
      setFlowStep(2);
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

  const handleConfirmOtp = async (otpCode) => {
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
      setPlacedOrder(json.data);
      clearCart();
      setFlowStep(3);
      toast.success("Order placed! Pay at the restaurant when you pick up.");
    } catch (err) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const handleOrderAgain = () => {
    resetFlow();
    onOpenChange?.(false);
  };

  const renderBagBody = ({ showClose }) => (
    <>
      <div className="flex items-center justify-between bg-[var(--customer-surface-low)] p-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-[var(--customer-ink)]">Your Bag</h3>
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={closeAll}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--customer-surface-container)] text-[var(--customer-ink)]"
            aria-label="Close bag"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="bg-[var(--customer-surface-container)] px-4 py-2 text-xs text-[var(--customer-ink)]">
        <div className="flex items-center gap-1.5 font-semibold text-primary">
          <Store className="h-3.5 w-3.5" />
          Same-day restaurant pickup
        </div>
        <p className="mt-0.5 text-[var(--customer-muted)]">
          Pay at the restaurant when you collect your order.
        </p>
      </div>

      {itemCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--customer-surface-container)] text-[var(--customer-muted)]">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h4 className="text-lg font-semibold text-[var(--customer-ink)]">Your bag is empty</h4>
          <p className="mt-1 text-sm text-[var(--customer-muted)]">
            Explore the menu and add items to get started.
          </p>
          {!isMenuMode ? (
            <button
              type="button"
              onClick={closeAll}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Browse Menu
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {cartItems.map((item) => (
              <div
                key={item.cartKey}
                className="flex items-start justify-between gap-3 rounded-xl bg-[var(--customer-surface-low)] p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold leading-snug text-[var(--customer-ink)]">
                    {item.name}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--customer-muted)]">
                    {lineNote(item)}
                  </p>
                  <span className="mt-1.5 inline-block text-xs font-bold tabular-nums text-primary">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <div className="flex items-center rounded-lg bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center text-[var(--customer-ink)] hover:text-primary"
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center text-[var(--customer-ink)] hover:text-primary"
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.cartKey)}
                    className="p-1 text-[var(--customer-muted)] hover:text-red-600"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 bg-[var(--customer-surface-low)] p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-[var(--customer-muted)]">
                <span>Subtotal</span>
                <span className="tabular-nums">${Number(totals.subTotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[var(--customer-muted)]">
                <span>Tax</span>
                <span className="tabular-nums">
                  {quoting
                    ? "…"
                    : totals.taxTotal == null
                      ? "—"
                      : `$${Number(totals.taxTotal).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-lg font-bold text-[var(--customer-ink)]">
                <span>Total</span>
                <span className="tabular-nums">
                  {totals.totalAmount == null
                    ? "—"
                    : `$${Number(totals.totalAmount).toFixed(2)}`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={openCheckout}
              disabled={quoting || !quote}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-hover disabled:opacity-60"
            >
              Proceed to Checkout
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </>
  );

  const checkoutFlow = (
    <CheckoutFlowModal
      open={flowOpen}
      step={flowStep}
      onClose={() => {
        if (flowStep === 3) resetFlow();
        else setFlowOpen(false);
      }}
      onBackToDetails={() => setFlowStep(1)}
      onSubmitDetails={handleCheckoutSubmit}
      onConfirmOtp={handleConfirmOtp}
      onResendOtp={async () => {
        if (!pendingGuest) return;
        await handleCheckoutSubmit(pendingGuest);
      }}
      onOrderAgain={handleOrderAgain}
      submitting={sendingOtp}
      placing={placing}
      slots={slots}
      cartItems={cartItems}
      totals={totals}
      quoting={quoting}
      brandName={brandName}
      address={address}
      email={pendingGuest?.email}
      guest={pendingGuest}
      order={placedOrder}
    />
  );

  if (isMenuMode) {
    return (
      <>
        <aside
          id="menu-order-bag"
          className="sticky top-24 hidden h-[calc(100vh-7rem)] w-[400px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)]/40 bg-white shadow-sm lg:flex"
          aria-label="Your order bag"
        >
          {renderBagBody({ showClose: false })}
        </aside>

        {/* `contents` keeps this out of the menu flex row so products stay full-width on mobile */}
        <div className="contents lg:hidden">
          <div
            className={cn(
              "fixed inset-0 z-[60] bg-[var(--customer-ink)]/50 backdrop-blur-sm transition-opacity duration-300",
              open ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            onClick={closeAll}
            aria-hidden={!open}
          />
          <aside
            className={cn(
              "fixed top-0 right-0 z-[60] flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out",
              open ? "translate-x-0" : "translate-x-full"
            )}
            aria-hidden={!open}
            aria-label="Your order bag"
          >
            {renderBagBody({ showClose: true })}
          </aside>
        </div>

        {checkoutFlow}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-[var(--customer-ink)]/50 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeAll}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          "fixed top-0 right-0 z-[60] flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
        aria-label="Your order bag"
      >
        {renderBagBody({ showClose: true })}
      </aside>

      {checkoutFlow}
    </>
  );
}

const FLOW_STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Verify" },
  { id: 3, label: "Confirmed" },
];

function CheckoutTimeline({ step }) {
  return (
    <ol className="flex w-full items-start justify-center px-4 pt-2 sm:px-8">
      {FLOW_STEPS.map((item, index) => {
        const done = step > item.id;
        const active = step === item.id;
        const isLast = index === FLOW_STEPS.length - 1;
        return (
          <li
            key={item.id}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {!isLast ? (
              <div
                className={cn(
                  "absolute left-[calc(50%+1rem)] right-[calc(-50%+1rem)] top-4 h-0.5 rounded-full transition-colors",
                  step > item.id
                    ? "bg-[var(--customer-ink)]"
                    : "bg-[var(--customer-surface-container)]"
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                done && "bg-[var(--customer-ink)] text-white",
                active && "bg-primary text-white shadow-md",
                !done &&
                  !active &&
                  "bg-[var(--customer-surface-container)] text-[var(--customer-muted)]"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : item.id}
            </span>
            <span
              className={cn(
                "mt-1.5 w-full px-1 text-[10px] font-semibold uppercase tracking-wide",
                active
                  ? "text-primary"
                  : done
                    ? "text-[var(--customer-ink)]"
                    : "text-[var(--customer-muted)]"
              )}
            >
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CheckoutFlowModal({
  open,
  step,
  onClose,
  onBackToDetails,
  onSubmitDetails,
  onConfirmOtp,
  onResendOtp,
  onOrderAgain,
  submitting,
  placing,
  slots,
  cartItems,
  totals,
  quoting,
  brandName,
  address,
  email,
  guest,
  order,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      pickupTime: "",
      message: "",
    },
  });

  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputsRef = useRef([]);
  const [seconds, setSeconds] = useState(42);

  useEffect(() => {
    if (!open) {
      reset({
        fullName: "",
        phone: "",
        email: "",
        pickupTime: "",
        message: "",
      });
      setDigits(["", "", "", ""]);
      setSeconds(42);
      return;
    }
    if (step === 1 && guest) {
      reset({
        fullName: guest.fullName || "",
        phone: guest.phone || "",
        email: guest.email || "",
        pickupTime: guest.pickupTime || "",
        message: guest.message || "",
      });
    }
  }, [open, step, guest, reset]);

  useEffect(() => {
    if (!open || step !== 2) return undefined;
    setDigits(["", "", "", ""]);
    setSeconds(42);
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [open, step]);

  if (!open) return null;

  const handleDigitChange = (value, index) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < 3) inputsRef.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (e, index) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const pickup = order?.pickup || {};

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[var(--customer-surface-low)] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-[var(--customer-ink)]">
                {step === 3 ? "Order Confirmed" : "Complete Your Pickup"}
              </h2>
              <span className="text-[11px] text-[var(--customer-muted)]">
                {step === 1 && `Pay at ${brandName} · Same-day pickup`}
                {step === 2 && "Check your inbox for the verification code"}
                {step === 3 && `Ticket #${order?.orderNumber || "—"}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={step === 3 ? onOrderAgain : onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--customer-surface-container)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <CheckoutTimeline step={step} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step-details"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
              >
            <form
              onSubmit={handleSubmit(onSubmitDetails)}
              className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-12"
            >
              <div className="space-y-3 lg:col-span-7">
                {address ? (
                  <div className="space-y-1 rounded-xl border border-primary/50 bg-orange-50 p-4">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                      <Store className="h-4 w-4" />
                      Pickup location
                    </div>
                    <p className="text-xs text-[var(--customer-muted)]">{address}</p>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase text-[var(--customer-muted)]">
                    Contact Information
                  </span>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold" htmlFor="co-name">
                        Full Name *
                      </label>
                      <input
                        id="co-name"
                        className="w-full rounded-lg bg-[var(--customer-surface-low)] px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:shadow-[0_0_0_2px_var(--primary)]"
                        {...register("fullName", { required: "Name is required" })}
                      />
                      {errors.fullName ? (
                        <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold" htmlFor="co-phone">
                        Phone *
                      </label>
                      <input
                        id="co-phone"
                        type="tel"
                        className="w-full rounded-lg bg-[var(--customer-surface-low)] px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:shadow-[0_0_0_2px_var(--primary)]"
                        {...register("phone", {
                          required: "Phone is required",
                          minLength: { value: 10, message: "Enter a valid phone" },
                        })}
                      />
                      {errors.phone ? (
                        <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold" htmlFor="co-email">
                      Email (for OTP &amp; receipt) *
                    </label>
                    <input
                      id="co-email"
                      type="email"
                      className="w-full rounded-lg bg-[var(--customer-surface-low)] px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:shadow-[0_0_0_2px_var(--primary)]"
                      {...register("email", {
                        required: "Email is required for verification",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Enter a valid email",
                        },
                      })}
                    />
                    {errors.email ? (
                      <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                    ) : null}
                    <p className="mt-1.5 text-[11px] text-[var(--customer-muted)]">
                      If your email is correct, we&apos;ll send a one-time code to verify it.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase text-[var(--customer-muted)]">
                    Pickup Time Today
                  </span>
                  {slots.length === 0 ? (
                    <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                      Online pickup is closed for today. Please try again during restaurant hours.
                    </p>
                  ) : (
                    <select
                      className="w-full rounded-lg bg-[var(--customer-surface-low)] px-3.5 py-2.5 text-sm focus:outline-none focus:shadow-[0_0_0_2px_var(--primary)]"
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
                  {errors.pickupTime ? (
                    <p className="text-xs text-red-600">{errors.pickupTime.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold" htmlFor="co-note">
                    Special instructions (optional)
                  </label>
                  <textarea
                    id="co-note"
                    rows={2}
                    className="w-full rounded-lg bg-[var(--customer-surface-low)] px-3.5 py-2.5 text-sm focus:outline-none focus:shadow-[0_0_0_2px_var(--primary)]"
                    {...register("message")}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between space-y-4 rounded-2xl bg-[var(--customer-surface-low)] p-4 lg:col-span-5">
                <div>
                  <div className="flex items-center justify-between pb-3">
                    <h3 className="text-sm font-bold text-[var(--customer-ink)]">
                      Order Summary ({cartItems.length})
                    </h3>
                    <span className="text-[11px] font-semibold text-primary">Today · Pickup</span>
                  </div>
                  <div className="max-h-48 space-y-2.5 overflow-y-auto py-2 text-sm">
                    {cartItems.map((item) => (
                      <div key={item.cartKey} className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold">{item.quantity}x</span> {item.name}
                          <div className="line-clamp-2 pl-4 text-xs leading-relaxed text-[var(--customer-muted)]">
                            {lineNote(item)}
                          </div>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5 border-t border-[var(--border)]/30 pt-3 text-sm">
                    <div className="flex justify-between text-[var(--customer-muted)]">
                      <span>Subtotal</span>
                      <span className="tabular-nums">
                        ${Number(totals.subTotal || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[var(--customer-muted)]">
                      <span>Tax</span>
                      <span className="tabular-nums">
                        {quoting || totals.taxTotal == null
                          ? "—"
                          : `$${Number(totals.taxTotal).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 text-lg font-bold text-[var(--customer-ink)]">
                      <span>Total Due</span>
                      <span className="tabular-nums text-primary">
                        {totals.totalAmount == null
                          ? "—"
                          : `$${Number(totals.totalAmount).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || slots.length === 0 || quoting || !totals.totalAmount}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg hover:bg-primary-hover disabled:opacity-60"
                  >
                    <Mail className="h-5 w-5" />
                    {submitting ? "Sending code…" : "Send OTP & Continue"}
                  </button>
                  <p className="text-center text-[11px] text-[var(--customer-muted)]">
                    Next: verify your email, then we send the order to the kitchen.
                  </p>
                </div>
              </div>
            </form>
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div
                key="step-otp"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
                className="mx-auto flex max-w-md flex-col items-center px-6 py-8 text-center"
              >
              <div className="mb-4 rounded-2xl border border-primary/20 bg-orange-50 px-4 py-3 text-sm text-[var(--customer-ink)]">
                <p className="font-semibold text-primary">OTP sent</p>
                <p className="mt-0.5 text-[var(--customer-muted)]">
                  If <span className="font-semibold text-[var(--customer-ink)]">{email}</span> is
                  correct, you&apos;ll receive a 4-digit code shortly.
                </p>
              </div>

              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-primary">
                <Mail className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold text-[var(--customer-ink)]">Verify Your Email</h3>
              <p className="mt-1 mb-5 text-sm text-[var(--customer-muted)]">
                Enter the code to confirm your order
              </p>

              <div className="mb-4 flex items-center justify-center gap-3">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    value={d}
                    onChange={(e) => handleDigitChange(e.target.value, i)}
                    onKeyDown={(e) => handleDigitKeyDown(e, i)}
                    inputMode="numeric"
                    maxLength={1}
                    className="h-14 w-12 rounded-xl bg-[var(--customer-surface-low)] text-center text-2xl font-bold focus:bg-white focus:outline-none focus:shadow-[0_0_0_2px_var(--primary)]"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <div className="mb-4 flex items-center gap-1 text-sm text-[var(--customer-muted)]">
                {seconds > 0 ? (
                  <>
                    <span>Resend code in</span>
                    <span className="font-bold text-primary">
                      0:{String(seconds).padStart(2, "0")}
                    </span>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onResendOtp}
                    className="font-semibold text-primary hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={placing || digits.join("").length < 4}
                onClick={() => onConfirmOtp(digits.join(""))}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md hover:bg-primary-hover disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {placing ? "Placing order…" : "Confirm & Send to Kitchen"}
              </button>
              <button
                type="button"
                onClick={onBackToDetails}
                className="text-sm text-[var(--customer-muted)] hover:text-[var(--customer-ink)]"
              >
                Edit email or contact info
              </button>
              </motion.div>
            ) : null}

            {step === 3 && order ? (
              <motion.div
                key="step-confirm"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="flex flex-col items-center px-6 py-8 text-center"
              >
              <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary/20"
                  initial={{ scale: 0.6, opacity: 0.8 }}
                  animate={{ scale: 1.35, opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
                <motion.div
                  className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-lg"
                  initial={{ scale: 0.35, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16 }}
                >
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 320, damping: 14 }}
                  >
                    <Check className="h-10 w-10" strokeWidth={3} />
                  </motion.span>
                </motion.div>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Ticket #{order.orderNumber}
              </span>
              <h3 className="mt-1 text-2xl font-bold text-[var(--customer-ink)] sm:text-3xl">
                Order Confirmed!
              </h3>
              <p className="mt-2 max-w-md text-sm text-[var(--customer-muted)]">
                Thank you! The kitchen at {brandName} has received your order. Pay when you pick up.
              </p>

              <div className="mt-6 w-full max-w-lg space-y-4 rounded-xl bg-[var(--customer-surface-low)] p-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--customer-ink)]">Pickup</span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
                    <Clock className="h-3.5 w-3.5" />
                    {pickup.label || pickup.time || "Same day"}
                  </span>
                </div>
                {address ? (
                  <div className="flex items-start gap-3 text-sm">
                    <Store className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <div className="font-bold text-[var(--customer-ink)]">{brandName}</div>
                      <div className="text-[var(--customer-muted)]">{address}</div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex w-full max-w-lg flex-col gap-3 sm:flex-row">
                <a
                  href={`/order/${encodeURIComponent(order.orderNumber)}?phone=${encodeURIComponent(
                    String(order.contactNumber || "").replace(/\D/g, "")
                  )}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--customer-surface-container)] px-4 py-3 text-sm font-semibold text-[var(--customer-ink)] transition-colors hover:bg-[var(--customer-surface-low)]"
                >
                  Track Order
                </a>
                <button
                  type="button"
                  onClick={onOrderAgain}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                >
                  Order Again
                </button>
              </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
