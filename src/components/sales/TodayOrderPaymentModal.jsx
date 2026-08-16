"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  CreditCard,
  Banknote,
  Gift,
  Percent,
  Tag,
  X,
  User,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { buildStaffDiscountState } from "@/lib/orders/staffDiscount";
import {
  computeOrderServiceCharge,
  formatServiceTaxRate,
  isActiveServiceTax,
  SERVICE_CHARGE_NO_TIP_MESSAGE,
} from "@/lib/orders/serviceCharge";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const CARD_TYPES = [
  { name: "Visa", image: "/card/visa.png" },
  { name: "Mastercard", image: "/card/mastercard.webp" },
  { name: "RuPay", image: "/card/rupay.webp" },
  { name: "Amex", image: "/card/american-express.webp" },
  { name: "Discover", image: "/card/discover.png" },
];

function formatDiscountOption(coupon) {
  const amount =
    coupon.discountType === "percent"
      ? `${coupon.value}%`
      : `$${Number(coupon.value).toFixed(2)}`;
  return `${coupon.code} — ${amount}`;
}

export default function TodayOrderPaymentModal({
  order,
  open,
  onClose,
  onPaid,
  sessionId,
  guestName: guestNameProp,
  onGuestNameChange,
  redeemNote = "POS Payment",
  applyServiceCharge = false,
  serviceTax = null,
}) {
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);
  const [internalGuestName, setInternalGuestName] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState(null);
  const [giftCardDetails, setGiftCardDetails] = useState(null);
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [isVerifyingGiftCard, setIsVerifyingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState("");
  const [giftCardUseAmount, setGiftCardUseAmount] = useState(0);
  const [selectedCardType, setSelectedCardType] = useState("");
  const [cardAmountTendered, setCardAmountTendered] = useState("");
  const [amountTendered, setAmountTendered] = useState("");
  const [lockedCardAmount, setLockedCardAmount] = useState(0);
  const [lockedCashAmount, setLockedCashAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffDiscountEmployee, setStaffDiscountEmployee] = useState(null);
  const [staffDiscountLoading, setStaffDiscountLoading] = useState(false);

  const isStaffOrder = order?.source === "STAFF";

  const isGuestControlled = guestNameProp !== undefined;
  const guestName = isGuestControlled ? guestNameProp : internalGuestName;
  const setGuestName = (value) => {
    if (isGuestControlled) {
      onGuestNameChange?.(value);
    } else {
      setInternalGuestName(value);
    }
  };

  const resolvedSessionId = sessionId ?? order?.tableSession;

  const subtotal = Number(order?.subTotal || 0);
  const totalTax = Number(order?.taxTotal || 0);
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "%"
      ? (subtotal * appliedDiscount.value) / 100
      : Math.min(Number(appliedDiscount.value) || 0, subtotal)
    : 0;
  const canOfferServiceCharge = isActiveServiceTax(serviceTax);
  const computedServiceCharge = canOfferServiceCharge
    ? computeOrderServiceCharge({
        serviceTax,
        subtotal,
        discountAmount,
      })
    : 0;
  const serviceChargeTotal = includeServiceCharge ? computedServiceCharge : 0;
  const serviceChargeName = includeServiceCharge
    ? serviceTax?.name || order?.serviceChargeName || "Server Charge"
    : null;
  const total = Math.max(
    0,
    subtotal - discountAmount + totalTax + serviceChargeTotal,
  );

  // Amounts already committed when switching via "Rest with …"
  const lockedCard = round2(Math.max(0, lockedCardAmount));
  const lockedCash = round2(Math.max(0, lockedCashAmount));
  const afterLocks = round2(Math.max(0, total - lockedCard - lockedCash));

  const giftCardUsedPreview =
    giftCardBalance !== null
      ? Math.min(
          Math.max(0, Number(giftCardUseAmount) || 0),
          giftCardBalance,
          afterLocks,
        )
      : 0;
  const remainingAfterGift =
    giftCardBalance !== null
      ? round2(Math.max(0, afterLocks - giftCardUsedPreview))
      : afterLocks;

  const giftUsed =
    giftCardBalance !== null ? giftCardUsedPreview : 0;

  const effectiveCardDue = round2(
    Math.max(0, total - giftUsed - lockedCash),
  );
  const parsedCardAmount =
    cardAmountTendered === "" ? NaN : parseFloat(cardAmountTendered);
  const cardPayAmount = Number.isFinite(parsedCardAmount)
    ? Math.max(0, parsedCardAmount)
    : effectiveCardDue;

  const effectiveCashDue = round2(
    Math.max(0, total - giftUsed - lockedCard),
  );
  const parsedCashAmount =
    amountTendered === "" ? NaN : parseFloat(amountTendered);
  const cashPayAmount = Number.isFinite(parsedCashAmount)
    ? Math.max(0, parsedCashAmount)
    : effectiveCashDue;

  const cashSplitAmount =
    paymentMethod === "Card" &&
    effectiveCardDue > 0 &&
    cardPayAmount < effectiveCardDue
      ? round2(effectiveCardDue - Math.min(cardPayAmount, effectiveCardDue))
      : 0;

  const cardSplitFromCash =
    paymentMethod === "Cash" &&
    effectiveCashDue > 0 &&
    Number.isFinite(parsedCashAmount) &&
    cashPayAmount < effectiveCashDue
      ? round2(effectiveCashDue - Math.min(cashPayAmount, effectiveCashDue))
      : 0;

  const cardOverpay =
    paymentMethod === "Card" &&
    Number.isFinite(parsedCardAmount) &&
    cardPayAmount > effectiveCardDue
      ? round2(cardPayAmount - effectiveCardDue)
      : 0;
  const cashOverpay =
    paymentMethod === "Cash" &&
    Number.isFinite(parsedCashAmount) &&
    cashPayAmount > effectiveCashDue &&
    cardSplitFromCash === 0
      ? round2(cashPayAmount - effectiveCashDue)
      : 0;
  const autoTip = round2(cardOverpay || cashOverpay || 0);
  const tipMethod =
    cashOverpay > 0 ? "Cash" : cardOverpay > 0 ? "Card" : null;

  const selectPaymentMethod = (method) => {
    setLockedCardAmount(0);
    setLockedCashAmount(0);
    setPaymentMethod(method);
  };

  const switchForRemainder = (method, { lockCard, lockCash } = {}) => {
    if (lockCard != null) {
      setLockedCardAmount(round2(Math.max(0, lockCard)));
    }
    if (lockCash != null) {
      setLockedCashAmount(round2(Math.max(0, lockCash)));
    }
    setPaymentMethod(method);
  };

  useEffect(() => {
    if (!open || isStaffOrder) return;
    const loadDiscounts = async () => {
      try {
        const res = await fetch("/api/orders/discount");
        const json = await res.json();
        if (json.success) setAvailableDiscounts(json.data || []);
      } catch {
        setAvailableDiscounts([]);
      }
    };
    loadDiscounts();
  }, [open, isStaffOrder]);

  useEffect(() => {
    if (!open || !order) return;

    setPaymentMethod("Card");
    setDiscountCode("");
    setGiftCardCode("");
    setGiftCardBalance(null);
    setGiftCardDetails(null);
    setIsGiftCardModalOpen(false);
    setGiftCardError("");
    setGiftCardUseAmount(0);
    setSelectedCardType("");
    setCardAmountTendered("");
    setAmountTendered("");
    setLockedCardAmount(0);
    setLockedCashAmount(0);
    setIsSubmitting(false);
    setStaffDiscountEmployee(null);
    setStaffDiscountLoading(false);
    setIncludeServiceCharge(Boolean(applyServiceCharge));

    if (!isGuestControlled) {
      setInternalGuestName(order.partyName || order.guestName || "");
    }

    if (order.source === "STAFF") {
      const staffId = String(order.staffFor?._id || order.staffFor || "");
      setAppliedDiscount(
        Number(order.discountTotal || 0) > 0
          ? {
              code: "STAFF",
              value: Number(order.discountTotal),
              type: "$",
            }
          : null,
      );
      setStaffDiscountLoading(true);
      const applyStaffDiscount = async () => {
        try {
          const res = await fetch("/api/sales/employees");
          const json = await res.json();
          const employees = json.success ? json.data || [] : [];
          const emp = employees.find(
            (e) => String(e.id || e._id) === staffId,
          );
          setStaffDiscountEmployee(emp || null);
          setAppliedDiscount(
            buildStaffDiscountState(emp?.staffDiscount, emp?.name),
          );
        } catch {
          setStaffDiscountEmployee(null);
        } finally {
          setStaffDiscountLoading(false);
        }
      };
      applyStaffDiscount();
      return;
    }

    setAppliedDiscount(
      order.discountCode && Number(order.discountTotal || 0) > 0
        ? {
            code: order.discountCode,
            value: Number(order.discountTotal),
            type: "$",
          }
        : null,
    );
  }, [open, order?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !order) return null;

  const updateGiftCardUseAmount = (raw) => {
    if (giftCardBalance === null) return;
    const maxUse = Math.min(giftCardBalance, afterLocks);
    if (raw === "" || raw === null || raw === undefined) {
      setGiftCardUseAmount(0);
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    setGiftCardUseAmount(round2(Math.min(Math.max(0, n), maxUse)));
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error("Enter a discount code.");
      return;
    }
    try {
      const res = await fetch("/api/orders/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode }),
      });
      const json = await res.json();
      if (json.success) {
        setAppliedDiscount({
          code: json.data.code,
          value: json.data.value,
          type: json.data.discountType === "percent" ? "%" : "$",
        });
        toast.success("Discount applied!");
      } else {
        toast.error(json.message || "Invalid discount code");
        setAppliedDiscount(null);
      }
    } catch {
      toast.error("Failed to apply discount");
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
  };

  const verifyGiftCard = async () => {
    if (!giftCardCode.trim()) return;
    const normalizedCode = giftCardCode.trim().toUpperCase();
    setGiftCardCode(normalizedCode);
    setIsVerifyingGiftCard(true);
    setGiftCardError("");
    setGiftCardBalance(null);
    setGiftCardDetails(null);
    try {
      const res = await fetch(
        `/api/menu/giftcards?code=${encodeURIComponent(normalizedCode)}`,
      );
      const json = await res.json();
      if (json.success) {
        const actualBalance = Number(json.data?.balance ?? json.data?.value ?? 0);
        if (actualBalance <= 0) {
          const exhausted = "Gift card balance is exhausted";
          setGiftCardError(exhausted);
          toast.error(exhausted);
          return;
        }
        setGiftCardDetails(json.data);
        setIsGiftCardModalOpen(true);
      } else {
        const message =
          json.message || "Only issued active gift cards can be used";
        setGiftCardError(message);
        toast.error(message);
      }
    } catch {
      setGiftCardError("Failed to verify Gift Card");
    } finally {
      setIsVerifyingGiftCard(false);
    }
  };

  const handleApplyGiftCard = () => {
    const actualBalance = Number(
      giftCardDetails.balance ?? giftCardDetails.value ?? 0,
    );
    const useAmt = round2(Math.min(actualBalance, total));
    setGiftCardBalance(actualBalance);
    setGiftCardUseAmount(useAmt);
    if (useAmt >= total) {
      setAmountTendered("");
      setCardAmountTendered("");
    }
    setIsGiftCardModalOpen(false);
  };

  const handleRemoveGiftCard = () => {
    setGiftCardBalance(null);
    setGiftCardDetails(null);
    setGiftCardCode("");
    setGiftCardError("");
    setGiftCardUseAmount(0);
    setIsGiftCardModalOpen(false);
  };

  const handlePayment = async () => {
    try {
      if (includeServiceCharge && autoTip > 0) {
        toast.error(SERVICE_CHARGE_NO_TIP_MESSAGE);
        return;
      }

      setIsSubmitting(true);

      const giftCardUsedAmount =
        giftCardBalance !== null ? round2(giftCardUsedPreview) : 0;
      const partyName = guestName.trim() || null;
      const tip = includeServiceCharge ? 0 : autoTip;

      let resolvedCashAmount = lockedCash;
      let resolvedCardAmount = lockedCard;
      let resolvedPaymentMethod = paymentMethod;
      const parts = [];

      if (giftCardUsedAmount > 0) parts.push("Gift Card");

      if (paymentMethod === "Card") {
        const cardPortion = round2(
          Math.min(cardPayAmount, effectiveCardDue),
        );
        resolvedCardAmount = round2(lockedCard + cardPortion);
        if (resolvedCardAmount > 0) {
          parts.push(
            selectedCardType ? `Card - ${selectedCardType}` : "Card",
          );
        }
        if (lockedCash > 0) parts.push("Cash");
        if (tip > 0 && resolvedCardAmount > 0) {
          resolvedCardAmount = round2(resolvedCardAmount + tip);
        } else if (tip > 0 && lockedCash > 0) {
          resolvedCashAmount = round2(lockedCash + tip);
        }
      } else if (paymentMethod === "Cash") {
        const cashPortion = Number.isFinite(parsedCashAmount)
          ? round2(Math.min(cashPayAmount, effectiveCashDue))
          : round2(effectiveCashDue);
        resolvedCashAmount = round2(lockedCash + cashPortion);
        if (resolvedCashAmount > 0 || giftCardUsedAmount <= 0) {
          parts.push("Cash");
        }
        if (lockedCard > 0) {
          parts.push(
            selectedCardType ? `Card - ${selectedCardType}` : "Card",
          );
        }
        if (tip > 0) {
          resolvedCashAmount = round2(resolvedCashAmount + tip);
        }
      } else if (paymentMethod === "GiftCard") {
        if (lockedCard > 0) {
          parts.push(
            selectedCardType ? `Card - ${selectedCardType}` : "Card",
          );
        }
        if (lockedCash > 0) parts.push("Cash");
        if (remainingAfterGift > 0) {
          // Should not submit with remainder; keep safe fallback
          resolvedCashAmount = round2(lockedCash + remainingAfterGift + tip);
          if (!parts.includes("Cash")) parts.push("Cash");
        } else if (tip > 0) {
          if (lockedCash > 0) {
            resolvedCashAmount = round2(lockedCash + tip);
          } else if (lockedCard > 0) {
            resolvedCardAmount = round2(lockedCard + tip);
          } else {
            resolvedCashAmount = tip;
            parts.push("Cash");
          }
        }
      }

      if (parts.length === 0) {
        resolvedPaymentMethod =
          giftCardUsedAmount > 0 ? "Gift Card" : paymentMethod;
      } else if (parts.length === 1) {
        resolvedPaymentMethod = parts[0];
      } else {
        resolvedPaymentMethod = parts.join(" + ");
      }

      const paymentPayload = {
        orderId: order._id,
        amount: total,
        method: resolvedPaymentMethod,
        sessionId: resolvedSessionId || undefined,
        tipAmount: tip,
        tipMethod: tip > 0 ? tipMethod : null,
        discountTotal: discountAmount,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        guestName: partyName,
        partyName,
        guestCount: order.guestCount ?? null,
        cashAmount: resolvedCashAmount,
        cardAmount: resolvedCardAmount,
        applyServiceCharge: Boolean(includeServiceCharge),
        serviceChargeTotal: includeServiceCharge ? serviceChargeTotal : 0,
        serviceChargeName: includeServiceCharge ? serviceChargeName : null,
      };

      if (resolvedCardAmount > 0) {
        paymentPayload.cardType = selectedCardType;
      }

      if (giftCardBalance !== null && giftCardUsedAmount > 0) {
        paymentPayload.giftCardCode = giftCardCode.trim().toUpperCase();
        // Explicit amount to debit — do not infer solely from remainder (locks break that math)
        paymentPayload.giftCardUsedAmount = giftCardUsedAmount;
        paymentPayload.splitAmount = round2(
          Math.max(0, total - giftCardUsedAmount),
        );
      }

      const res = await fetch("/api/sales/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Payment collected successfully!");

        const paidOrder = json.data || {};
        const updatedOrder = {
          ...order,
          ...paidOrder,
          paymentStatus: "PAID",
          paymentMethod: paidOrder.paymentMethod || resolvedPaymentMethod,
          tipAmount: paidOrder.tipAmount ?? tip,
          tipMethod: paidOrder.tipMethod ?? (tip > 0 ? tipMethod : null),
          discountTotal: paidOrder.discountTotal ?? discountAmount,
          discountCode:
            paidOrder.discountCode ??
            (appliedDiscount ? appliedDiscount.code : null),
          totalAmount: paidOrder.totalAmount ?? total,
          subTotal: paidOrder.subTotal ?? subtotal,
          taxTotal: paidOrder.taxTotal ?? totalTax,
          serviceChargeTotal:
            paidOrder.serviceChargeTotal ?? serviceChargeTotal,
          serviceChargeName:
            paidOrder.serviceChargeName ?? serviceChargeName ?? null,
          giftcardCode:
            paidOrder.giftcardCode ??
            (giftCardUsedAmount > 0
              ? giftCardCode.trim().toUpperCase()
              : null),
          giftcardUsedAmount:
            paidOrder.giftcardUsedAmount ?? giftCardUsedAmount,
          cashAmount:
            paidOrder.cashAmount != null
              ? paidOrder.cashAmount
              : resolvedCashAmount,
          cardAmount:
            paidOrder.cardAmount != null
              ? paidOrder.cardAmount
              : resolvedCardAmount,
          guestName: partyName,
          partyName,
          guestCount: order.guestCount ?? null,
        };

        onPaid?.(updatedOrder);
        onClose();
      } else {
        toast.error(json.message || "Payment failed");
      }
    } catch {
      toast.error("Failed to process payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCardContribution =
    paymentMethod === "Card"
      ? round2(lockedCard + Math.min(cardPayAmount, effectiveCardDue))
      : lockedCard;
  const currentCashContribution =
    paymentMethod === "Cash"
      ? round2(
          lockedCash +
            (Number.isFinite(parsedCashAmount)
              ? Math.min(cashPayAmount, effectiveCashDue)
              : 0),
        )
      : lockedCash;

  const completeDisabled =
    isSubmitting ||
    staffDiscountLoading ||
    (includeServiceCharge && autoTip > 0) ||
    (paymentMethod === "GiftCard" && giftCardBalance === null) ||
    (paymentMethod === "GiftCard" && remainingAfterGift > 0) ||
    (paymentMethod === "Cash" && cardSplitFromCash > 0) ||
    (paymentMethod === "Card" && cashSplitAmount > 0) ||
    (paymentMethod === "Card" &&
      currentCardContribution > 0 &&
      !selectedCardType);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">
              PAYMENT
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
              aria-label="Close payment"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-full">
              {/* LEFT — Order Summary + Discount */}
              <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-zinc-100 bg-zinc-50/60 space-y-5">
                <div>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    Order Summary
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {order.orderNumber && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-800">
                        Order #{order.orderNumber}
                      </span>
                    )}
                    {order.tableNo && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-800">
                        {order.tableNo}
                      </span>
                    )}
                    {order.guestCount != null && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-800">
                        {order.guestCount} guest
                        {order.guestCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Party / Customer Name
                      <span className="text-zinc-400 font-semibold normal-case">
                        (optional)
                      </span>
                    </label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-11 bg-white border-zinc-200 rounded-xl text-sm font-semibold focus-visible:ring-orange-500"
                    />
                  </div>

                  {canOfferServiceCharge && computedServiceCharge > 0 && (
                    <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 cursor-pointer shadow-sm my-2">
                      <Checkbox
                        checked={includeServiceCharge}
                        onCheckedChange={(checked) =>
                          setIncludeServiceCharge(checked === true)
                        }
                        className="mt-0.5 h-5 w-5 border-zinc-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900">
                          Add {serviceTax?.name || "Server Charge"}
                        </p>
                        <p className="text-xs font-semibold text-zinc-500 mt-0.5">
                          {formatServiceTaxRate(serviceTax)} · $
                          {computedServiceCharge.toFixed(2)}
                        </p>
                      </div>
                    </label>
                  )}

                  <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2.5 shadow-sm">
                    <div className="flex justify-between text-sm font-semibold text-zinc-500">
                      <span>Subtotal</span>
                      <span className="text-zinc-900">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-zinc-500">
                      <span>Tax</span>
                      <span className="text-zinc-900">
                        ${totalTax.toFixed(2)}
                      </span>
                    </div>
                    {serviceChargeTotal > 0 && (
                      <div className="flex justify-between text-sm font-semibold text-zinc-500">
                        <span>
                          {serviceChargeName || "Server Charge"}
                        </span>
                        <span className="text-zinc-900">
                          ${serviceChargeTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm font-semibold text-green-600">
                        <span>
                          Discount
                          {appliedDiscount?.label
                            ? ` (${appliedDiscount.label})`
                            : appliedDiscount?.code
                              ? ` (${appliedDiscount.code})`
                              : ""}
                        </span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="h-px bg-zinc-200 my-1" />
                    <div className="flex justify-between items-end pt-1">
                      <span className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                        Total Due
                      </span>
                      <span className="text-3xl font-black text-zinc-900 leading-none">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    {isStaffOrder ? "Staff Discount" : "Apply Discount"}
                  </p>
                  {isStaffOrder ? (
                    appliedDiscount ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-green-900 truncate">
                              {appliedDiscount.label || appliedDiscount.code}
                            </p>
                            <p className="text-sm font-bold text-green-700">
                              {appliedDiscount.type === "%"
                                ? `${appliedDiscount.value}% off · -$${discountAmount.toFixed(2)}`
                                : `-$${discountAmount.toFixed(2)}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-zinc-700">
                          {staffDiscountEmployee
                            ? `No staff discount assigned to ${staffDiscountEmployee.name}`
                            : "Staff discount applies to the employee this order is for"}
                        </p>
                      </div>
                    )
                  ) : appliedDiscount ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-green-900 truncate">
                              {appliedDiscount.code}
                            </p>
                            <p className="text-sm font-bold text-green-700">
                              -${discountAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveDiscount}
                          className="h-10 px-4 rounded-lg bg-red-500 border-red-200 text-white hover:bg-red-600 font-bold text-sm shadow-none shrink-0"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Select
                        value={discountCode || undefined}
                        onValueChange={(value) => setDiscountCode(value)}
                      >
                        <SelectTrigger className="w-full h-12 bg-white border-zinc-200 rounded-xl font-semibold text-sm focus:ring-orange-500">
                          <SelectValue placeholder="Select a discount..." />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                          {availableDiscounts.length === 0 ? (
                            <SelectItem value="__none" disabled>
                              No active discounts
                            </SelectItem>
                          ) : (
                            availableDiscounts.map((coupon) => (
                              <SelectItem
                                key={coupon._id || coupon.code}
                                value={coupon.code}
                              >
                                {formatDiscountOption(coupon)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            type="text"
                            value={discountCode}
                            onChange={(e) =>
                              setDiscountCode(e.target.value.toUpperCase())
                            }
                            placeholder="Or enter discount code..."
                            className="w-full h-12 pl-9 pr-4 bg-white border border-zinc-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleApplyDiscount}
                          disabled={!discountCode.trim()}
                          className="h-12 px-5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {(giftCardBalance !== null ||
                  lockedCard > 0 ||
                  lockedCash > 0 ||
                  cashSplitAmount > 0 ||
                  cardSplitFromCash > 0) && (
                  <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2 shadow-sm">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Payment Breakdown
                    </p>
                    {giftCardBalance !== null && giftCardUsedPreview > 0 && (
                      <div className="flex justify-between text-sm font-semibold text-zinc-600">
                        <span>Gift Card</span>
                        <span className="text-zinc-900">
                          ${giftCardUsedPreview.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(currentCardContribution > 0 ||
                      (paymentMethod === "Card" && cashSplitAmount > 0)) && (
                      <div className="flex justify-between text-sm font-semibold text-zinc-600">
                        <span>Card</span>
                        <span className="text-zinc-900">
                          $
                          {(paymentMethod === "Card"
                            ? Math.min(cardPayAmount, effectiveCardDue) +
                              lockedCard
                            : currentCardContribution
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(currentCashContribution > 0 ||
                      cashSplitAmount > 0 ||
                      (paymentMethod === "Cash" &&
                        cardSplitFromCash === 0 &&
                        effectiveCashDue > 0)) && (
                      <div className="flex justify-between text-sm font-semibold text-zinc-600">
                        <span>Cash</span>
                        <span className="text-zinc-900">
                          $
                          {(cashSplitAmount > 0
                            ? cashSplitAmount
                            : paymentMethod === "Cash"
                              ? Math.min(cashPayAmount, effectiveCashDue) +
                                lockedCash
                              : currentCashContribution
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {((paymentMethod === "GiftCard" &&
                      remainingAfterGift > 0) ||
                      cashSplitAmount > 0 ||
                      cardSplitFromCash > 0) && (
                      <div className="flex justify-between text-sm font-semibold text-zinc-600">
                        <span>Remaining</span>
                        <span className="text-zinc-900">
                          $
                          {(paymentMethod === "GiftCard"
                            ? remainingAfterGift
                            : paymentMethod === "Card"
                              ? cashSplitAmount
                              : cardSplitFromCash
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="h-px bg-zinc-200" />
                    <div className="flex justify-between text-sm font-black text-zinc-900">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT — Payment Method */}
              <div className="p-5 md:p-6 space-y-5">
                <div>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    Payment Method
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { key: "Card", label: "Card", Icon: CreditCard },
                      { key: "Cash", label: "Cash", Icon: Banknote },
                      { key: "GiftCard", label: "Gift Card", Icon: Gift },
                    ].map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectPaymentMethod(key)}
                        className={`flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border-2 transition-all ${
                          paymentMethod === key
                            ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                        }`}
                      >
                        <Icon className="w-6 h-6" strokeWidth={2} />
                        <span className="text-xs font-black uppercase tracking-wide">
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CARD */}
                {paymentMethod === "Card" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                      Card Payment
                    </h3>

                    {/* <GiftCardField
                      giftCardCode={giftCardCode}
                      setGiftCardCode={setGiftCardCode}
                      giftCardBalance={giftCardBalance}
                      isVerifyingGiftCard={isVerifyingGiftCard}
                      giftCardError={giftCardError}
                      onVerify={verifyGiftCard}
                      onRemove={handleRemoveGiftCard}
                      label="Apply Gift Card (Optional)"
                    /> */}

                    {giftCardBalance !== null && (
                      <GiftUseEditor
                        giftCardBalance={giftCardBalance}
                        giftCardUseAmount={giftCardUseAmount}
                        total={afterLocks}
                        remainingAfterGift={remainingAfterGift}
                        remainingLabel="Remaining Due (Card / Cash)"
                        onChangeUseAmount={updateGiftCardUseAmount}
                        hint={
                          remainingAfterGift > 0
                            ? "Pay the rest with card below, or enter a partial card amount to collect the remainder in cash."
                            : undefined
                        }
                      />
                    )}


                    {(giftCardBalance === null || remainingAfterGift > 0) && (
                      <>
                        <CardTypePicker
                          selectedCardType={selectedCardType}
                          setSelectedCardType={setSelectedCardType}
                        />

                        {selectedCardType && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                Amount on Card
                              </label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                  <input
                                    type="number"
                                    min="0"
                                    value={cardAmountTendered}
                                    onChange={(e) =>
                                      setCardAmountTendered(e.target.value)
                                    }
                                    placeholder={effectiveCardDue.toFixed(2)}
                                    className="w-full h-14 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setCardAmountTendered(
                                      effectiveCardDue.toFixed(2),
                                    );
                                    setAmountTendered("");
                                  }}
                                  className="h-14 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none shrink-0"
                                >
                                  Exact
                                </Button>
                              </div>
                              <p className="text-xs font-semibold text-zinc-500">
                                Enter less than the card due to pay the rest with
                                another method.
                              </p>
                            </div>

                            {cardOverpay > 0 &&
                              (includeServiceCharge ? (
                                <p className="text-sm font-bold text-red-600">
                                  {SERVICE_CHARGE_NO_TIP_MESSAGE}
                                </p>
                              ) : (
                                <OverpayTip overpay={cardOverpay} method="Card" />
                              ))}

                            {cashSplitAmount > 0 && (
                              <PayRemainingActions
                                remaining={cashSplitAmount}
                                currentMethod="Card"
                                onSwitch={(method) => {
                                  const cardPortion = round2(
                                    Math.min(cardPayAmount, effectiveCardDue),
                                  );
                                  if (method === "Cash") {
                                    setAmountTendered(
                                      cashSplitAmount.toFixed(2),
                                    );
                                  }
                                  switchForRemainder(method, {
                                    lockCard: cardPortion,
                                  });
                                }}
                              />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* CASH */}
                {paymentMethod === "Cash" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                      Cash Payment
                    </h3>

                    {/* <GiftCardField
                      giftCardCode={giftCardCode}
                      setGiftCardCode={setGiftCardCode}
                      giftCardBalance={giftCardBalance}
                      isVerifyingGiftCard={isVerifyingGiftCard}
                      giftCardError={giftCardError}
                      onVerify={verifyGiftCard}
                      onRemove={handleRemoveGiftCard}
                      label="Apply Gift Card (Optional)"
                    /> */}

                    {giftCardBalance !== null && (
                      <GiftUseEditor
                        giftCardBalance={giftCardBalance}
                        giftCardUseAmount={giftCardUseAmount}
                        total={afterLocks}
                        remainingAfterGift={remainingAfterGift}
                        remainingLabel="Remaining Due"
                        onChangeUseAmount={updateGiftCardUseAmount}
                      />
                    )}

                    {(giftCardBalance === null || remainingAfterGift > 0) && (
                      <>
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            Amount Due
                          </span>
                          <span className="text-2xl font-black text-zinc-900">
                            ${effectiveCashDue.toFixed(2)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            Cash Amount
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                              <input
                                type="number"
                                min="0"
                                value={amountTendered}
                                onChange={(e) =>
                                  setAmountTendered(e.target.value)
                                }
                                placeholder={effectiveCashDue.toFixed(2)}
                                className="w-full h-14 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={() => {
                                setAmountTendered(effectiveCashDue.toFixed(2));
                              }}
                              className="h-14 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none shrink-0"
                            >
                              Exact
                            </Button>
                          </div>
                          <p className="text-xs font-semibold text-zinc-500">
                            Enter less than the due amount to pay the rest with
                            another method.
                          </p>
                        </div>

                        {cashOverpay > 0 &&
                          (includeServiceCharge ? (
                            <p className="text-sm font-bold text-red-600">
                              {SERVICE_CHARGE_NO_TIP_MESSAGE}
                            </p>
                          ) : (
                            <OverpayTip overpay={cashOverpay} method="Cash" />
                          ))}

                        {cardSplitFromCash > 0 && (
                          <PayRemainingActions
                            remaining={cardSplitFromCash}
                            currentMethod="Cash"
                            onSwitch={(method) => {
                              const cashPortion = round2(
                                Math.min(cashPayAmount, effectiveCashDue),
                              );
                              if (method === "Card") {
                                setCardAmountTendered(
                                  cardSplitFromCash.toFixed(2),
                                );
                                setSelectedCardType("");
                              }
                              switchForRemainder(method, {
                                lockCash: cashPortion,
                              });
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* GIFT CARD */}
                {paymentMethod === "GiftCard" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                      Gift Card Payment
                    </h3>

                    <GiftCardField
                      giftCardCode={giftCardCode}
                      setGiftCardCode={setGiftCardCode}
                      giftCardBalance={giftCardBalance}
                      isVerifyingGiftCard={isVerifyingGiftCard}
                      giftCardError={giftCardError}
                      onVerify={verifyGiftCard}
                      onRemove={handleRemoveGiftCard}
                      label="Gift Card Code"
                    />

                    {giftCardBalance !== null && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-green-900">
                            Available Balance
                          </span>
                          <span className="font-black text-green-700">
                            ${giftCardBalance.toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-green-800 uppercase tracking-wider">
                            Amount to Use
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                              <input
                                type="number"
                                min="0"
                                max={Math.min(giftCardBalance, afterLocks)}
                                step="0.01"
                                value={giftCardUseAmount}
                                onChange={(e) =>
                                  updateGiftCardUseAmount(e.target.value)
                                }
                                className="w-full h-11 pl-9 pr-4 bg-white border border-green-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={() =>
                                updateGiftCardUseAmount(
                                  Math.min(giftCardBalance, afterLocks).toFixed(
                                    2,
                                  ),
                                )
                              }
                              className="h-11 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none shrink-0"
                            >
                              Exact
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-green-900">
                            Amount Applied
                          </span>
                          <span className="font-black text-green-700">
                            ${giftCardUsedPreview.toFixed(2)}
                          </span>
                        </div>
                        {remainingAfterGift > 0 ? (
                          <>
                            <div className="h-px bg-green-200/80" />
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-bold text-zinc-700">
                                Order Total
                              </span>
                              <span className="font-black text-zinc-900">
                                ${total.toFixed(2)}
                              </span>
                            </div>
                            <PayRemainingActions
                              remaining={remainingAfterGift}
                              currentMethod="GiftCard"
                              onSwitch={(method) => {
                                if (method === "Card") {
                                  setCardAmountTendered(
                                    remainingAfterGift.toFixed(2),
                                  );
                                  setSelectedCardType("");
                                } else if (method === "Cash") {
                                  setAmountTendered(
                                    remainingAfterGift.toFixed(2),
                                  );
                                }
                                setPaymentMethod(method);
                              }}
                            />
                          </>
                        ) : (
                          <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
                            <span className="font-bold text-green-900">
                              Remaining Balance After
                            </span>
                            <span className="font-bold text-green-700">
                              $
                              {(
                                giftCardBalance - giftCardUsedPreview
                              ).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 border-t border-zinc-100 flex gap-3 shrink-0 bg-white">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-14 rounded-xl font-bold border-zinc-200 text-white shadow-none bg-red-500 hover:bg-red-600 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={completeDisabled}
              className="flex-[1.4] h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none text-base"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Complete Payment"
              )}
            </Button>
          </div>
        </div>
      </div>

      {isGiftCardModalOpen && giftCardDetails && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-zinc-900">
                Gift Card Details
              </h2>
              <button
                type="button"
                onClick={() => setIsGiftCardModalOpen(false)}
                className="w-8 h-8 rounded border border-zinc-700 bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                aria-label="Close gift card details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Code
                  </p>
                  <p className="font-mono text-zinc-900">
                    {giftCardDetails.code}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Balance
                  </p>
                  <p className="font-bold text-green-600">
                    $
                    {Number(
                      giftCardDetails.balance ?? giftCardDetails.value ?? 0,
                    ).toFixed(2)}
                  </p>
                </div>
                {giftCardDetails.name && (
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Card Name
                    </p>
                    <p className="font-semibold text-zinc-900">
                      {giftCardDetails.name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Original Value
                  </p>
                  <p className="font-semibold text-zinc-900">
                    ${Number(giftCardDetails.value || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Status
                  </p>
                  <p className="font-semibold text-zinc-900">
                    {giftCardDetails.status || "Active"}
                    {giftCardDetails.isIssued ? " · Issued" : ""}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-zinc-900">Issued To</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Name
                    </p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {giftCardDetails.recipientName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-zinc-900 break-all">
                      {giftCardDetails.recipientEmail || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Phone
                    </p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {giftCardDetails.recipientPhone || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Issue Date
                    </p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {giftCardDetails.issueDate
                        ? new Date(
                            giftCardDetails.issueDate,
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  {(giftCardDetails.validFrom ||
                    giftCardDetails.validUntil) && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-zinc-500 uppercase">
                        Valid Period
                      </p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {giftCardDetails.validFrom
                          ? new Date(
                              giftCardDetails.validFrom,
                            ).toLocaleDateString()
                          : "—"}
                        {" → "}
                        {giftCardDetails.validUntil
                          ? new Date(
                              giftCardDetails.validUntil,
                            ).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-2">
                  Usage History
                </h3>
                {giftCardDetails.history &&
                giftCardDetails.history.length > 0 ? (
                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-zinc-50 text-xs text-zinc-500 font-bold uppercase">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Used</th>
                          <th className="px-3 py-2">Balance</th>
                          <th className="px-3 py-2">Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {giftCardDetails.history.map((h, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-zinc-600">
                              {new Date(h.usedAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-red-600">
                              -${Number(h.amountUsed || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 font-medium">
                              ${Number(h.balanceAfter || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-zinc-600 text-xs">
                              {h.orderNumber
                                ? `#${h.orderNumber}`
                                : h.note || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    No previous usage history.
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsGiftCardModalOpen(false)}
                className="flex-1 font-bold border-zinc-200 text-zinc-700 shadow-none"
              >
                No, Cancel
              </Button>
              <Button
                onClick={handleApplyGiftCard}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-none"
              >
                Yes, Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GiftCardField({
  giftCardCode,
  setGiftCardCode,
  giftCardBalance,
  isVerifyingGiftCard,
  giftCardError,
  onVerify,
  onRemove,
  label,
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={giftCardCode}
            onChange={(e) => setGiftCardCode(e.target.value)}
            placeholder="Enter code..."
            disabled={giftCardBalance !== null}
            className="w-full h-12 pl-9 pr-4 bg-white border border-zinc-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase disabled:bg-zinc-50 disabled:text-zinc-500"
          />
        </div>
        {giftCardBalance !== null ? (
          <Button
            type="button"
            onClick={onRemove}
            className="h-12 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-none"
          >
            Remove
          </Button>
        ) : (
          <Button
            onClick={onVerify}
            disabled={!giftCardCode || isVerifyingGiftCard}
            className="h-12 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none"
          >
            {isVerifyingGiftCard ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Verify"
            )}
          </Button>
        )}
      </div>
      {giftCardError && (
        <p className="text-xs font-bold text-red-500">{giftCardError}</p>
      )}
    </div>
  );
}

function CardTypePicker({ selectedCardType, setSelectedCardType }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        Select Card Type
      </label>
      <div className="grid grid-cols-5 gap-2">
        {CARD_TYPES.map((card) => (
          <button
            key={card.name}
            type="button"
            onClick={() => setSelectedCardType(card.name)}
            className={`flex flex-col items-center justify-center min-h-[64px] p-2 rounded-xl border-2 transition-all ${
              selectedCardType === card.name
                ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                : "border-zinc-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="relative w-10 h-6 mb-1">
              <Image
                src={card.image}
                alt={card.name}
                fill
                className="object-contain"
              />
            </div>
            <span className="text-[10px] font-bold text-zinc-600 text-center leading-tight">
              {card.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function OverpayTip({ overpay, method = "Cash" }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
      <span className="text-sm font-bold text-orange-900">
        Tip ({method})
      </span>
      <span className="text-base font-black text-orange-600">
        ${Number(overpay || 0).toFixed(2)}
      </span>
    </div>
  );
}

function GiftUseEditor({
  giftCardBalance,
  giftCardUseAmount,
  total,
  remainingAfterGift,
  remainingLabel,
  onChangeUseAmount,
  hint,
}) {
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold text-green-900">Gift Card Balance</span>
        <span className="font-black text-green-700">
          ${giftCardBalance.toFixed(2)}
        </span>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-green-800 uppercase tracking-wider">
          Amount to Use from Gift Card
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
            <input
              type="number"
              min="0"
              max={Math.min(giftCardBalance, total)}
              step="0.01"
              value={giftCardUseAmount}
              onChange={(e) => onChangeUseAmount(e.target.value)}
              className="w-full h-11 pl-9 pr-4 bg-white border border-green-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <Button
            type="button"
            onClick={() =>
              onChangeUseAmount(Math.min(giftCardBalance, total).toFixed(2))
            }
            className="h-11 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none shrink-0"
          >
            Exact
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
        <span className="font-bold text-orange-600">{remainingLabel}</span>
        <span className="font-black text-orange-600">
          ${remainingAfterGift.toFixed(2)}
        </span>
      </div>
      {hint && (
        <p className="text-xs font-semibold text-zinc-600">{hint}</p>
      )}
    </div>
  );
}

function PayRemainingActions({ remaining, currentMethod, onSwitch }) {
  if (!(remaining > 0)) return null;

  const options = [
    { key: "Card", label: "Rest with Card", Icon: CreditCard },
    { key: "Cash", label: "Rest with Cash", Icon: Banknote },
    { key: "GiftCard", label: "Rest with Gift Card", Icon: Gift },
  ].filter((opt) => opt.key !== currentMethod);

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">
          Remaining Due
        </span>
        <span className="text-xl font-black text-orange-600">
          ${remaining.toFixed(2)}
        </span>
      </div>
      <p className="text-xs font-semibold text-orange-900/80">
        Choose how to pay the rest:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSwitch(key)}
            className="min-h-[48px] rounded-xl border-2 border-orange-200 bg-white font-bold text-sm text-zinc-800 hover:border-orange-500 hover:bg-orange-50 flex items-center justify-center gap-2 px-2"
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-left leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
