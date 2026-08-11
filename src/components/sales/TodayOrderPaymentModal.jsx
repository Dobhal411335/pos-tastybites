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

function formatDiscountOption(coupon) {
  const amount =
    coupon.discountType === "percent"
      ? `${coupon.value}%`
      : `$${Number(coupon.value).toFixed(2)}`;
  return `${coupon.code} — ${amount}`;
}

export default function TodayOrderPaymentModal({ order, open, onClose, onPaid }) {
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [guestName, setGuestName] = useState(order?.partyName || order?.guestName || "");
  const [discountCode, setDiscountCode] = useState("");
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(
    order?.discountCode && Number(order?.discountTotal || 0) > 0
      ? { code: order.discountCode, value: Number(order.discountTotal), type: "$" }
      : null,
  );
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState(null);
  const [giftCardDetails, setGiftCardDetails] = useState(null);
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [isVerifyingGiftCard, setIsVerifyingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState("");
  const [selectedCardType, setSelectedCardType] = useState("");
  const [cardAmountTendered, setCardAmountTendered] = useState("");
  const [amountTendered, setAmountTendered] = useState("");
  const [tipAmount, setTipAmount] = useState(Number(order?.tipAmount || 0));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = Number(order?.subTotal || 0);
  const totalTax = Number(order?.taxTotal || 0);
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "%"
      ? (subtotal * appliedDiscount.value) / 100
      : Math.min(Number(appliedDiscount.value) || 0, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discountAmount + totalTax);
  const giftCardSplitAmount =
    giftCardBalance === null
      ? 0
      : giftCardBalance < total
        ? Math.round((total - giftCardBalance) * 100) / 100
        : 0;
  const dueAmount = giftCardBalance !== null ? giftCardSplitAmount : total;
  const parsedCardAmount =
    cardAmountTendered === "" ? NaN : parseFloat(cardAmountTendered);
  const cardPayAmount = Number.isFinite(parsedCardAmount)
    ? parsedCardAmount
    : dueAmount;
  const cashSplitAmount =
    paymentMethod === "Card" && cardPayAmount < dueAmount
      ? Math.round((dueAmount - cardPayAmount) * 100) / 100
      : 0;

  useEffect(() => {
    if (!open) return;
    const loadDiscounts = async () => {
      try {
        const res = await fetch("/api/orders/discount");
        const json = await res.json();
        if (json.success) setAvailableDiscounts(json.data || []);
      } catch (err) {
        setAvailableDiscounts([]);
      }
    };
    loadDiscounts();
  }, [open]);

  if (!open || !order) return null;

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
    } catch (err) {
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
      const res = await fetch(`/api/menu/giftcards?code=${encodeURIComponent(normalizedCode)}`);
      const json = await res.json();
      if (json.success) {
        setGiftCardDetails(json.data);
        setIsGiftCardModalOpen(true);
      } else {
        setGiftCardError(json.message || "Only issued active gift cards can be used");
      }
    } catch (err) {
      setGiftCardError("Failed to verify Gift Card");
    } finally {
      setIsVerifyingGiftCard(false);
    }
  };

  const handleApplyGiftCard = () => {
    const actualBalance = giftCardDetails.balance ?? giftCardDetails.value;
    setGiftCardBalance(actualBalance);
    if (actualBalance < total) {
      setAmountTendered("");
      setCardAmountTendered("");
    } else {
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
    setIsGiftCardModalOpen(false);
  };

  const handlePayment = async () => {
    try {
      setIsSubmitting(true);
      const giftCardUsedAmount =
        giftCardBalance !== null
          ? Math.round((total - giftCardSplitAmount) * 100) / 100
          : 0;

      const payload = {
        orderId: order._id,
        amount: total,
        method: paymentMethod === "GiftCard" ? "Gift Card" : paymentMethod,
        sessionId: order.tableSession || undefined,
        tipAmount: Number(tipAmount || 0),
        discountTotal: discountAmount,
        discountCode: appliedDiscount?.code || null,
        guestName: guestName.trim() || null,
        partyName: guestName.trim() || null,
        guestCount: order.guestCount ?? null,
      };

      if (paymentMethod === "Card") {
        payload.cardType = selectedCardType;
        payload.cardAmount = Math.min(cardPayAmount, dueAmount);
        if (cashSplitAmount > 0) {
          payload.method = "Card + Cash";
          payload.cashAmount = cashSplitAmount;
        }
      }

      if (giftCardBalance !== null) {
        payload.giftCardCode = giftCardCode.trim().toUpperCase();
        payload.splitAmount = giftCardSplitAmount;
      }

      const res = await fetch("/api/sales/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        if (giftCardBalance !== null && giftCardCode) {
          await fetch("/api/menu/giftcards/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: giftCardCode.trim().toUpperCase(),
              amountToUse: giftCardUsedAmount,
              orderId: order.orderNumber || order._id,
              note: "Today Orders Payment",
            }),
          });
        }
        toast.success("Payment collected successfully!");
        onPaid?.(json.data);
        onClose();
      } else {
        toast.error(json.message || "Payment failed");
      }
    } catch (err) {
      toast.error("Failed to process payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">PAYMENT</h2>
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
                        {order.guestCount} guest{order.guestCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Party / Customer Name
                      <span className="text-zinc-400 font-semibold normal-case">(optional)</span>
                    </label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-11 bg-white border-zinc-200 rounded-xl text-sm font-semibold focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2.5 shadow-sm">
                    <div className="flex justify-between text-sm font-semibold text-zinc-500">
                      <span>Subtotal</span>
                      <span className="text-zinc-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-zinc-500">
                      <span>Tax</span>
                      <span className="text-zinc-900">${totalTax.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm font-semibold text-green-600">
                        <span>Discount{appliedDiscount?.code ? ` (${appliedDiscount.code})` : ""}</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="h-px bg-zinc-200 my-1" />
                    <div className="flex justify-between items-end pt-1">
                      <span className="text-sm font-black text-zinc-900 uppercase tracking-wide">Total Due</span>
                      <span className="text-3xl font-black text-zinc-900 leading-none">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Apply Discount</p>
                  {appliedDiscount ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-green-900 truncate">{appliedDiscount.code}</p>
                            <p className="text-sm font-bold text-green-700">-${discountAmount.toFixed(2)}</p>
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
                              <SelectItem key={coupon._id || coupon.code} value={coupon.code}>
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
                            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
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

                {(giftCardBalance !== null || cashSplitAmount > 0) && (
                  <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2 shadow-sm">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Payment Breakdown
                    </p>
                    {giftCardBalance !== null && (
                      <div className="flex justify-between text-sm font-semibold text-zinc-600">
                        <span>Gift Card</span>
                        <span className="text-zinc-900">
                          ${Math.max(0, Math.round((total - giftCardSplitAmount) * 100) / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {paymentMethod === "Card" && (
                      <div className="flex justify-between text-sm font-semibold text-zinc-600">
                        <span>Card</span>
                        <span className="text-zinc-900">${Math.min(cardPayAmount, dueAmount).toFixed(2)}</span>
                      </div>
                    )}
                    {cashSplitAmount > 0 && (
                      <div className="flex justify-between text-sm font-semibold text-zinc-600">
                        <span>Cash</span>
                        <span className="text-zinc-900">${cashSplitAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {giftCardBalance !== null && giftCardSplitAmount > 0 && paymentMethod !== "Card" && (
                      <div className="flex justify-between text-sm font-semibold text-zinc-600">
                        <span>{paymentMethod === "Cash" ? "Cash" : "Remaining"}</span>
                        <span className="text-zinc-900">${giftCardSplitAmount.toFixed(2)}</span>
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
                        onClick={() => setPaymentMethod(key)}
                        className={`flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border-2 transition-all ${
                          paymentMethod === key
                            ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                        }`}
                      >
                        <Icon className="w-6 h-6" strokeWidth={2} />
                        <span className="text-xs font-black uppercase tracking-wide">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === "Card" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">Card Payment</h3>
                    <GiftCardField
                      giftCardCode={giftCardCode}
                      setGiftCardCode={setGiftCardCode}
                      giftCardBalance={giftCardBalance}
                      isVerifyingGiftCard={isVerifyingGiftCard}
                      giftCardError={giftCardError}
                      onVerify={verifyGiftCard}
                      onRemove={handleRemoveGiftCard}
                      label="Apply Gift Card (Optional)"
                    />
                    {giftCardBalance !== null && (
                      <GiftCardApplied total={total} giftCardSplitAmount={giftCardSplitAmount} remainingLabel="Remaining Due (Card)" />
                    )}
                    {selectedCardType && cardAmountTendered && parseFloat(cardAmountTendered) > dueAmount && (
                      <OverpayTip
                        overpay={parseFloat(cardAmountTendered) - dueAmount}
                        tipAmount={tipAmount}
                        setTipAmount={setTipAmount}
                      />
                    )}
                    {(giftCardBalance === null || giftCardSplitAmount > 0) && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Card Type</label>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { name: "Visa", image: "/card/visa.png" },
                              { name: "Mastercard", image: "/card/mastercard.webp" },
                              { name: "RuPay", image: "/card/rupay.webp" },
                              { name: "Amex", image: "/card/american-express.webp" },
                              { name: "Discover", image: "/card/discover.png" },
                            ].map((card) => (
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
                                  <Image src={card.image} alt={card.name} fill className="object-contain" />
                                </div>
                                <span className="text-[10px] font-bold text-zinc-600 text-center leading-tight">
                                  {card.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        {selectedCardType && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount on Card</label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                <input
                                  type="number"
                                  min="0"
                                  value={cardAmountTendered}
                                  onChange={(e) => setCardAmountTendered(e.target.value)}
                                  placeholder={dueAmount.toFixed(2)}
                                  className="w-full h-14 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                            </div>
                            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount in Cash</span>
                                <span className="text-xl font-black text-zinc-900">${cashSplitAmount.toFixed(2)}</span>
                              </div>
                              <p className="text-xs font-semibold text-zinc-500">
                                Enter less on card to collect the rest in cash.
                              </p>
                              {cashSplitAmount > 0 && (
                                <>
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cash Tendered</label>
                                    <div className="relative">
                                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                      <input
                                        type="number"
                                        min="0"
                                        value={amountTendered}
                                        onChange={(e) => setAmountTendered(e.target.value)}
                                        placeholder={cashSplitAmount.toFixed(2)}
                                        className="w-full h-14 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                      />
                                    </div>
                                  </div>
                                  {parseFloat(amountTendered) > cashSplitAmount && (
                                    <OverpayTip
                                      overpay={parseFloat(amountTendered) - cashSplitAmount}
                                      tipAmount={tipAmount}
                                      setTipAmount={setTipAmount}
                                      label="Change Due"
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {paymentMethod === "Cash" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">Cash Payment</h3>
                    <GiftCardField
                      giftCardCode={giftCardCode}
                      setGiftCardCode={setGiftCardCode}
                      giftCardBalance={giftCardBalance}
                      isVerifyingGiftCard={isVerifyingGiftCard}
                      giftCardError={giftCardError}
                      onVerify={verifyGiftCard}
                      onRemove={handleRemoveGiftCard}
                      label="Apply Gift Card (Optional)"
                    />
                    {giftCardBalance !== null && (
                      <GiftCardApplied total={total} giftCardSplitAmount={giftCardSplitAmount} remainingLabel="Remaining Due (Cash)" />
                    )}
                    {(giftCardBalance === null || giftCardSplitAmount > 0) && (
                      <>
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount Due</span>
                          <span className="text-2xl font-black text-zinc-900">${dueAmount.toFixed(2)}</span>
                        </div>
                            {parseFloat(amountTendered) > dueAmount && (
                              <OverpayTip
                                overpay={parseFloat(amountTendered) - dueAmount}
                                tipAmount={tipAmount}
                                setTipAmount={setTipAmount}
                                label="Change Due"
                              />
                            )}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount Tendered</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                            <input
                              type="number"
                              min="0"
                              value={amountTendered}
                              onChange={(e) => setAmountTendered(e.target.value)}
                              placeholder="0.00"
                              className="w-full h-14 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                        
                      </>
                    )}
                  </div>
                )}

                {paymentMethod === "GiftCard" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">Gift Card Payment</h3>
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
                          <span className="font-bold text-green-900">Available Balance</span>
                          <span className="font-black text-green-700">${giftCardBalance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-green-900">Amount Applied</span>
                          <span className="font-black text-green-700">
                            ${Math.max(0, Math.round((total - giftCardSplitAmount) * 100) / 100).toFixed(2)}
                          </span>
                        </div>
                        {giftCardSplitAmount > 0 ? (
                          <>
                            <div className="h-px bg-green-200/80" />
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-bold text-zinc-700">Order Total</span>
                              <span className="font-black text-zinc-900">${total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-bold text-orange-600">Remaining Due</span>
                              <span className="font-black text-orange-600">${giftCardSplitAmount.toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <button type="button" onClick={() => setPaymentMethod("Cash")} className="min-h-[48px] rounded-xl border-2 border-zinc-200 bg-white font-bold text-sm text-zinc-800 hover:border-orange-400 hover:bg-orange-50">
                                Pay Remaining Cash
                              </button>
                              <button type="button" onClick={() => setPaymentMethod("Card")} className="min-h-[48px] rounded-xl border-2 border-zinc-200 bg-white font-bold text-sm text-zinc-800 hover:border-orange-400 hover:bg-orange-50">
                                Pay Remaining Card
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
                            <span className="font-bold text-green-900">Remaining Balance After</span>
                            <span className="font-bold text-green-700">${(giftCardBalance - total).toFixed(2)}</span>
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
              className="flex-1 h-14 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none hover:bg-zinc-50 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={
                isSubmitting ||
                (paymentMethod === "Cash" && giftCardSplitAmount > 0 && (!amountTendered || parseFloat(amountTendered) < giftCardSplitAmount)) ||
                (paymentMethod === "Cash" && giftCardBalance === null && (!amountTendered || parseFloat(amountTendered) < total)) ||
                (paymentMethod === "GiftCard" && giftCardBalance === null) ||
                (paymentMethod === "Card" && (giftCardBalance === null || giftCardSplitAmount > 0) && cardPayAmount > 0 && !selectedCardType) ||
                (paymentMethod === "Card" && cashSplitAmount > 0 && (!amountTendered || parseFloat(amountTendered) < cashSplitAmount))
              }
              className="flex-[1.4] h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-none text-base"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Payment"}
            </Button>
          </div>
        </div>
      </div>

      {isGiftCardModalOpen && giftCardDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-zinc-100">
              <h3 className="text-lg font-black text-zinc-900">Apply Gift Card?</h3>
              <p className="text-sm font-semibold text-zinc-500 mt-1">
                Balance ${Number(giftCardDetails.balance ?? giftCardDetails.value ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="p-5 border-t border-zinc-100 flex gap-3">
              <Button variant="outline" onClick={() => setIsGiftCardModalOpen(false)} className="flex-1 font-bold border-zinc-200 text-zinc-700 shadow-none">
                No, Cancel
              </Button>
              <Button onClick={handleApplyGiftCard} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-none">
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
      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
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
          <Button type="button" onClick={onRemove} className="h-12 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-none">
            Remove
          </Button>
        ) : (
          <Button onClick={onVerify} disabled={!giftCardCode || isVerifyingGiftCard} className="h-12 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-none">
            {isVerifyingGiftCard ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
          </Button>
        )}
      </div>
      {giftCardError && <p className="text-xs font-bold text-red-500">{giftCardError}</p>}
    </div>
  );
}

function GiftCardApplied({ total, giftCardSplitAmount, remainingLabel }) {
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold text-green-900">Gift Card Applied</span>
        <span className="font-black text-green-700">
          ${Math.max(0, Math.round((total - giftCardSplitAmount) * 100) / 100).toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm pt-2 border-t border-green-200/50">
        <span className="font-bold text-orange-600">{remainingLabel}</span>
        <span className="font-black text-orange-600">${giftCardSplitAmount.toFixed(2)}</span>
      </div>
    </div>
  );
}

function OverpayTip({ overpay, tipAmount, setTipAmount, label = "Overpayment / Tip" }) {
  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-bold text-orange-900">{label}</span>
        <span className="text-xl font-black text-orange-600">${overpay.toFixed(2)}</span>
      </div>
      <label className="flex items-center gap-3 cursor-pointer group min-h-[44px]">
        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${tipAmount > 0 ? "bg-orange-500 border-orange-500" : "bg-white border-zinc-300 group-hover:border-orange-400"}`}>
          {tipAmount > 0 && <CheckCircle2 className="w-4 h-4 text-white" />}
        </div>
        <input
          type="checkbox"
          className="hidden"
          checked={tipAmount > 0}
          onChange={(e) => setTipAmount(e.target.checked ? Math.round(overpay * 100) / 100 : 0)}
        />
        <span className="text-sm font-bold text-orange-900">Keep as Tip</span>
      </label>
    </div>
  );
}
