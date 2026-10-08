"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Check,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
  Users,
  ArrowLeft,
  Merge,
  Split,
  RefreshCw,
  ChevronDown,
  ChevronUp,
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
import {
  getReceiptModifierLines,
  getItemLineTotal,
} from "@/utils/productChoices";
import {
  buildSeatSplitRows,
  groupItemsBySeat,
  filterItemsBySeats,
  filterItemsBySeat,
  formatSeatLabel,
  formatMergedSeatLabel,
  proportionalOrderTotalsForItems,
  getSeatRemainingDue,
  getOrderPaidAmount,
  getUnsettledSeatNumbers,
  isSeatSettled,
  normalizeSeatNumber,
  seatKey,
} from "@/lib/orders/seatHelpers";
import CustomerReceipt from "@/components/receipts/CustomerReceipt";

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

function emptySplitRow(overrides = {}) {
  return {
    id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    amount: "",
    method: "Card",
    cardType: "",
    seatNumber: null,
    seatNumbers: null,
    cashAmount: 0,
    cardAmount: 0,
    tipAmount: 0,
    tipMethod: null,
    paymentMethod: "Card",
    lockedCashAmount: 0,
    lockedCardAmount: 0,
    cardAmountTendered: "",
    amountTendered: "",
    giftUseAmount: 0,
    mergedFrom: undefined,
    ...overrides,
  };
}

/** Sync cash/card/tip/method on a split row from locked + tendered + paymentMethod. */
function syncRowTenders(row) {
  const dueRaw = round2(parseFloat(row.amount) || 0);
  const giftUse = round2(
    Math.min(Math.max(0, Number(row.giftUseAmount) || 0), dueRaw),
  );
  const due = round2(Math.max(0, dueRaw - giftUse));
  const lockedCard = round2(Math.max(0, Number(row.lockedCardAmount) || 0));
  const lockedCash = round2(Math.max(0, Number(row.lockedCashAmount) || 0));
  const pm = row.paymentMethod || "Card";

  const effectiveCardDue = round2(Math.max(0, due - lockedCash));
  const effectiveCashDue = round2(Math.max(0, due - lockedCard));

  const parsedCard =
    row.cardAmountTendered === "" || row.cardAmountTendered == null
      ? NaN
      : parseFloat(row.cardAmountTendered);
  const parsedCash =
    row.amountTendered === "" || row.amountTendered == null
      ? NaN
      : parseFloat(row.amountTendered);

  const cardPay = Number.isFinite(parsedCard)
    ? Math.max(0, parsedCard)
    : effectiveCardDue;
  const cashPay = Number.isFinite(parsedCash)
    ? Math.max(0, parsedCash)
    : effectiveCashDue;

  const cashSplitAmount =
    (pm === "Card" || pm === "GiftCard") &&
    effectiveCardDue > 0 &&
    Number.isFinite(parsedCard) &&
    cardPay < effectiveCardDue
      ? round2(effectiveCardDue - Math.min(cardPay, effectiveCardDue))
      : 0;

  const cardSplitFromCash =
    pm === "Cash" &&
    effectiveCashDue > 0 &&
    Number.isFinite(parsedCash) &&
    cashPay < effectiveCashDue
      ? round2(effectiveCashDue - Math.min(cashPay, effectiveCashDue))
      : 0;

  const giftSplitRemaining =
    pm === "GiftCard" && due > 0.009 && !Number.isFinite(parsedCard) && !Number.isFinite(parsedCash)
      ? due
      : 0;

  const cardOverpay =
    pm === "Card" &&
    Number.isFinite(parsedCard) &&
    cardPay > effectiveCardDue
      ? round2(cardPay - effectiveCardDue)
      : 0;
  const cashOverpay =
    pm === "Cash" &&
    Number.isFinite(parsedCash) &&
    cashPay > effectiveCashDue &&
    cardSplitFromCash === 0
      ? round2(cashPay - effectiveCashDue)
      : 0;

  const tip = round2(cardOverpay || cashOverpay || 0);
  const tipMethod =
    cashOverpay > 0 ? "Cash" : cardOverpay > 0 ? "Card" : null;

  let cashAmount = lockedCash;
  let cardAmount = lockedCard;
  const cardTenderEntered = Number.isFinite(parsedCard);
  const cashTenderEntered = Number.isFinite(parsedCash);

  if (pm === "Card") {
    // Empty input does not count as paid — staff must type Exact or an amount.
    if (cardTenderEntered) {
      const applied = round2(Math.min(cardPay, effectiveCardDue));
      cardAmount = round2(lockedCard + applied);
      if (cashSplitAmount > 0) {
        // Partial card — remainder not yet assigned
      } else if (tip > 0) {
        cardAmount = round2(cardAmount + tip);
      }
    }
  } else if (pm === "Cash") {
    if (cashTenderEntered) {
      const applied = round2(Math.min(cashPay, effectiveCashDue));
      cashAmount = round2(lockedCash + applied);
      if (cardSplitFromCash > 0) {
        // Partial cash — remainder not yet assigned
      } else if (tip > 0) {
        cashAmount = round2(cashAmount + tip);
      }
    }
  } else if (pm === "GiftCard") {
    // Gift covers giftUse; any locked card/cash already counted; tenders optional for remainder
    if (Number.isFinite(parsedCard) && cardPay > 0) {
      cardAmount = round2(
        lockedCard + round2(Math.min(cardPay, effectiveCardDue)),
      );
    }
    if (Number.isFinite(parsedCash) && cashPay > 0) {
      cashAmount = round2(
        lockedCash + round2(Math.min(cashPay, effectiveCashDue)),
      );
    }
  }

  const parts = [];
  if (giftUse > 0) parts.push("Gift Card");
  if (cashAmount > 0) parts.push("Cash");
  if (cardAmount > 0) parts.push("Card");
  const method =
    parts.length === 0
      ? pm === "GiftCard"
        ? "Gift Card"
        : "Card"
      : parts.length === 1
        ? parts[0]
        : parts.join(" + ");

  return {
    ...row,
    cashAmount,
    cardAmount,
    giftAmount: giftUse,
    tipAmount: tip,
    tipMethod: tip > 0 ? tipMethod : null,
    method,
    _cashSplitAmount: cashSplitAmount,
    _cardSplitFromCash: cardSplitFromCash,
    _giftSplitRemaining: giftSplitRemaining,
  };
}

function isRowReady(row) {
  const synced = syncRowTenders(row);
  const nameOk = String(synced.name || "").trim().length > 0;
  const amt = parseFloat(synced.amount);
  const amtOk = Number.isFinite(amt) && amt > 0;
  if (!nameOk || !amtOk) return false;

  const pm = row.paymentMethod || "Card";
  const dueRaw = round2(parseFloat(row.amount) || 0);
  const giftUse = round2(
    Math.min(Math.max(0, Number(row.giftUseAmount) || 0), dueRaw),
  );
  const due = round2(Math.max(0, dueRaw - giftUse));
  const lockedCard = round2(Math.max(0, Number(row.lockedCardAmount) || 0));
  const lockedCash = round2(Math.max(0, Number(row.lockedCashAmount) || 0));
  const remainingToEnter = round2(
    Math.max(0, due - lockedCard - lockedCash),
  );
  const cardEntered =
    row.cardAmountTendered !== "" &&
    row.cardAmountTendered != null &&
    Number.isFinite(parseFloat(row.cardAmountTendered));
  const cashEntered =
    row.amountTendered !== "" &&
    row.amountTendered != null &&
    Number.isFinite(parseFloat(row.amountTendered));

  // Require an explicit amount in the active tender input before Ready / Complete.
  if (remainingToEnter > 0.009) {
    if (pm === "Card" && !cardEntered) return false;
    if (pm === "Cash" && !cashEntered) return false;
    if (pm === "GiftCard" && !cardEntered && !cashEntered && giftUse < dueRaw - 0.009) {
      return false;
    }
  }

  if (
    synced._cashSplitAmount > 0 ||
    synced._cardSplitFromCash > 0 ||
    synced._giftSplitRemaining > 0.009
  ) {
    return false;
  }
  const giftPart = round2(Number(synced.giftAmount) || 0);
  const tenderSum = round2(
    (Number(synced.cashAmount) || 0) +
      (Number(synced.cardAmount) || 0) +
      giftPart,
  );
  const expected = round2(amt + (Number(synced.tipAmount) || 0));
  if (Math.abs(tenderSum - expected) > 0.01) return false;
  if ((Number(synced.cardAmount) || 0) > 0 && !String(synced.cardType || "").trim()) {
    return false;
  }
  return true;
}

function seatsLabelForRow(row) {
  if (!row || typeof row !== "object") return null;
  if (Array.isArray(row.seatNumbers) && row.seatNumbers.length) {
    return formatMergedSeatLabel(row.seatNumbers);
  }
  if (row.seatNumber !== undefined && row.seatNumber !== null) {
    return formatSeatLabel(row.seatNumber);
  }
  return null;
}

export default function OrderPaymentView({
  order,
  sessionId,
  guestName: guestNameProp,
  onGuestNameChange,
  serviceTax,
  // eslint-disable-next-line no-unused-vars
  redeemNote = "POS Payment",
  applyServiceCharge = false,
  onPaid,
  onCancel,
  backLabel = "Back",
  /** null = full order; number = seat N; "table" = Table bucket */
  seatMode = null,
  restaurantDetails = null,
}) {
  const isSeatPayMode =
    seatMode !== null && seatMode !== undefined && seatMode !== "";
  const seatPayNumber =
    seatMode === "table" || seatMode === "TABLE"
      ? null
      : normalizeSeatNumber(seatMode);
  const isRemainingPayMode =
    !isSeatPayMode &&
    String(order?.paymentStatus || "").toUpperCase() === "PARTIAL";
  const unsettledSeatNumbers = isRemainingPayMode
    ? getUnsettledSeatNumbers(order)
    : [];

  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [billMode, setBillMode] = useState("full"); // full | split
  const [splitMode, setSplitMode] = useState("custom"); // custom | by_seat
  const [paymentSplits, setPaymentSplits] = useState([
    emptySplitRow({ id: "split-1" }),
    emptySplitRow({ id: "split-2" }),
  ]);
  const [selectedSplitId, setSelectedSplitId] = useState(null);
  const [mergeSelectedIds, setMergeSelectedIds] = useState([]);
  /** Which remaining-seat receipt accordion is open (seat key). */
  const [openReceiptSeatKey, setOpenReceiptSeatKey] = useState(null);
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

  const rawSession = sessionId ?? order?.tableSession;
  const resolvedSessionId =
    rawSession && typeof rawSession === "object"
      ? rawSession._id || rawSession.id || null
      : rawSession || null;

  const subtotal = Number(order?.subTotal || 0);
  const rawBaseTax =
    Array.isArray(order?.items) && order.items.length > 0
      ? order.items.reduce(
          (s, it) => s + Number(it.tax || 0) * Number(it.qty || 1),
          0,
        )
      : Number(order?.taxTotal || 0);
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "%"
      ? (subtotal * appliedDiscount.value) / 100
      : Math.min(Number(appliedDiscount.value) || 0, subtotal)
    : Number(order?.discountTotal || 0);
  const taxableRatio =
    subtotal > 0 ? Math.max(0, subtotal - discountAmount) / subtotal : 1;
  const totalTax = round2(rawBaseTax * taxableRatio);

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
  const orderBillWithoutSc = Math.max(
    0,
    round2(subtotal - discountAmount + totalTax),
  );
  const orderBillWithSc = Math.max(
    0,
    round2(orderBillWithoutSc + computedServiceCharge),
  );
  const orderBillTotal = includeServiceCharge
    ? orderBillWithSc
    : orderBillWithoutSc;

  /** Seat share of service charge (what this payment actually adds). */
  const seatServiceChargeShare = (() => {
    if (!isSeatPayMode || !(computedServiceCharge > 0)) return 0;
    const base = {
      items: order?.items || [],
      taxTotal: totalTax,
      discountTotal: discountAmount,
      giftcardUsedAmount: 0,
      paymentSplits: order?.paymentSplits || [],
    };
    const without = getSeatRemainingDue(
      { ...base, totalAmount: orderBillWithoutSc, serviceChargeTotal: 0 },
      seatPayNumber,
    );
    const withSc = getSeatRemainingDue(
      {
        ...base,
        totalAmount: orderBillWithSc,
        serviceChargeTotal: computedServiceCharge,
      },
      seatPayNumber,
    );
    return round2(
      Math.max(0, (withSc?.due || 0) - (without?.due || 0)),
    );
  })();
  const displayServiceCharge = isSeatPayMode
    ? seatServiceChargeShare
    : computedServiceCharge;

  const seatRemainingInfo = isSeatPayMode
    ? getSeatRemainingDue(
        {
          items: order?.items || [],
          totalAmount: orderBillTotal,
          taxTotal: totalTax,
          serviceChargeTotal,
          discountTotal: discountAmount,
          giftcardUsedAmount: 0,
          paymentSplits: order?.paymentSplits || [],
        },
        seatPayNumber,
      )
    : null;
  const priorPaidAmount = isRemainingPayMode
    ? getOrderPaidAmount(order?.paymentSplits)
    : 0;
  /** Payable amount for current UI (full bill, remaining seats, or one seat). */
  const total = isSeatPayMode
    ? Math.max(0, round2(seatRemainingInfo?.due || 0))
    : isRemainingPayMode
      ? Math.max(0, round2(orderBillTotal - priorPaidAmount))
      : orderBillTotal;
  const seatPayLabel = isSeatPayMode
    ? seatRemainingInfo?.name || formatSeatLabel(seatPayNumber)
    : isRemainingPayMode
      ? unsettledSeatNumbers.length
        ? `Remaining · ${unsettledSeatNumbers
            .map((s) => formatSeatLabel(s))
            .join(", ")}`
        : "Remaining seats"
      : null;

  const remainingSeatDueRows = isRemainingPayMode
    ? unsettledSeatNumbers.map((seatNum) => {
        const info = getSeatRemainingDue(
          {
            items: order?.items || [],
            totalAmount: orderBillTotal,
            taxTotal: totalTax,
            serviceChargeTotal,
            discountTotal: discountAmount,
            giftcardUsedAmount: 0,
            paymentSplits: order?.paymentSplits || [],
          },
          seatNum,
        );
        return {
          seatNumber: seatNum,
          key: seatKey(seatNum),
          label: info?.name || formatSeatLabel(seatNum),
          due: Math.max(0, round2(info?.due || 0)),
        };
      })
    : [];

  const modalDiscountPct =
    appliedDiscount?.type === "%"
      ? Number(appliedDiscount.value)
      : subtotal > 0 && discountAmount > 0
        ? Math.round((discountAmount / subtotal) * 1000) / 10
        : null;

  const modalDiscountLabel =
    modalDiscountPct != null && modalDiscountPct > 0
      ? `Discount (${modalDiscountPct}%)`
      : discountAmount > 0
        ? `Discount ($${discountAmount.toFixed(2)})`
        : "Discount";

  const modalHstRate = (() => {
    const breakdownRatesSum = (order?.taxBreakdown || []).reduce(
      (sum, t) => sum + (Number(t.rate) || 0),
      0,
    );
    if (breakdownRatesSum > 0) return Math.round(breakdownRatesSum * 10) / 10;
    const taxableBase = Math.max(0, subtotal - discountAmount);
    if (taxableBase > 0 && totalTax > 0) {
      return Math.round((totalTax / taxableBase) * 1000) / 10;
    }
    return null;
  })();
  const modalHstLabel =
    modalHstRate != null && modalHstRate > 0 ? `HST (${modalHstRate}%)` : "HST";

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

  const giftUsed = giftCardBalance !== null ? giftCardUsedPreview : 0;

  // By-seat splits apply gift per group (Card/Cash/Gift Card on each seat).
  // Custom splits still support an order-level gift that reduces the pool first.
  const splitDue = round2(
    Math.max(0, total - (splitMode === "by_seat" ? 0 : giftUsed)),
  );
  const seatBucketCount = isRemainingPayMode
    ? unsettledSeatNumbers.length
    : groupItemsBySeat(order?.items || []).length;
  const canSplitBySeat = seatBucketCount >= 2;
  const splitAllocated = round2(
    paymentSplits.reduce(
      (sum, row) => sum + (parseFloat(row.amount) || 0),
      0,
    ),
  );
  const splitRemaining = round2(splitDue - splitAllocated);
  const giftCoversSplitBill =
    billMode === "split" &&
    splitMode !== "by_seat" &&
    giftUsed > 0 &&
    splitDue < 0.01;

  const syncedSplits = useMemo(
    () => paymentSplits.map((row) => syncRowTenders(row)),
    [paymentSplits],
  );

  const splitsValid =
    billMode === "split" &&
    (giftCoversSplitBill ||
      (paymentSplits.length >= 1 &&
        Math.abs(splitRemaining) < 0.01 &&
        syncedSplits.every((row) => isRowReady(row))));

  const applySeatSplitRows = (dueAmount) => {
    let items = order?.items || [];
    if (isRemainingPayMode && unsettledSeatNumbers.length) {
      const allowed = new Set(unsettledSeatNumbers.map((n) => seatKey(n)));
      items = items.filter((it) =>
        allowed.has(seatKey(normalizeSeatNumber(it?.seatNumber ?? it?.seat))),
      );
    }
    const rows = buildSeatSplitRows({
      items,
      totalAmount: dueAmount,
      taxTotal: totalTax,
      serviceChargeTotal,
      discountTotal: discountAmount,
      giftcardUsedAmount: splitMode === "by_seat" ? 0 : giftUsed,
    });
    if (rows.length < 2) return false;
    const mapped = rows.map((row, i) =>
      emptySplitRow({
        id: `seat-split-${row.seatNumber ?? "table"}-${i}`,
        name: row.name,
        amount: Number(row.amount || 0).toFixed(2),
        method: "Card",
        cardType: "",
        seatNumber: row.seatNumber,
        seatNumbers: [row.seatNumber],
        paymentMethod: "Card",
      }),
    );
    setPaymentSplits(mapped);
    setSelectedSplitId(mapped[0]?.id || null);
    setMergeSelectedIds([]);
    setOpenReceiptSeatKey(seatKey(mapped[0]?.seatNumber));
    return true;
  };

  const effectiveCardDue = round2(Math.max(0, total - giftUsed - lockedCash));
  const parsedCardAmount =
    cardAmountTendered === "" ? NaN : parseFloat(cardAmountTendered);
  const cardPayAmount = Number.isFinite(parsedCardAmount)
    ? Math.max(0, parsedCardAmount)
    : effectiveCardDue;

  const effectiveCashDue = round2(Math.max(0, total - giftUsed - lockedCard));
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

  const unsettledSeatsKey = unsettledSeatNumbers.map((n) => seatKey(n)).join(",");

  // Default open receipt to first remaining seat.
  useEffect(() => {
    if (!isRemainingPayMode || !unsettledSeatsKey) return;
    const keys = unsettledSeatsKey.split(",");
    setOpenReceiptSeatKey((prev) => {
      if (prev != null && keys.includes(String(prev))) return prev;
      return keys[0] || null;
    });
  }, [isRemainingPayMode, unsettledSeatsKey]);

  // When service charge is toggled, Exact tenders must follow the new due —
  // otherwise the old Exact amount looks like a tip or remaining due.
  const prevIncludeScRef = useRef(includeServiceCharge);
  useEffect(() => {
    if (prevIncludeScRef.current === includeServiceCharge) return;
    prevIncludeScRef.current = includeServiceCharge;
    if (billMode === "split" && !isSeatPayMode) return;
    setLockedCardAmount(0);
    setLockedCashAmount(0);
    if (paymentMethod === "Card") {
      setCardAmountTendered(effectiveCardDue.toFixed(2));
      setAmountTendered("");
    } else if (paymentMethod === "Cash") {
      setAmountTendered(effectiveCashDue.toFixed(2));
      setCardAmountTendered("");
    } else {
      setCardAmountTendered("");
      setAmountTendered("");
    }
  }, [
    includeServiceCharge,
    billMode,
    isSeatPayMode,
    paymentMethod,
    effectiveCardDue,
    effectiveCashDue,
  ]);

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

  const addSplitRow = () => {
    const row = emptySplitRow({
      id: `split-${Date.now()}-${paymentSplits.length + 1}`,
      name: `Guest ${String.fromCharCode(65 + paymentSplits.length)}`,
    });
    setPaymentSplits((prev) => [...prev, row]);
    setSelectedSplitId(row.id);
  };

  const removeSplitRow = (id) => {
    setPaymentSplits((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
    setMergeSelectedIds((prev) => prev.filter((x) => x !== id));
    if (selectedSplitId === id) setSelectedSplitId(null);
  };

  const updateSplitRow = (id, patch) => {
    setPaymentSplits((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const selectSplitPaymentMethod = (id, method) => {
    updateSplitRow(id, {
      paymentMethod: method,
      lockedCardAmount: 0,
      lockedCashAmount: 0,
      cardAmountTendered: "",
      amountTendered: "",
      method:
        method === "Cash"
          ? "Cash"
          : method === "GiftCard"
            ? "Gift Card"
            : "Card",
      cardType: method === "Cash" || method === "GiftCard" ? "" : undefined,
      ...(method !== "GiftCard" ? { giftUseAmount: 0 } : {}),
    });
  };

  const switchSplitForRemainder = (
    id,
    method,
    { lockCard, lockCash, lockGift } = {},
  ) => {
    const patch = {
      paymentMethod: method,
      method:
        method === "Cash"
          ? "Cash"
          : method === "GiftCard"
            ? "Gift Card"
            : "Card",
    };
    if (lockCard != null) patch.lockedCardAmount = round2(Math.max(0, lockCard));
    if (lockCash != null) patch.lockedCashAmount = round2(Math.max(0, lockCash));
    if (lockGift != null) patch.giftUseAmount = round2(Math.max(0, lockGift));
    if (method === "Card") {
      patch.cardAmountTendered = "";
    }
    if (method === "Cash") {
      patch.amountTendered = "";
    }
    if (method === "GiftCard") {
      patch.cardAmountTendered = "";
      patch.amountTendered = "";
    }
    updateSplitRow(id, patch);
  };

  const splitEqually = (count) => {
    const n = Math.max(1, Math.min(12, Number(count) || 2));
    const each = Math.floor((splitDue * 100) / n) / 100;
    const last = round2(splitDue - each * (n - 1));
    const next = Array.from({ length: n }, (_, i) =>
      emptySplitRow({
        id: `split-${Date.now()}-${i}`,
        name: paymentSplits[i]?.name || `Guest ${String.fromCharCode(65 + i)}`,
        amount: (i === n - 1 ? last : each).toFixed(2),
        method: paymentSplits[i]?.method || "Card",
        cardType: paymentSplits[i]?.cardType || "",
        paymentMethod: paymentSplits[i]?.paymentMethod || "Card",
      }),
    );
    setPaymentSplits(next);
    setSelectedSplitId(next[0]?.id || null);
    setMergeSelectedIds([]);
  };

  const fillRemainingOnLast = () => {
    if (paymentSplits.length === 0) return;
    const lastId = paymentSplits[paymentSplits.length - 1].id;
    const others = paymentSplits
      .slice(0, -1)
      .reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
    const fill = round2(Math.max(0, splitDue - others));
    updateSplitRow(lastId, { amount: fill.toFixed(2) });
  };

  const toggleMergeSelect = (id) => {
    setMergeSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const mergeSelectedGroups = () => {
    const selected = paymentSplits.filter((r) =>
      mergeSelectedIds.includes(r.id),
    );
    if (selected.length < 2) {
      toast.error("Select at least two payment groups to merge.");
      return;
    }
    const seatSet = [];
    const seen = new Set();
    for (const row of selected) {
      const seats =
        Array.isArray(row.seatNumbers) && row.seatNumbers.length
          ? row.seatNumbers
          : row.seatNumber !== undefined
            ? [row.seatNumber]
            : [];
      for (const s of seats) {
        const key = s == null ? "table" : String(s);
        if (seen.has(key)) continue;
        seen.add(key);
        seatSet.push(s == null ? null : s);
      }
    }
    const amount = round2(
      selected.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    );
    const merged = emptySplitRow({
      id: `merged-${Date.now()}`,
      name: formatMergedSeatLabel(seatSet),
      amount: amount.toFixed(2),
      seatNumber: seatSet.find((n) => n != null) ?? null,
      seatNumbers: seatSet,
      paymentMethod: "Card",
      method: "Card",
      mergedFrom: selected.map((r) => ({ ...r })),
    });
    const selectedSet = new Set(mergeSelectedIds);
    const remaining = paymentSplits.filter((r) => !selectedSet.has(r.id));
    setPaymentSplits([...remaining, merged]);
    setSelectedSplitId(merged.id);
    setMergeSelectedIds([]);
    const firstSeat = seatSet.find((n) => n != null);
    if (firstSeat !== undefined) {
      setOpenReceiptSeatKey(seatKey(firstSeat));
    }
    toast.success(`Merged ${formatMergedSeatLabel(seatSet)}`);
  };

  const unmergeSelectedGroup = () => {
    const row = paymentSplits.find((r) => r.id === selectedSplitId);
    if (!row) return;
    if (Array.isArray(row.mergedFrom) && row.mergedFrom.length) {
      const rest = paymentSplits.filter((r) => r.id !== row.id);
      setPaymentSplits([...rest, ...row.mergedFrom.map((r) => ({ ...r }))]);
      setSelectedSplitId(row.mergedFrom[0]?.id || null);
      setMergeSelectedIds([]);
      return;
    }
    if (Array.isArray(row.seatNumbers) && row.seatNumbers.length > 1) {
      toast.error("Recalc seats to rebuild individual seat groups.");
      return;
    }
    toast.error("This group cannot be unmerged.");
  };

  const selectedSplit =
    paymentSplits.find((r) => r.id === selectedSplitId) || null;
  const selectedSynced = selectedSplit
    ? syncRowTenders(selectedSplit)
    : null;

  useEffect(() => {
    if (isStaffOrder) return;
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
  }, [isStaffOrder, order?._id]);

  useEffect(() => {
    if (!order) return;

    setPaymentMethod("Card");
    setBillMode("full");
    setSplitMode("custom");
    setPaymentSplits([
      emptySplitRow({ id: "split-1" }),
      emptySplitRow({ id: "split-2" }),
    ]);
    setSelectedSplitId(null);
    setMergeSelectedIds([]);
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
    setIncludeServiceCharge(
      Boolean(applyServiceCharge) ||
        Number(order.serviceChargeTotal || 0) > 0,
    );

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
  }, [order?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) return null;

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
        const actualBalance = Number(
          json.data?.balance ?? json.data?.value ?? 0,
        );
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
      if (isSeatPayMode) {
        if (total < 0.01) {
          toast.error("No remaining balance for this seat.");
          return;
        }
        if (isSeatSettled(order?.paymentSplits, seatPayNumber, order)) {
          toast.error(`${seatPayLabel || "This seat"} has already been paid.`);
          return;
        }
      }

      const liveSynced =
        !isSeatPayMode && billMode === "split"
          ? paymentSplits.map(syncRowTenders)
          : [];

      if (!isSeatPayMode && billMode === "split") {
        const liveValid =
          giftCoversSplitBill ||
          (liveSynced.length >= 1 &&
            Math.abs(
              splitDue -
                round2(
                  liveSynced.reduce(
                    (s, r) => s + (parseFloat(r.amount) || 0),
                    0,
                  ),
                ),
            ) < 0.01 &&
            liveSynced.every((row) => isRowReady(row)));
        if (!liveValid) {
          toast.error(
            "Complete all split payers so amounts equal the total due.",
          );
          return;
        }
        if (
          includeServiceCharge &&
          liveSynced.some((r) => (Number(r.tipAmount) || 0) > 0)
        ) {
          toast.error(SERVICE_CHARGE_NO_TIP_MESSAGE);
          return;
        }
      } else if (includeServiceCharge && autoTip > 0) {
        toast.error(SERVICE_CHARGE_NO_TIP_MESSAGE);
        return;
      }

      setIsSubmitting(true);

      let giftCardUsedAmount =
        giftCardBalance !== null ? round2(giftCardUsedPreview) : 0;
      const partyName = guestName.trim() || null;

      let tip = 0;
      let tipMethodResolved = null;
      let resolvedCashAmount = 0;
      let resolvedCardAmount = 0;
      let resolvedPaymentMethod = paymentMethod;
      let selectedCardForPayload = selectedCardType;
      let splitsPayload = null;

      if (!isSeatPayMode && billMode === "split") {
        if (giftCardUsedAmount > 0 && splitDue < 0.01) {
          tip = 0;
          splitsPayload = null;
          resolvedCashAmount = 0;
          resolvedCardAmount = 0;
          resolvedPaymentMethod = "Gift Card";
          selectedCardForPayload = "";
        } else {
          splitsPayload = liveSynced.map((row) => {
            const seatNumbers =
              Array.isArray(row.seatNumbers) && row.seatNumbers.length
                ? row.seatNumbers
                : row.seatNumber !== undefined && row.seatNumber !== null
                  ? [row.seatNumber]
                  : null;
            return {
              name: String(row.name || "").trim(),
              amount: round2(parseFloat(row.amount) || 0),
              method: row.method,
              cardType:
                (Number(row.cardAmount) || 0) > 0
                  ? String(row.cardType || "").trim() || null
                  : null,
              seatNumber:
                row.seatNumber === undefined || row.seatNumber === null
                  ? seatNumbers?.[0] ?? null
                  : Number.isFinite(Number(row.seatNumber))
                    ? Number(row.seatNumber)
                    : null,
              seatNumbers,
              cashAmount: round2(Number(row.cashAmount) || 0),
              cardAmount: round2(Number(row.cardAmount) || 0),
              giftAmount: round2(Number(row.giftAmount) || 0),
              tipAmount: round2(Number(row.tipAmount) || 0),
              tipMethod: row.tipAmount > 0 ? row.tipMethod : null,
            };
          });
          const splitGiftTotal = round2(
            splitsPayload.reduce((s, r) => s + (Number(r.giftAmount) || 0), 0),
          );
          if (splitGiftTotal > 0) {
            // Prefer per-seat gift totals when splitting by seat / merge groups
            giftCardUsedAmount = round2(
              Math.max(giftCardUsedAmount, splitGiftTotal),
            );
          }
          tip = round2(
            splitsPayload.reduce((s, r) => s + (Number(r.tipAmount) || 0), 0),
          );
          tipMethodResolved =
            tip > 0
              ? [
                  ...new Set(
                    splitsPayload
                      .filter((s) => (Number(s.tipAmount) || 0) > 0)
                      .map((s) => s.tipMethod)
                      .filter(Boolean),
                  ),
                ].join(" + ") || null
              : null;
          resolvedCashAmount = round2(
            splitsPayload.reduce((s, row) => s + Number(row.cashAmount || 0), 0),
          );
          resolvedCardAmount = round2(
            splitsPayload.reduce((s, row) => s + Number(row.cardAmount || 0), 0),
          );
          const methodParts = [
            ...new Set(
              splitsPayload.map((s) =>
                s.method === "Card" && s.cardType
                  ? `Card - ${s.cardType}`
                  : s.method === "Cash + Card" && s.cardType
                    ? `Card - ${s.cardType} + Cash`
                    : s.method,
              ),
            ),
          ];
          resolvedPaymentMethod =
            methodParts.length <= 3
              ? `Split (${splitsPayload.length}) · ${methodParts.join(" + ")}`
              : `Split (${splitsPayload.length})`;
          if (giftCardUsedAmount > 0) {
            resolvedPaymentMethod = `${resolvedPaymentMethod} + Gift Card`;
          }
          const firstCard = splitsPayload.find(
            (s) => (Number(s.cardAmount) || 0) > 0 && s.cardType,
          );
          selectedCardForPayload = firstCard?.cardType || "";
        }
      } else {
        tip = includeServiceCharge ? 0 : autoTip;
        tipMethodResolved = tip > 0 ? tipMethod : null;
        resolvedCashAmount = lockedCash;
        resolvedCardAmount = lockedCard;
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
            giftCardUsedAmount > 0
              ? "Gift Card"
              : paymentMethod === "GiftCard"
                ? "Cash"
                : paymentMethod;
        } else if (parts.length === 1) {
          resolvedPaymentMethod = parts[0];
        } else {
          resolvedPaymentMethod = parts.join(" + ");
        }

        const payableTotalWithTip = round2(total + tip);
        if (resolvedCardAmount > 0) {
          const maxCard = round2(
            Math.max(
              0,
              payableTotalWithTip - resolvedCashAmount - giftCardUsedAmount,
            ),
          );
          resolvedCardAmount = Math.min(resolvedCardAmount, maxCard);
        }
      }

      const paymentPayload = {
        orderId: order._id,
        amount: total,
        method: resolvedPaymentMethod,
        sessionId: resolvedSessionId || undefined,
        tipAmount: tip,
        tipMethod: tip > 0 ? tipMethodResolved : null,
        discountTotal: discountAmount,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        discountPercent:
          appliedDiscount?.type === "%"
            ? Number(appliedDiscount.value)
            : subtotal > 0 && discountAmount > 0
              ? Math.round((discountAmount / subtotal) * 1000) / 10
              : null,
        guestName: partyName,
        partyName,
        guestCount: order.guestCount ?? null,
        cashAmount: resolvedCashAmount,
        cardAmount: resolvedCardAmount,
        applyServiceCharge: Boolean(includeServiceCharge),
        serviceChargeTotal: includeServiceCharge ? serviceChargeTotal : 0,
        serviceChargeName: includeServiceCharge ? serviceChargeName : null,
      };

      if (isSeatPayMode) {
        paymentPayload.seatPayment = true;
        paymentPayload.seatNumber =
          seatPayNumber == null ? "table" : seatPayNumber;
      }

      if (!isSeatPayMode && splitsPayload) {
        paymentPayload.paymentSplits = splitsPayload;
      }

      if (resolvedCardAmount > 0 && selectedCardForPayload) {
        paymentPayload.cardType = selectedCardForPayload;
      }

      if (giftCardBalance !== null && giftCardUsedAmount > 0) {
        paymentPayload.giftCardCode = giftCardCode.trim().toUpperCase();
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
        const paidOrder = json.data || {};
        const slipCount =
          Array.isArray(paidOrder.printJobIds) &&
          paidOrder.printJobIds.length > 1
            ? paidOrder.printJobIds.length
            : Array.isArray(splitsPayload) && splitsPayload.length > 1
              ? splitsPayload.length
              : 0;
        if (paidOrder.paymentStatus !== "PARTIAL") {
          toast.success(
            slipCount > 1
              ? `Payment collected · ${slipCount} receipt slips queued`
              : "Payment collected successfully!",
          );
        }

        const updatedOrder = {
          ...order,
          ...paidOrder,
          paymentStatus:
            paidOrder.paymentStatus ||
            (isSeatPayMode ? "PARTIAL" : "PAID"),
          status: paidOrder.status || order.status,
          paymentMethod: paidOrder.paymentMethod || resolvedPaymentMethod,
          paymentSplits: paidOrder.paymentSplits || splitsPayload || [],
          tipAmount: paidOrder.tipAmount ?? tip,
          tipMethod:
            paidOrder.tipMethod ?? (tip > 0 ? tipMethodResolved : null),
          discountTotal: paidOrder.discountTotal ?? discountAmount,
          discountCode:
            paidOrder.discountCode ??
            (appliedDiscount ? appliedDiscount.code : null),
          totalAmount: paidOrder.totalAmount ?? orderBillTotal,
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

  const historyRemainingDue = (() => {
    if (paymentMethod === "GiftCard") return remainingAfterGift;
    if (paymentMethod === "Card") {
      if (cashSplitAmount > 0) return cashSplitAmount;
      return round2(
        Math.max(
          0,
          total -
            giftUsed -
            lockedCash -
            lockedCard -
            Math.min(cardPayAmount, effectiveCardDue),
        ),
      );
    }
    if (paymentMethod === "Cash") {
      if (cardSplitFromCash > 0) return cardSplitFromCash;
      return round2(
        Math.max(
          0,
          total -
            giftUsed -
            lockedCard -
            lockedCash -
            (Number.isFinite(parsedCashAmount)
              ? Math.min(cashPayAmount, effectiveCashDue)
              : 0),
        ),
      );
    }
    return afterLocks;
  })();

  const fullPayNeedsExplicitTender =
    (paymentMethod === "Card" &&
      effectiveCardDue > 0.009 &&
      !Number.isFinite(parsedCardAmount)) ||
    (paymentMethod === "Cash" &&
      effectiveCashDue > 0.009 &&
      !Number.isFinite(parsedCashAmount));

  const completeDisabled =
    isSubmitting ||
    staffDiscountLoading ||
    (isSeatPayMode
      ? total < 0.01 ||
        fullPayNeedsExplicitTender ||
        (includeServiceCharge && autoTip > 0) ||
        (paymentMethod === "GiftCard" && giftCardBalance === null) ||
        (paymentMethod === "GiftCard" && remainingAfterGift > 0) ||
        (paymentMethod === "Cash" && cardSplitFromCash > 0) ||
        (paymentMethod === "Card" && cashSplitAmount > 0) ||
        (paymentMethod === "Card" &&
          currentCardContribution > 0 &&
          !selectedCardType)
      : billMode === "split"
        ? !splitsValid ||
          (includeServiceCharge &&
            syncedSplits.some((r) => (Number(r.tipAmount) || 0) > 0))
        : fullPayNeedsExplicitTender ||
          (includeServiceCharge && autoTip > 0) ||
          (paymentMethod === "GiftCard" && giftCardBalance === null) ||
          (paymentMethod === "GiftCard" && remainingAfterGift > 0) ||
          (paymentMethod === "Cash" && cardSplitFromCash > 0) ||
          (paymentMethod === "Card" && cashSplitAmount > 0) ||
          (paymentMethod === "Card" &&
            currentCardContribution > 0 &&
            !selectedCardType));

  // Receipt display (right column) — CustomerReceipt preview
  const selectedSeatNumbers = isSeatPayMode
    ? [seatPayNumber]
    : billMode === "split" &&
        selectedSplit &&
        Array.isArray(selectedSplit.seatNumbers) &&
        selectedSplit.seatNumbers.length
      ? selectedSplit.seatNumbers
      : billMode === "split" &&
          selectedSplit &&
          selectedSplit.seatNumber !== undefined &&
          selectedSplit.seatNumber !== null
        ? [selectedSplit.seatNumber]
        : isRemainingPayMode && openReceiptSeatKey != null
          ? [
              unsettledSeatNumbers.find(
                (n) => seatKey(n) === openReceiptSeatKey,
              ) ?? unsettledSeatNumbers[0],
            ]
          : null;

  const showSeatFilteredReceipt =
    isSeatPayMode ||
    (Array.isArray(selectedSeatNumbers) && selectedSeatNumbers.length > 0);

  const showRemainingSeatAccordions =
    isRemainingPayMode && remainingSeatDueRows.length > 0;

  const totalsBaseOrder = {
    ...order,
    subTotal: subtotal,
    discountTotal: discountAmount,
    taxTotal: totalTax,
    serviceChargeTotal,
    totalAmount: orderBillTotal,
  };

  const buildSeatReceiptPreview = (seatNum, splitRow = null) => {
    const items = filterItemsBySeat(order?.items || [], seatNum);
    const totals = proportionalOrderTotalsForItems(totalsBaseOrder, items);
    const synced = splitRow ? syncRowTenders(splitRow) : null;
    const due = splitRow
      ? round2(parseFloat(splitRow.amount) || 0)
      : Math.max(
          0,
          round2(
            getSeatRemainingDue(
              {
                items: order?.items || [],
                totalAmount: orderBillTotal,
                taxTotal: totalTax,
                serviceChargeTotal,
                discountTotal: discountAmount,
                giftcardUsedAmount: 0,
                paymentSplits: order?.paymentSplits || [],
              },
              seatNum,
            )?.due || 0,
          ),
        );
    const tipAmt = synced ? round2(Number(synced.tipAmount) || 0) : 0;
    const cashAmt = synced
      ? round2(Number(synced.cashAmount) || 0)
      : billMode === "full"
        ? 0
        : 0;
    const cardAmt = synced
      ? round2(Number(synced.cardAmount) || 0)
      : billMode === "full"
        ? 0
        : 0;
    const method =
      synced?.method ||
      (paymentMethod === "Card" && selectedCardType
        ? `Card - ${selectedCardType}`
        : paymentMethod === "GiftCard"
          ? "Gift Card"
          : paymentMethod);
    const label = formatSeatLabel(seatNum);
    const seatParty =
      String(splitRow?.name || "").trim() ||
      String(guestName || "").trim() ||
      label;
    const previewOrder = {
      ...order,
      items: order.items || [],
      subTotal: Number(totals.subTotal || 0),
      taxTotal: Number(totals.taxTotal || 0),
      discountTotal: Number(totals.discountTotal || 0),
      discountCode: appliedDiscount?.code || order.discountCode,
      serviceChargeTotal: Number(totals.serviceChargeTotal || 0),
      serviceChargeName,
      totalAmount: due > 0 ? due : Number(totals.totalAmount || 0),
      tipAmount: tipAmt,
      tipMethod: tipAmt > 0 ? synced?.tipMethod || null : null,
      giftcardUsedAmount: 0,
      cashAmount: cashAmt,
      cardAmount: cardAmt,
      paymentMethod: method,
      guestName: seatParty,
      partyName: seatParty,
      taxBreakdown: totals.taxBreakdown || order.taxBreakdown,
    };
    const jobMetadata = {
      isSplitReceipt: true,
      filterReceiptBySeat: true,
      splitSeatNumber: seatNum,
      splitSeatNumbers: [seatNum],
      splitName: seatParty,
      splitAmount: due,
      splitMethod: method,
      paymentMethod: method,
      cashAmount: cashAmt,
      cardAmount: cardAmt,
      tipAmount: tipAmt,
      giftcardUsedAmount: 0,
    };
    return { seatNumber: seatNum, key: seatKey(seatNum), label, due, previewOrder, jobMetadata };
  };

  const remainingReceiptBundles = showRemainingSeatAccordions
    ? remainingSeatDueRows.map((row) => {
        const splitRow =
          billMode === "split"
            ? paymentSplits.find((s) => {
                const seats =
                  Array.isArray(s.seatNumbers) && s.seatNumbers.length
                    ? s.seatNumbers
                    : s.seatNumber !== undefined
                      ? [s.seatNumber]
                      : [];
                return seats.some((n) => seatKey(n) === row.key);
              })
            : null;
        return buildSeatReceiptPreview(row.seatNumber, splitRow);
      })
    : [];

  const receiptItems = showSeatFilteredReceipt
    ? selectedSeatNumbers.length > 1
      ? filterItemsBySeats(order.items || [], selectedSeatNumbers)
      : filterItemsBySeat(order.items || [], selectedSeatNumbers[0])
    : order.items || [];

  const receiptTotals = showSeatFilteredReceipt
    ? proportionalOrderTotalsForItems(totalsBaseOrder, receiptItems)
    : {
        subTotal: subtotal,
        discountTotal: discountAmount,
        taxTotal: totalTax,
        serviceChargeTotal,
        totalAmount: orderBillTotal,
      };

  const receiptGift = isSeatPayMode
    ? giftUsed
    : showSeatFilteredReceipt && billMode === "split"
      ? round2(
          giftUsed *
            (subtotal > 0 ? receiptTotals.subTotal / subtotal : 1),
        )
      : giftUsed;

  const receiptTip = isSeatPayMode
    ? autoTip
    : showSeatFilteredReceipt && billMode === "split"
      ? round2(Number(selectedSynced?.tipAmount) || 0)
      : billMode === "full"
        ? autoTip
        : round2(
            syncedSplits.reduce((s, r) => s + (Number(r.tipAmount) || 0), 0),
          );

  const receiptCash = isSeatPayMode
    ? currentCashContribution +
      (paymentMethod === "Cash" && autoTip > 0 ? autoTip : 0)
    : showSeatFilteredReceipt && billMode === "split"
      ? Number(selectedSynced?.cashAmount) || 0
      : currentCashContribution;
  const receiptCard = isSeatPayMode
    ? currentCardContribution +
      (paymentMethod === "Card" && autoTip > 0 ? autoTip : 0)
    : showSeatFilteredReceipt && billMode === "split"
      ? Number(selectedSynced?.cardAmount) || 0
      : currentCardContribution;

  const previewMethod = isSeatPayMode
    ? paymentMethod === "Card" && selectedCardType
      ? `Card - ${selectedCardType}`
      : paymentMethod === "GiftCard"
        ? "Gift Card"
        : paymentMethod
    : showSeatFilteredReceipt && billMode === "split"
      ? selectedSynced?.method || "Card"
      : paymentMethod === "Card" && selectedCardType
        ? `Card - ${selectedCardType}`
        : paymentMethod;

  const currentBillPartyName = (() => {
    if (billMode === "split" && selectedSplit) {
      return String(selectedSplit.name || "").trim();
    }
    return String(guestName || "").trim();
  })();

  const currentBillPartyFallback = isSeatPayMode
    ? seatPayLabel
    : billMode === "split"
      ? seatsLabelForRow(selectedSplit) ||
        String(selectedSplit?.name || "").trim() ||
        "Selected group"
      : order.partyName || order.guestName || "";

  const receiptPartyName =
    currentBillPartyName || currentBillPartyFallback || "";

  const receiptPreviewOrder = {
    ...order,
    items: order.items || [],
    subTotal: Number(receiptTotals.subTotal || 0),
    taxTotal: Number(receiptTotals.taxTotal || 0),
    discountTotal: Number(receiptTotals.discountTotal || 0),
    discountCode: appliedDiscount?.code || order.discountCode,
    serviceChargeTotal: Number(receiptTotals.serviceChargeTotal || 0),
    serviceChargeName,
    totalAmount: isSeatPayMode
      ? total
      : Number(receiptTotals.totalAmount || 0),
    tipAmount: receiptTip,
    tipMethod: receiptTip > 0 ? tipMethod : null,
    giftcardUsedAmount: receiptGift,
    cashAmount: receiptCash,
    cardAmount: receiptCard,
    paymentMethod: previewMethod,
    guestName: receiptPartyName || order.guestName,
    partyName: receiptPartyName || order.partyName || order.guestName,
    taxBreakdown: receiptTotals.taxBreakdown || order.taxBreakdown,
  };

  const receiptJobMetadata = showSeatFilteredReceipt
    ? {
        isSplitReceipt: true,
        filterReceiptBySeat: true,
        splitSeatNumber:
          selectedSeatNumbers.length === 1 ? selectedSeatNumbers[0] : null,
        splitSeatNumbers: selectedSeatNumbers,
        splitName: receiptPartyName,
        splitAmount: isSeatPayMode
          ? total
          : round2(parseFloat(selectedSplit?.amount) || 0),
        splitMethod: previewMethod,
        paymentMethod: previewMethod,
        cashAmount: receiptCash,
        cardAmount: receiptCard,
        tipAmount: receiptTip,
        giftcardUsedAmount: receiptGift,
      }
    : null;

  const canUnmerge =
    selectedSplit &&
    ((Array.isArray(selectedSplit.mergedFrom) &&
      selectedSplit.mergedFrom.length > 0) ||
      (Array.isArray(selectedSplit.seatNumbers) &&
        selectedSplit.seatNumbers.length > 1));

  const renderItemLines = (groups) =>
    groups.map((group) => {
      const seatSubtotal = group.items.reduce(
        (sum, item) => sum + getItemLineTotal(item),
        0,
      );
      const seatQty = group.items.reduce(
        (sum, item) => sum + (Number(item.qty) || 0),
        0,
      );
      return (
        <div key={group.label} className="space-y-2">
          {showSeatHeaders ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                {group.label}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 tabular-nums">
                {seatQty} · ${seatSubtotal.toFixed(2)}
              </span>
            </div>
          ) : null}
          {group.items.map((item, idx) => {
            const modifierLines = getReceiptModifierLines(item);
            return (
              <div
                key={item.cartId || `${group.label}-${item.name}-${idx}`}
                className="text-sm"
              >
                <div className="flex justify-between gap-2 font-bold text-zinc-900">
                  <span className="min-w-0">
                    {item.isOffer ? (
                      <span className="mr-1.5 rounded bg-amber-50 px-1 py-0.5 align-middle text-[10px] font-bold text-amber-800 border border-amber-100">
                        OFFER
                      </span>
                    ) : item.productCode ? (
                      <span className="mr-1 text-orange-600">
                        {item.productCode}
                      </span>
                    ) : null}
                    {item.qty}× {item.name}
                    {item.size && item.size !== "Standard"
                      ? ` (${item.size})`
                      : ""}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    ${getItemLineTotal(item).toFixed(2)}
                  </span>
                </div>
                {modifierLines.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 pl-4 text-[11px] text-zinc-600">
                    {modifierLines.map((line, lineIdx) => (
                      <li
                        key={`${line.kind}-${lineIdx}`}
                        className={
                          line.kind === "addon-choice-item" ||
                          line.kind === "choice-item"
                            ? "pl-2 font-semibold text-sky-800"
                            : line.kind === "custom-extra"
                              ? "font-semibold text-zinc-800"
                              : "font-semibold"
                        }
                      >
                        {line.text}
                        {line.kind === "custom-extra" &&
                        line.price != null ? (
                          <span className="text-zinc-500">
                            {" "}
                            (+${Number(line.price).toFixed(2)})
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {item.notes ? (
                  <p className="mt-1 pl-4 text-[11px] font-semibold italic text-amber-800">
                    Remark: {item.notes}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    });

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col bg-zinc-50">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2 sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
          <div className="min-w-0 flex-1 text-center px-2">
            <h1 className="text-base font-black tracking-tight text-zinc-900 sm:text-lg">
              Payment
            </h1>
            {isSeatPayMode ? (
              <p className="text-[11px] font-bold text-zinc-500 truncate">
                {seatPayLabel} · Pay in full
              </p>
            ) : isRemainingPayMode ? (
              <p className="text-[11px] font-bold text-zinc-500 truncate">
                Remaining seats ·{" "}
                {billMode === "split" ? "Split by seat" : "Combined or split"}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            {order.orderNumber ? (
              <span className="inline-flex items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-base font-black tabular-nums text-zinc-900 sm:text-lg">
                #{order.orderNumber}
              </span>
            ) : (
              <span className="text-sm font-bold text-zinc-400">—</span>
            )}
          </div>
        </header>

        {/* Body: 3 columns */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* LEFT — History / Split groups */}
          <aside className="flex max-h-[34vh] w-full shrink-0 flex-col border-b border-zinc-200 bg-white lg:max-h-none lg:w-[300px] lg:border-b-0 lg:border-r xl:w-[320px]">
            <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                {billMode === "split"
                  ? "Payment groups"
                  : isRemainingPayMode
                    ? "Remaining seats"
                    : "Payment history"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">
                {billMode === "split"
                  ? "Select a seat/group to configure tender"
                  : isRemainingPayMode
                    ? "Tap a seat to preview its receipt"
                    : "Live tender breakdown"}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 custom-scrollbar">
              {billMode === "full" ? (
                <>
                  {isRemainingPayMode ? (
                    <>
                      {priorPaidAmount > 0 ? (
                        <HistoryLine
                          label="Already paid"
                          value={`$${priorPaidAmount.toFixed(2)}`}
                          tone="green"
                        />
                      ) : null}
                      {remainingSeatDueRows.map((row) => {
                        const selected = openReceiptSeatKey === row.key;
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => setOpenReceiptSeatKey(row.key)}
                            className={`w-full rounded-xl border p-3 text-left transition-all ${
                              selected
                                ? "border-orange-400 bg-orange-50/70 ring-1 ring-orange-300"
                                : "border-zinc-200 bg-white hover:border-zinc-300"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-extrabold text-zinc-900">
                                {row.label}
                              </p>
                              {selected ? (
                                <ChevronUp className="h-4 w-4 text-orange-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-zinc-400" />
                              )}
                            </div>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                              Due ${row.due.toFixed(2)}
                            </p>
                          </button>
                        );
                      })}
                      <HistoryLine
                        label="Remaining due"
                        value={`$${historyRemainingDue.toFixed(2)}`}
                        tone="amber"
                        strong
                      />
                      <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex justify-between text-sm font-black text-zinc-900">
                          <span>Pay together</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {giftUsed > 0 && (
                        <HistoryLine
                          label="Gift card"
                          value={`−$${giftUsed.toFixed(2)}`}
                          tone="green"
                        />
                      )}
                      {lockedCard > 0 && (
                        <HistoryLine
                          label="Locked card"
                          value={`$${lockedCard.toFixed(2)}`}
                        />
                      )}
                      {lockedCash > 0 && (
                        <HistoryLine
                          label="Locked cash"
                          value={`$${lockedCash.toFixed(2)}`}
                        />
                      )}
                      {paymentMethod === "Card" &&
                        (currentCardContribution > 0 || cashSplitAmount > 0) && (
                          <HistoryLine
                            label={
                              selectedCardType
                                ? `Card · ${selectedCardType}`
                                : "Card (current)"
                            }
                            value={`$${Math.min(cardPayAmount, effectiveCardDue).toFixed(2)}`}
                            tone="orange"
                          />
                        )}
                      {paymentMethod === "Cash" && (
                        <HistoryLine
                          label="Cash (current)"
                          value={`$${(
                            Number.isFinite(parsedCashAmount)
                              ? Math.min(cashPayAmount, effectiveCashDue)
                              : 0
                          ).toFixed(2)}`}
                          tone="emerald"
                        />
                      )}
                      {autoTip > 0 && (
                        <HistoryLine
                          label={`Tip (${tipMethod || "—"})`}
                          value={`$${autoTip.toFixed(2)}`}
                          tone="orange"
                        />
                      )}
                      <HistoryLine
                        label="Remaining due"
                        value={`$${historyRemainingDue.toFixed(2)}`}
                        tone="amber"
                        strong
                      />
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex justify-between text-sm font-black text-zinc-900">
                          <span>Bill total</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : giftCoversSplitBill ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-bold text-green-900">
                    Gift card covers the full bill. No payer groups needed.
                  </p>
                </div>
              ) : (
                paymentSplits.map((row, idx) => {
                  const synced = syncRowTenders(row);
                  const ready = isRowReady(row);
                  const seats = seatsLabelForRow(row);
                  const selected = selectedSplitId === row.id;
                  const mergeChecked = mergeSelectedIds.includes(row.id);
                  const focusSeatReceipt = () => {
                    const seatList =
                      Array.isArray(row.seatNumbers) && row.seatNumbers.length
                        ? row.seatNumbers
                        : row.seatNumber !== undefined
                          ? [row.seatNumber]
                          : [];
                    if (seatList.length) {
                      setOpenReceiptSeatKey(seatKey(seatList[0]));
                    }
                  };
                  const onSelectForEdit = () => {
                    setSelectedSplitId(row.id);
                    focusSeatReceipt();
                  };
                  return (
                    <div
                      key={row.id}
                      className={`rounded-xl border p-3 transition-all ${
                        selected
                          ? "border-orange-400 bg-orange-50/60 ring-1 ring-orange-300"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {splitMode === "by_seat" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMergeSelect(row.id);
                            }}
                            aria-label={
                              mergeChecked
                                ? "Uncheck for merge"
                                : "Check for merge"
                            }
                            aria-pressed={mergeChecked}
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                              mergeChecked
                                ? "border-orange-500 bg-orange-500 text-white"
                                : "border-zinc-300 bg-white text-transparent hover:border-orange-400"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={onSelectForEdit}
                          aria-pressed={selected}
                          className="min-w-0 flex-1 cursor-pointer text-left outline-none"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-extrabold text-zinc-900">
                              {String(row.name || "").trim() ||
                                `Payer ${idx + 1}`}
                            </p>
                            <span
                              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                                ready
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {ready ? "Ready" : "Needs tender"}
                            </span>
                          </div>
                          {seats ? (
                            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                              {seats}
                            </p>
                          ) : null}
                          {selected ? (
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-600">
                              Editing payment
                            </p>
                          ) : null}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-zinc-500">
                            <span className="tabular-nums text-zinc-800">
                              Due $
                              {Number(parseFloat(row.amount) || 0).toFixed(2)}
                            </span>
                            {(Number(synced.giftAmount) || 0) > 0 && (
                              <span>
                                Gift ${Number(synced.giftAmount).toFixed(2)}
                              </span>
                            )}
                            {(Number(synced.cashAmount) || 0) > 0 && (
                              <span>
                                Cash ${Number(synced.cashAmount).toFixed(2)}
                              </span>
                            )}
                            {(Number(synced.cardAmount) || 0) > 0 && (
                              <span>
                                Card ${Number(synced.cardAmount).toFixed(2)}
                                {synced.cardType ? ` · ${synced.cardType}` : ""}
                              </span>
                            )}
                            {(Number(synced.tipAmount) || 0) > 0 && (
                              <span className="text-orange-600">
                                Tip ${Number(synced.tipAmount).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {billMode === "split" && !giftCoversSplitBill && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-bold">
                  <div className="flex justify-between text-zinc-600">
                    <span>Allocated</span>
                    <span className="tabular-nums text-zinc-900">
                      ${splitAllocated.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-zinc-600">Remaining</span>
                    <span
                      className={`tabular-nums ${
                        Math.abs(splitRemaining) < 0.01
                          ? "text-emerald-600"
                          : splitRemaining > 0
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      ${splitRemaining.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* MIDDLE — Payment options */}
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/80">
            <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
              {!isSeatPayMode ? (
                <div>
                  <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                    {isRemainingPayMode ? "Remaining seats billing" : "Billing mode"}
                  </p>
                  {isRemainingPayMode ? (
                    <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-orange-700">
                        Remaining seats
                      </p>
                      <p className="mt-1 text-sm font-bold text-orange-900">
                        {remainingSeatDueRows.map((r) => r.label).join(", ") ||
                          "—"}{" "}
                        · ${total.toFixed(2)} due
                      </p>
                      {priorPaidAmount > 0 ? (
                        <p className="mt-1 text-xs font-semibold text-orange-800/80">
                          Already paid ${priorPaidAmount.toFixed(2)} · empty
                          seats ignored
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setBillMode("full")}
                      className={`min-h-[48px] rounded-xl border-2 text-sm font-black uppercase tracking-wide transition-all ${
                        billMode === "full"
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                      }`}
                    >
                      {isRemainingPayMode ? "Pay all remaining" : "Pay in full"}
                    </button>
                    <button
                      type="button"
                      disabled={!canSplitBySeat}
                      onClick={() => {
                        if (!canSplitBySeat) {
                          toast.error(
                            "Need at least 2 unpaid seats with items to split.",
                          );
                          return;
                        }
                        setBillMode("split");
                        setSplitMode("by_seat");
                        applySeatSplitRows(splitDue);
                      }}
                      className={`min-h-[48px] rounded-xl border-2 text-sm font-black uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
                        billMode === "split"
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                      }`}
                    >
                      {isRemainingPayMode ? "Split by seat" : "Split bill"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-orange-700">
                    Seat payment
                  </p>
                  <p className="mt-1 text-sm font-bold text-orange-900">
                    {seatPayLabel} · ${total.toFixed(2)} due · Pay in full only
                  </p>
                </div>
              )}

              {!isSeatPayMode && billMode === "split" ? (
                <div className="space-y-4">
                  {isRemainingPayMode ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5">
                      <p className="text-xs font-bold text-indigo-900">
                        Each remaining seat is a payment group. Select a seat on
                        the left to set cash/card, or merge seats that pay
                        together.
                      </p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode("custom");
                        const rows = [
                          emptySplitRow({ id: "split-1" }),
                          emptySplitRow({ id: "split-2" }),
                        ];
                        setPaymentSplits(rows);
                        setSelectedSplitId(rows[0].id);
                        setMergeSelectedIds([]);
                      }}
                      className={`h-10 rounded-lg text-xs font-black uppercase tracking-wide ${
                        splitMode === "custom"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500"
                      }`}
                    >
                      Custom
                    </button>
                    <button
                      type="button"
                      disabled={!canSplitBySeat}
                      onClick={() => {
                        if (!canSplitBySeat) {
                          toast.error(
                            "Need items on at least two seats (or a seat + Table) to split by seat.",
                          );
                          return;
                        }
                        setSplitMode("by_seat");
                        applySeatSplitRows(splitDue);
                      }}
                      className={`h-10 rounded-lg text-xs font-black uppercase tracking-wide disabled:opacity-40 ${
                        splitMode === "by_seat"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500"
                      }`}
                    >
                      By seat
                    </button>
                  </div>
                  )}

                  {splitMode === "by_seat" ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-zinc-500">
                        Check boxes to merge seats. Click a card body to edit
                        that group&apos;s payment.
                      </p>
                      <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={mergeSelectedGroups}
                        disabled={mergeSelectedIds.length < 2}
                        className="h-9 px-3 rounded-lg text-xs font-bold border-zinc-200 shadow-none"
                      >
                        <Merge className="mr-1.5 h-3.5 w-3.5" />
                        Merge payment
                        {mergeSelectedIds.length >= 2
                          ? ` (${mergeSelectedIds.length})`
                          : ""}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={unmergeSelectedGroup}
                        disabled={!canUnmerge}
                        className="h-9 px-3 rounded-lg text-xs font-bold border-zinc-200 shadow-none"
                      >
                        <Split className="mr-1.5 h-3.5 w-3.5" />
                        Unmerge
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Rebuild one group per seat: undoes merges and clears tenders
                          if (!applySeatSplitRows(splitDue)) return;
                          setSelectedSplitId(null);
                          setMergeSelectedIds([]);
                          toast.success(
                            "Seats reset — select a group to enter payment.",
                          );
                        }}
                        disabled={splitDue < 0.01 || !canSplitBySeat}
                        title="Unmerge all seats and clear payment amounts"
                        className="h-9 px-3 rounded-lg text-xs font-bold border-zinc-200 shadow-none"
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Recalc seats
                      </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => splitEqually(paymentSplits.length)}
                        disabled={splitDue < 0.01}
                        className="h-9 px-3 rounded-lg text-xs font-bold border-zinc-200 shadow-none"
                      >
                        Equal split
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fillRemainingOnLast}
                        disabled={splitDue < 0.01}
                        className="h-9 px-3 rounded-lg text-xs font-bold border-zinc-200 shadow-none"
                      >
                        Fill remaining
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addSplitRow}
                        className="h-9 px-3 rounded-lg text-xs font-bold border-dashed border-zinc-300 shadow-none"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add payer
                      </Button>
                    </div>
                  )}

                  {splitMode !== "by_seat" ? (
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
                  ) : null}

                  {splitMode !== "by_seat" && giftCardBalance !== null && (
                    <GiftUseEditor
                      giftCardBalance={giftCardBalance}
                      giftCardUseAmount={giftCardUseAmount}
                      total={total}
                      remainingAfterGift={splitDue}
                      remainingLabel="Remaining to Split"
                      onChangeUseAmount={updateGiftCardUseAmount}
                      hint={
                        splitDue < 0.01
                          ? "Gift card covers the full bill — no payer splits needed."
                          : "Split the remaining amount across named payers."
                      }
                    />
                  )}

                  {!giftCoversSplitBill && selectedSplit ? (
                    <SplitGroupEditor
                      row={selectedSplit}
                      synced={selectedSynced}
                      splitMode={splitMode}
                      includeServiceCharge={includeServiceCharge}
                      giftCardCode={giftCardCode}
                      setGiftCardCode={setGiftCardCode}
                      giftCardBalance={giftCardBalance}
                      isVerifyingGiftCard={isVerifyingGiftCard}
                      giftCardError={giftCardError}
                      onVerifyGift={verifyGiftCard}
                      onRemoveGift={handleRemoveGiftCard}
                      onUpdate={(patch) =>
                        updateSplitRow(selectedSplit.id, patch)
                      }
                      onSelectMethod={(m) =>
                        selectSplitPaymentMethod(selectedSplit.id, m)
                      }
                      onSwitchRemainder={(method, locks) => {
                        const pm = selectedSplit.paymentMethod || "Card";
                        const dueRaw = round2(
                          parseFloat(selectedSplit.amount) || 0,
                        );
                        const giftUse = round2(
                          Math.min(
                            Math.max(
                              0,
                              Number(selectedSplit.giftUseAmount) || 0,
                            ),
                            dueRaw,
                          ),
                        );
                        const due = round2(Math.max(0, dueRaw - giftUse));
                        const lockedCardR = round2(
                          Math.max(
                            0,
                            Number(selectedSplit.lockedCardAmount) || 0,
                          ),
                        );
                        const lockedCashR = round2(
                          Math.max(
                            0,
                            Number(selectedSplit.lockedCashAmount) || 0,
                          ),
                        );
                        const effCard = round2(
                          Math.max(0, due - lockedCashR),
                        );
                        const effCash = round2(
                          Math.max(0, due - lockedCardR),
                        );
                        const parsedCard =
                          selectedSplit.cardAmountTendered === "" ||
                          selectedSplit.cardAmountTendered == null
                            ? NaN
                            : parseFloat(selectedSplit.cardAmountTendered);
                        const parsedCash =
                          selectedSplit.amountTendered === "" ||
                          selectedSplit.amountTendered == null
                            ? NaN
                            : parseFloat(selectedSplit.amountTendered);
                        const cardPay = Number.isFinite(parsedCard)
                          ? Math.max(0, parsedCard)
                          : effCard;
                        const cashPay = Number.isFinite(parsedCash)
                          ? Math.max(0, parsedCash)
                          : effCash;

                        if (pm === "Card") {
                          const rem = round2(
                            Math.max(
                              0,
                              effCard - Math.min(cardPay, effCard),
                            ),
                          );
                          const cardPortion = round2(
                            Math.min(cardPay, effCard),
                          );
                          if (method === "Cash") {
                            updateSplitRow(selectedSplit.id, {
                              amountTendered: rem.toFixed(2),
                            });
                          } else if (method === "GiftCard") {
                            updateSplitRow(selectedSplit.id, {
                              giftUseAmount: round2(giftUse + rem),
                              cardAmountTendered: "",
                              amountTendered: "",
                            });
                          }
                          switchSplitForRemainder(selectedSplit.id, method, {
                            lockCard: cardPortion,
                            lockGift: giftUse,
                          });
                        } else if (pm === "Cash") {
                          const rem = round2(
                            Math.max(
                              0,
                              effCash - Math.min(cashPay, effCash),
                            ),
                          );
                          const cashPortion = round2(
                            Math.min(cashPay, effCash),
                          );
                          if (method === "Card") {
                            updateSplitRow(selectedSplit.id, {
                              cardAmountTendered: rem.toFixed(2),
                              cardType: "",
                            });
                          } else if (method === "GiftCard") {
                            updateSplitRow(selectedSplit.id, {
                              giftUseAmount: round2(giftUse + rem),
                              cardAmountTendered: "",
                              amountTendered: "",
                            });
                          }
                          switchSplitForRemainder(selectedSplit.id, method, {
                            lockCash: cashPortion,
                            lockGift: giftUse,
                          });
                        } else if (pm === "GiftCard") {
                          const rem = due;
                          if (method === "Card") {
                            updateSplitRow(selectedSplit.id, {
                              cardAmountTendered: rem.toFixed(2),
                              cardType: "",
                            });
                          } else if (method === "Cash") {
                            updateSplitRow(selectedSplit.id, {
                              amountTendered: rem.toFixed(2),
                            });
                          }
                          switchSplitForRemainder(selectedSplit.id, method, {
                            lockGift: giftUse,
                          });
                        }
                      }}
                      onRemove={
                        splitMode === "custom" && paymentSplits.length > 1
                          ? () => removeSplitRow(selectedSplit.id)
                          : null
                      }
                    />
                  ) : !giftCoversSplitBill ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center">
                      <Users className="mx-auto h-7 w-7 text-indigo-400" />
                      <p className="mt-2 text-sm font-bold text-zinc-700">
                        Select a payment group on the left
                      </p>
                      <p className="mt-1 text-xs font-medium text-zinc-500">
                        Click a seat card to configure Card / Cash / Gift for
                        that group only.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <FullPayOptions
                  paymentMethod={paymentMethod}
                  selectPaymentMethod={selectPaymentMethod}
                  giftCardCode={giftCardCode}
                  setGiftCardCode={setGiftCardCode}
                  giftCardBalance={giftCardBalance}
                  isVerifyingGiftCard={isVerifyingGiftCard}
                  giftCardError={giftCardError}
                  verifyGiftCard={verifyGiftCard}
                  handleRemoveGiftCard={handleRemoveGiftCard}
                  giftCardUseAmount={giftCardUseAmount}
                  updateGiftCardUseAmount={updateGiftCardUseAmount}
                  giftCardUsedPreview={giftCardUsedPreview}
                  afterLocks={afterLocks}
                  remainingAfterGift={remainingAfterGift}
                  total={total}
                  selectedCardType={selectedCardType}
                  setSelectedCardType={setSelectedCardType}
                  cardAmountTendered={cardAmountTendered}
                  setCardAmountTendered={setCardAmountTendered}
                  amountTendered={amountTendered}
                  setAmountTendered={setAmountTendered}
                  effectiveCardDue={effectiveCardDue}
                  effectiveCashDue={effectiveCashDue}
                  cardOverpay={cardOverpay}
                  cashOverpay={cashOverpay}
                  cashSplitAmount={cashSplitAmount}
                  cardSplitFromCash={cardSplitFromCash}
                  cardPayAmount={cardPayAmount}
                  cashPayAmount={cashPayAmount}
                  includeServiceCharge={includeServiceCharge}
                  switchForRemainder={switchForRemainder}
                  setPaymentMethod={setPaymentMethod}
                  canOfferServiceCharge={canOfferServiceCharge}
                  computedServiceCharge={displayServiceCharge}
                  serviceTax={serviceTax}
                  setIncludeServiceCharge={setIncludeServiceCharge}
                  isSeatPayMode={isSeatPayMode}
                  isStaffOrder={isStaffOrder}
                  appliedDiscount={appliedDiscount}
                  discountAmount={discountAmount}
                  modalDiscountPct={modalDiscountPct}
                  staffDiscountEmployee={staffDiscountEmployee}
                  availableDiscounts={availableDiscounts}
                  discountCode={discountCode}
                  setDiscountCode={setDiscountCode}
                  handleApplyDiscount={handleApplyDiscount}
                  handleRemoveDiscount={handleRemoveDiscount}
                />
              )}
            </div>
          </main>

          {/* RIGHT — Live CustomerReceipt */}
          <aside className="flex max-h-[40vh] w-full shrink-0 flex-col border-t border-zinc-200 bg-zinc-100 lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0 xl:w-[380px]">
            <div className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                Live bill
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">
                {showRemainingSeatAccordions
                  ? selectedSplit
                    ? `Preview · paying ${
                        seatsLabelForRow(selectedSplit) ||
                        String(selectedSplit.name || "").trim() ||
                        "selected group"
                      }`
                    : "Per-seat receipt preview — select a group to edit"
                  : isSeatPayMode
                    ? `${seatPayLabel} receipt`
                    : showSeatFilteredReceipt
                      ? seatsLabelForRow(selectedSplit) || "Selected seats"
                      : "Customer receipt preview"}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 custom-scrollbar">
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                  <User className="h-3.5 w-3.5" />
                  Party name
                  {isSeatPayMode ||
                  (billMode === "split" && selectedSplit) ? (
                    <span className="font-bold normal-case tracking-normal text-zinc-400">
                      · this bill
                    </span>
                  ) : null}
                </label>
                <Input
                  placeholder="Customer name for this receipt"
                  value={
                    billMode === "split" && selectedSplit
                      ? String(selectedSplit.name || "")
                      : guestName
                  }
                  onChange={(e) => {
                    const next = e.target.value;
                    if (billMode === "split" && selectedSplit) {
                      updateSplitRow(selectedSplit.id, { name: next });
                    } else {
                      setGuestName(next);
                    }
                  }}
                  disabled={billMode === "split" && !selectedSplit}
                  className="h-10 rounded-xl border-zinc-200 bg-white text-sm font-semibold focus-visible:ring-orange-500 disabled:bg-zinc-100 disabled:text-zinc-400"
                />
                <p className="text-[11px] font-medium text-zinc-500">
                  {billMode === "split" && !selectedSplit
                    ? "Select a seat/group on the left to set its party name."
                    : isSeatPayMode || billMode === "split"
                      ? "Prints as Party on this seat/group receipt only."
                      : "Prints as Party on the customer receipt."}
                </p>
              </div>
              {showRemainingSeatAccordions ? (
                <div className="space-y-2">
                  {remainingReceiptBundles.map((bundle) => {
                    const open = openReceiptSeatKey === bundle.key;
                    const inPayingGroup =
                      Array.isArray(selectedSeatNumbers) &&
                      selectedSeatNumbers.some(
                        (n) => seatKey(n) === bundle.key,
                      );
                    return (
                      <div
                        key={bundle.key}
                        className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                          open
                            ? "border-orange-300 ring-1 ring-orange-200"
                            : inPayingGroup
                              ? "border-orange-200"
                              : "border-zinc-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenReceiptSeatKey(bundle.key);
                            if (billMode === "split") {
                              const match = paymentSplits.find((s) => {
                                const seats =
                                  Array.isArray(s.seatNumbers) &&
                                  s.seatNumbers.length
                                    ? s.seatNumbers
                                    : s.seatNumber !== undefined
                                      ? [s.seatNumber]
                                      : [];
                                return seats.some(
                                  (n) => seatKey(n) === bundle.key,
                                );
                              });
                              if (match) setSelectedSplitId(match.id);
                            }
                          }}
                          className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left ${
                            open
                              ? "bg-orange-50"
                              : inPayingGroup
                                ? "bg-orange-50/50"
                                : "bg-zinc-50 hover:bg-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-extrabold text-zinc-900">
                                {bundle.label}
                              </p>
                              {inPayingGroup ? (
                                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-orange-700">
                                  Paying
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] font-bold text-zinc-500">
                              Due ${bundle.due.toFixed(2)}
                            </p>
                          </div>
                          {open ? (
                            <ChevronUp className="h-4 w-4 text-orange-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-zinc-400" />
                          )}
                        </button>
                        {open ? (
                          <div className="origin-top scale-[0.92] border-t border-zinc-100 sm:scale-100">
                            <CustomerReceipt
                              order={bundle.previewOrder}
                              restaurantDetails={
                                restaurantDetails || {
                                  name:
                                    order.restaurantName || "TASTY BITES",
                                }
                              }
                              taxBreakdown={
                                bundle.previewOrder.taxBreakdown ||
                                order.taxBreakdown ||
                                []
                              }
                              serverName={order.processedByName}
                              guestCount={order.guestCount}
                              jobMetadata={bundle.jobMetadata}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                  <div className="origin-top scale-[0.92] sm:scale-100">
                    <CustomerReceipt
                      order={receiptPreviewOrder}
                      restaurantDetails={
                        restaurantDetails || {
                          name: order.restaurantName || "TASTY BITES",
                        }
                      }
                      taxBreakdown={
                        receiptPreviewOrder.taxBreakdown ||
                        order.taxBreakdown ||
                        []
                      }
                      serverName={order.processedByName}
                      guestCount={order.guestCount}
                      jobMetadata={receiptJobMetadata}
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 gap-3 border-t border-zinc-200 bg-white p-4 sm:px-5">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-14 flex-1 rounded-xl border-zinc-200 bg-red-500 text-base font-bold text-white shadow-none hover:bg-red-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={completeDisabled}
            className="h-16 flex-[1.4] rounded-xl bg-orange-500 px-6 text-base font-bold text-white shadow-none hover:bg-orange-600"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Complete Payment"
            )}
          </Button>
        </footer>
      </div>

      {isGiftCardModalOpen && giftCardDetails && (
        <GiftCardConfirmModal
          giftCardDetails={giftCardDetails}
          onClose={() => setIsGiftCardModalOpen(false)}
          onApply={handleApplyGiftCard}
        />
      )}
    </>
  );
}

function HistoryLine({ label, value, tone, strong }) {
  const toneClass =
    tone === "green"
      ? "text-green-700"
      : tone === "orange"
        ? "text-orange-700"
        : tone === "emerald"
          ? "text-emerald-700"
          : tone === "amber"
            ? "text-amber-700"
            : "text-zinc-900";
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 ${
        strong ? "bg-amber-50/80" : "bg-white"
      }`}
    >
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
        {label}
      </span>
      <span className={`text-sm font-black tabular-nums ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

function SplitGroupEditor({
  row,
  synced,
  splitMode,
  includeServiceCharge,
  giftCardCode,
  setGiftCardCode,
  giftCardBalance,
  isVerifyingGiftCard,
  giftCardError,
  onVerifyGift,
  onRemoveGift,
  onUpdate,
  onSelectMethod,
  onSwitchRemainder,
  onRemove,
}) {
  const dueRaw = round2(parseFloat(row.amount) || 0);
  const giftUse = round2(
    Math.min(Math.max(0, Number(row.giftUseAmount) || 0), dueRaw),
  );
  const due = round2(Math.max(0, dueRaw - giftUse));
  const lockedCard = round2(Math.max(0, Number(row.lockedCardAmount) || 0));
  const lockedCash = round2(Math.max(0, Number(row.lockedCashAmount) || 0));
  const pm = row.paymentMethod || "Card";
  const effectiveCardDue = round2(Math.max(0, due - lockedCash));
  const effectiveCashDue = round2(Math.max(0, due - lockedCard));
  const parsedCard =
    row.cardAmountTendered === "" || row.cardAmountTendered == null
      ? NaN
      : parseFloat(row.cardAmountTendered);
  const parsedCash =
    row.amountTendered === "" || row.amountTendered == null
      ? NaN
      : parseFloat(row.amountTendered);
  const cardPay = Number.isFinite(parsedCard)
    ? Math.max(0, parsedCard)
    : effectiveCardDue;
  const cashPay = Number.isFinite(parsedCash)
    ? Math.max(0, parsedCash)
    : effectiveCashDue;
  const cashSplit =
    pm === "Card" &&
    effectiveCardDue > 0 &&
    Number.isFinite(parsedCard) &&
    cardPay < effectiveCardDue
      ? round2(effectiveCardDue - Math.min(cardPay, effectiveCardDue))
      : 0;
  const cardSplit =
    pm === "Cash" &&
    effectiveCashDue > 0 &&
    Number.isFinite(parsedCash) &&
    cashPay < effectiveCashDue
      ? round2(effectiveCashDue - Math.min(cashPay, effectiveCashDue))
      : 0;
  const giftRemaining =
    pm === "GiftCard" && due > 0.009 ? due : 0;
  const cardOver =
    pm === "Card" && Number.isFinite(parsedCard) && cardPay > effectiveCardDue
      ? round2(cardPay - effectiveCardDue)
      : 0;
  const cashOver =
    pm === "Cash" &&
    Number.isFinite(parsedCash) &&
    cashPay > effectiveCashDue &&
    cardSplit === 0
      ? round2(cashPay - effectiveCashDue)
      : 0;

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-orange-700">
              Paying now
            </p>
            <p className="mt-0.5 truncate text-base font-extrabold text-zinc-900">
              {String(row.name || "").trim() || "Selected group"}
            </p>
            {seatsLabelForRow(row) ? (
              <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                {seatsLabelForRow(row)}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Due
            </p>
            <p className="text-lg font-black tabular-nums text-zinc-900">
              ${dueRaw.toFixed(2)}
            </p>
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="mt-1 ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Remove payer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <Input
        placeholder="Payer name (prints as Party)"
        value={row.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="h-11 rounded-xl border-zinc-200 bg-white text-sm font-semibold"
      />

      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={row.amount}
          onChange={(e) => onUpdate({ amount: e.target.value })}
          readOnly={splitMode === "by_seat"}
          className="h-11 rounded-xl border-zinc-200 bg-white pl-9 text-sm font-semibold read-only:bg-zinc-100"
        />
      </div>

      {(lockedCard > 0 || lockedCash > 0 || giftUse > 0) && (
        <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
          {giftUse > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Gift card</span>
              <span>−${giftUse.toFixed(2)}</span>
            </div>
          )}
          {lockedCard > 0 && (
            <div className="flex justify-between">
              <span>Locked card</span>
              <span>${lockedCard.toFixed(2)}</span>
            </div>
          )}
          {lockedCash > 0 && (
            <div className="flex justify-between">
              <span>Locked cash</span>
              <span>${lockedCash.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { key: "Card", label: "Card", Icon: CreditCard },
          { key: "Cash", label: "Cash", Icon: Banknote },
          { key: "GiftCard", label: "Gift Card", Icon: Gift },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectMethod(key)}
            className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all ${
              pm === key
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-wide">
              {label}
            </span>
          </button>
        ))}
      </div>

      {pm === "Card" && (
        <div className="space-y-3">
          <CardTypePicker
            selectedCardType={row.cardType || ""}
            setSelectedCardType={(v) => onUpdate({ cardType: v })}
          />
          {row.cardType ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Amount on Card
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="number"
                      min="0"
                      value={row.cardAmountTendered}
                      onChange={(e) =>
                        onUpdate({ cardAmountTendered: e.target.value })
                      }
                      placeholder={effectiveCardDue.toFixed(2)}
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        cardAmountTendered: effectiveCardDue.toFixed(2),
                        amountTendered: "",
                      })
                    }
                    className="h-12 shrink-0 rounded-xl bg-zinc-900 px-4 font-bold text-white shadow-none hover:bg-zinc-800"
                  >
                    Exact
                  </Button>
                </div>
                <p className="text-[11px] font-medium text-zinc-500">
                  Enter less than due to split with Cash / Gift. Enter more than
                  due to add a tip.
                </p>
              </div>
              {cardOver > 0 &&
                (includeServiceCharge ? (
                  <p className="text-sm font-bold text-red-600">
                    {SERVICE_CHARGE_NO_TIP_MESSAGE}
                  </p>
                ) : (
                  <OverpayTip overpay={cardOver} method="Card" />
                ))}
              {cashSplit > 0 && (
                <PayRemainingActions
                  remaining={cashSplit}
                  currentMethod="Card"
                  onSwitch={(method) => onSwitchRemainder(method)}
                />
              )}
            </>
          ) : null}
        </div>
      )}

      {pm === "Cash" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Amount due
            </span>
            <span className="text-xl font-black text-zinc-900">
              ${effectiveCashDue.toFixed(2)}
            </span>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Cash amount
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="number"
                  min="0"
                  value={row.amountTendered}
                  onChange={(e) =>
                    onUpdate({ amountTendered: e.target.value })
                  }
                  placeholder={effectiveCashDue.toFixed(2)}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <Button
                type="button"
                onClick={() =>
                  onUpdate({ amountTendered: effectiveCashDue.toFixed(2) })
                }
                className="h-12 shrink-0 rounded-xl bg-zinc-900 px-4 font-bold text-white shadow-none hover:bg-zinc-800"
              >
                Exact
              </Button>
            </div>
            <p className="text-[11px] font-medium text-zinc-500">
              Enter less than due to pay the rest with Card / Gift.
            </p>
          </div>
          {cashOver > 0 &&
            (includeServiceCharge ? (
              <p className="text-sm font-bold text-red-600">
                {SERVICE_CHARGE_NO_TIP_MESSAGE}
              </p>
            ) : (
              <OverpayTip overpay={cashOver} method="Cash" />
            ))}
          {cardSplit > 0 && (
            <PayRemainingActions
              remaining={cardSplit}
              currentMethod="Cash"
              onSwitch={(method) => onSwitchRemainder(method)}
            />
          )}
        </div>
      )}

      {pm === "GiftCard" && (
        <div className="space-y-3">
          <GiftCardField
            giftCardCode={giftCardCode}
            setGiftCardCode={setGiftCardCode}
            giftCardBalance={giftCardBalance}
            isVerifyingGiftCard={isVerifyingGiftCard}
            giftCardError={giftCardError}
            onVerify={onVerifyGift}
            onRemove={() => {
              onRemoveGift?.();
              onUpdate({ giftUseAmount: 0 });
            }}
            label="Gift Card Code"
          />
          {giftCardBalance !== null && (
            <GiftUseEditor
              giftCardBalance={giftCardBalance}
              giftCardUseAmount={giftUse}
              total={dueRaw}
              remainingAfterGift={due}
              remainingLabel="Remaining on this group"
              onChangeUseAmount={(raw) => {
                const n = parseFloat(raw);
                const maxUse = Math.min(giftCardBalance, dueRaw);
                onUpdate({
                  giftUseAmount: Number.isFinite(n)
                    ? round2(Math.min(Math.max(0, n), maxUse))
                    : 0,
                });
              }}
              hint={
                due > 0.009
                  ? "Pay the rest with Card or Cash below."
                  : "Gift card covers this group."
              }
            />
          )}
          {giftCardBalance !== null && due < 0.01 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
              Gift card covers this seat / group
            </div>
          ) : null}
          {giftRemaining > 0 && giftCardBalance !== null && (
            <PayRemainingActions
              remaining={giftRemaining}
              currentMethod="GiftCard"
              onSwitch={(method) => onSwitchRemainder(method)}
              hideGift
            />
          )}
        </div>
      )}

      {synced && isRowReady(row) && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          Ready · {synced.method}
          {(Number(synced.tipAmount) || 0) > 0
            ? ` · tip $${Number(synced.tipAmount).toFixed(2)}`
            : ""}
        </div>
      )}
    </div>
  );
}

function FullPayOptions({
  paymentMethod,
  selectPaymentMethod,
  giftCardCode,
  setGiftCardCode,
  giftCardBalance,
  isVerifyingGiftCard,
  giftCardError,
  verifyGiftCard,
  handleRemoveGiftCard,
  giftCardUseAmount,
  updateGiftCardUseAmount,
  giftCardUsedPreview,
  afterLocks,
  remainingAfterGift,
  total,
  selectedCardType,
  setSelectedCardType,
  cardAmountTendered,
  setCardAmountTendered,
  amountTendered,
  setAmountTendered,
  effectiveCardDue,
  effectiveCashDue,
  cardOverpay,
  cashOverpay,
  cashSplitAmount,
  cardSplitFromCash,
  cardPayAmount,
  cashPayAmount,
  includeServiceCharge,
  switchForRemainder,
  setPaymentMethod,
  canOfferServiceCharge,
  computedServiceCharge,
  serviceTax,
  setIncludeServiceCharge,
  isSeatPayMode = false,
  isStaffOrder,
  appliedDiscount,
  discountAmount,
  modalDiscountPct,
  staffDiscountEmployee,
  availableDiscounts,
  discountCode,
  setDiscountCode,
  handleApplyDiscount,
  handleRemoveDiscount,
}) {
  return (
    <>
      <div>
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
          Payment method
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
              className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 transition-all ${
                paymentMethod === key
                  ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={2} />
              <span className="text-xs font-black uppercase tracking-wide">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {paymentMethod === "Card" && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-900">
            Card payment
          </h3>
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
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Amount on Card
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="number"
                          min="0"
                          value={cardAmountTendered}
                          onChange={(e) =>
                            setCardAmountTendered(e.target.value)
                          }
                          placeholder={effectiveCardDue.toFixed(2)}
                          className="h-14 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setCardAmountTendered(effectiveCardDue.toFixed(2));
                          setAmountTendered("");
                        }}
                        className="h-14 shrink-0 rounded-xl bg-zinc-900 px-4 font-bold text-white shadow-none hover:bg-zinc-800"
                      >
                        Exact
                      </Button>
                    </div>
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
                          setAmountTendered(cashSplitAmount.toFixed(2));
                        }
                        switchForRemainder(method, { lockCard: cardPortion });
                      }}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {paymentMethod === "Cash" && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-900">
            Cash payment
          </h3>
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
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Amount Due
                </span>
                <span className="text-2xl font-black text-zinc-900">
                  ${effectiveCashDue.toFixed(2)}
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Cash Amount
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="number"
                      min="0"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      placeholder={effectiveCashDue.toFixed(2)}
                      className="h-14 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      setAmountTendered(effectiveCashDue.toFixed(2))
                    }
                    className="h-14 shrink-0 rounded-xl bg-zinc-900 px-4 font-bold text-white shadow-none hover:bg-zinc-800"
                  >
                    Exact
                  </Button>
                </div>
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
                      setCardAmountTendered(cardSplitFromCash.toFixed(2));
                      setSelectedCardType("");
                    }
                    switchForRemainder(method, { lockCash: cashPortion });
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {paymentMethod === "GiftCard" && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-900">
            Gift card payment
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
            <div className="space-y-2.5 rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-green-900">
                  Available Balance
                </span>
                <span className="font-black text-green-700">
                  ${giftCardBalance.toFixed(2)}
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-green-800">
                  Amount to Use
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
                    <input
                      type="number"
                      min="0"
                      max={Math.min(giftCardBalance, afterLocks)}
                      step="0.01"
                      value={giftCardUseAmount}
                      onChange={(e) =>
                        updateGiftCardUseAmount(e.target.value)
                      }
                      className="h-11 w-full rounded-xl border border-green-200 bg-white pl-9 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      updateGiftCardUseAmount(
                        Math.min(giftCardBalance, afterLocks).toFixed(2),
                      )
                    }
                    className="h-11 shrink-0 rounded-xl bg-zinc-900 px-4 font-bold text-white shadow-none hover:bg-zinc-800"
                  >
                    Exact
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-green-900">Amount Applied</span>
                <span className="font-black text-green-700">
                  ${giftCardUsedPreview.toFixed(2)}
                </span>
              </div>
              {remainingAfterGift > 0 ? (
                <>
                  <div className="h-px bg-green-200/80" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-zinc-700">Order Total</span>
                    <span className="font-black text-zinc-900">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <PayRemainingActions
                    remaining={remainingAfterGift}
                    currentMethod="GiftCard"
                    onSwitch={(method) => {
                      if (method === "Card") {
                        setCardAmountTendered(remainingAfterGift.toFixed(2));
                        setSelectedCardType("");
                      } else if (method === "Cash") {
                        setAmountTendered(remainingAfterGift.toFixed(2));
                      }
                      setPaymentMethod(method);
                    }}
                  />
                </>
              ) : (
                <div className="flex items-center justify-between border-t border-green-200/50 pt-2 text-sm">
                  <span className="font-bold text-green-900">
                    Remaining Balance After
                  </span>
                  <span className="font-bold text-green-700">
                    ${(giftCardBalance - giftCardUsedPreview).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {canOfferServiceCharge && computedServiceCharge > 0 && (
        <label className="my-1 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <Checkbox
            checked={includeServiceCharge}
            onCheckedChange={(checked) =>
              setIncludeServiceCharge(checked === true)
            }
            className="mt-0.5 h-5 w-5 border-zinc-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900">
              Add {serviceTax?.name || "Server Charge"}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-zinc-500">
              {formatServiceTaxRate(serviceTax)} · $
              {computedServiceCharge.toFixed(2)}
              {isSeatPayMode ? " on this seat" : ""}
            </p>
          </div>
        </label>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
          {isStaffOrder ? "Staff discount" : "Apply discount"}
        </p>
        {isStaffOrder ? (
          appliedDiscount ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-green-900">
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
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-700">
                {staffDiscountEmployee
                  ? `No staff discount assigned to ${staffDiscountEmployee.name}`
                  : "Staff discount applies to the employee this order is for"}
              </p>
            </div>
          )
        ) : appliedDiscount ? (
          <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-green-900">
                    {appliedDiscount.code}
                  </p>
                  <p className="text-sm font-bold text-green-700">
                    {appliedDiscount.type === "%"
                      ? `${appliedDiscount.value}% off · -$${discountAmount.toFixed(2)}`
                      : modalDiscountPct != null && modalDiscountPct > 0
                        ? `${modalDiscountPct}% off · -$${discountAmount.toFixed(2)}`
                        : `-$${discountAmount.toFixed(2)}`}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleRemoveDiscount}
                className="h-10 shrink-0 rounded-lg border-red-200 bg-red-500 px-4 text-sm font-bold text-white shadow-none hover:bg-red-600"
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
              <SelectTrigger className="h-12 w-full rounded-xl border-zinc-200 bg-white text-sm font-semibold focus:ring-orange-500">
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
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) =>
                    setDiscountCode(e.target.value.toUpperCase())
                  }
                  placeholder="Or enter discount code..."
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <Button
                type="button"
                onClick={handleApplyDiscount}
                disabled={!discountCode.trim()}
                className="h-12 rounded-xl bg-zinc-900 px-5 font-bold text-white shadow-none hover:bg-zinc-800"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function GiftCardConfirmModal({ giftCardDetails, onClose, onApply }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 p-5">
          <h2 className="text-xl font-bold text-zinc-900">Gift Card Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700 bg-red-500 text-white hover:bg-red-600"
            aria-label="Close gift card details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="custom-scrollbar space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-zinc-500">Code</p>
              <p className="font-mono text-zinc-900">{giftCardDetails.code}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-zinc-500">
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
                <p className="text-xs font-bold uppercase text-zinc-500">
                  Card Name
                </p>
                <p className="font-semibold text-zinc-900">
                  {giftCardDetails.name}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-3 border-t border-zinc-100 p-5">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 font-bold border-zinc-200 text-zinc-700 shadow-none"
          >
            No, Cancel
          </Button>
          <Button
            onClick={onApply}
            className="flex-[2] bg-orange-500 font-bold text-white shadow-none hover:bg-orange-600"
          >
            Yes, Apply
          </Button>
        </div>
      </div>
    </div>
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
      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={giftCardCode}
            onChange={(e) => setGiftCardCode(e.target.value)}
            placeholder="Enter code..."
            disabled={giftCardBalance !== null}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-zinc-50 disabled:text-zinc-500"
          />
        </div>
        {giftCardBalance !== null ? (
          <Button
            type="button"
            onClick={onRemove}
            className="h-12 rounded-xl bg-red-600 px-4 font-bold text-white shadow-none hover:bg-red-700"
          >
            Remove
          </Button>
        ) : (
          <Button
            onClick={onVerify}
            disabled={!giftCardCode || isVerifyingGiftCard}
            className="h-12 rounded-xl bg-zinc-900 px-4 font-bold text-white shadow-none hover:bg-zinc-800"
          >
            {isVerifyingGiftCard ? (
              <Loader2 className="h-4 w-4 animate-spin" />
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
      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        Select Card Type
      </label>
      <div className="grid grid-cols-5 gap-2">
        {CARD_TYPES.map((card) => (
          <button
            key={card.name}
            type="button"
            onClick={() => setSelectedCardType(card.name)}
            className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border-2 p-2 transition-all ${
              selectedCardType === card.name
                ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                : "border-zinc-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="relative mb-1 h-6 w-10">
              <Image
                src={card.image}
                alt={card.name}
                fill
                className="object-contain"
              />
            </div>
            <span className="text-center text-[10px] font-bold leading-tight text-zinc-600">
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
      <span className="text-sm font-bold text-orange-900">Tip ({method})</span>
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
    <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-green-900">Gift Card Balance</span>
        <span className="font-black text-green-700">
          ${giftCardBalance.toFixed(2)}
        </span>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-green-800">
          Amount to Use from Gift Card
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
            <input
              type="number"
              min="0"
              max={Math.min(giftCardBalance, total)}
              step="0.01"
              value={giftCardUseAmount}
              onChange={(e) => onChangeUseAmount(e.target.value)}
              className="h-11 w-full rounded-xl border border-green-200 bg-white pl-9 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <Button
            type="button"
            onClick={() =>
              onChangeUseAmount(Math.min(giftCardBalance, total).toFixed(2))
            }
            className="h-11 shrink-0 rounded-xl bg-zinc-900 px-4 font-bold text-white shadow-none hover:bg-zinc-800"
          >
            Exact
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-green-200/50 pt-2 text-sm">
        <span className="font-bold text-orange-600">{remainingLabel}</span>
        <span className="font-black text-orange-600">
          ${remainingAfterGift.toFixed(2)}
        </span>
      </div>
      {hint && <p className="text-xs font-semibold text-zinc-600">{hint}</p>}
    </div>
  );
}

function PayRemainingActions({
  remaining,
  currentMethod,
  onSwitch,
  hideGift = false,
}) {
  if (!(remaining > 0)) return null;

  const options = [
    { key: "Card", label: "Rest with Card", Icon: CreditCard },
    { key: "Cash", label: "Rest with Cash", Icon: Banknote },
    { key: "GiftCard", label: "Rest with Gift Card", Icon: Gift },
  ].filter(
    (opt) =>
      opt.key !== currentMethod && !(hideGift && opt.key === "GiftCard"),
  );

  return (
    <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-orange-800">
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
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-orange-200 bg-white px-2 text-sm font-bold text-zinc-800 hover:border-orange-500 hover:bg-orange-50"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-left leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
