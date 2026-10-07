import React from "react";
import "./print.css";
import moment from "moment";
import { isOfferItem } from "@/utils/offerDetails";
import {
  getReceiptModifierLines,
  getItemLineTotal,
} from "@/utils/productChoices";
import { shouldShowTable, formatTableNumbersWithFloor } from "@/utils/orderDisplay";
import {
  filterItemsBySeat,
  filterItemsBySeats,
  proportionalOrderTotalsForItems,
  resolveSplitReceiptSeatFilter,
} from "@/lib/orders/seatHelpers";

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

const Row = ({ label, value, bold = false, muted = false }) => (
  <div className="w-full flex justify-between gap-2">
    <span className={muted ? "text-zinc-500" : bold ? "receipt-bold" : ""}>
      {label}
    </span>
    <span className={bold ? "receipt-bold" : ""}>{value}</span>
  </div>
);

/**
 * Hardware-independent customer receipt template for 80mm thermal paper.
 * Used by PrintJob preview and (optionally) browser print fallback.
 */
const CustomerReceipt = ({
  order,
  restaurantDetails,
  taxBreakdown = [],
  serverName,
  guestCount,
  isReprint = false,
  jobMetadata = null,
}) => {
  if (!order) return null;

  const meta = jobMetadata && typeof jobMetadata === "object" ? jobMetadata : {};
  const isSplitReceipt = Boolean(meta.isSplitReceipt);
  const splitName = meta.splitName ? String(meta.splitName) : "";
  const splitAmount = Number(meta.splitAmount) || 0;
  const splitMethod = String(meta.splitMethod || meta.paymentMethod || "").trim();

  const seatFilter = resolveSplitReceiptSeatFilter(meta, order);
  const allOrderItems = order.items || [];
  const items = seatFilter.filter
    ? Array.isArray(seatFilter.seatNumbers) && seatFilter.seatNumbers.length > 1
      ? filterItemsBySeats(allOrderItems, seatFilter.seatNumbers)
      : filterItemsBySeat(allOrderItems, seatFilter.seatNumber)
    : allOrderItems;
  const seatScopedTotals =
    seatFilter.filter && isSplitReceipt
      ? proportionalOrderTotalsForItems(order, items)
      : null;

  const {
    orderNumber,
    invoiceNumber,
    subTotal = 0,
    taxTotal = 0,
    discountTotal = 0,
    discountCode,
    giftcardUsedAmount = 0,
    totalAmount = 0,
    tipAmount = 0,
    tipMethod,
    serviceChargeTotal = 0,
    serviceChargeName,
    paymentMethod,
    cashAmount,
    cardAmount,
    guestName,
    tableNo,
    createdAt,
  } = order;

  const resolvedSubTotal = seatScopedTotals?.subTotal ?? subTotal;
  const resolvedTaxTotal = seatScopedTotals?.taxTotal ?? taxTotal;
  const resolvedDiscountTotal = seatScopedTotals?.discountTotal ?? discountTotal;
  const resolvedServiceChargeTotal =
    seatScopedTotals?.serviceChargeTotal ?? serviceChargeTotal;
  const resolvedTotalAmount = isSplitReceipt
    ? Number(meta.splitAmount) || seatScopedTotals?.totalAmount || totalAmount
    : seatScopedTotals?.totalAmount ?? totalAmount;
  // Prefer an explicit customer party name over the seat/group label on split bills.
  const partyLabel = isSplitReceipt
    ? order.partyName || guestName || splitName
    : order.partyName || guestName;
  const floorName = order.floorName || order.floor?.name;
  const tableLabel = formatTableNumbersWithFloor(tableNo, floorName);

  const restName = restaurantDetails?.name || "TASTY BITES";
  const restAddress =
    restaurantDetails?.address ||
    "345 Main Street South\nExeter, ON, Canada, N0M 1S6";
  const restPhone = restaurantDetails?.phone || "519 235 0050";
  const hstNumber = restaurantDetails?.hstNumber || "740811146";
  const thankYou =
    restaurantDetails?.thankYouMessage || "Thank You! Please Come Again!";

  const resolvedTaxBreakdown = (() => {
    if (seatScopedTotals?.taxBreakdown?.length) {
      return seatScopedTotals.taxBreakdown;
    }
    const fromProp = Array.isArray(taxBreakdown) ? taxBreakdown : [];
    const fromOrder = Array.isArray(order.taxBreakdown)
      ? order.taxBreakdown
      : [];
    const lines = fromProp.length ? fromProp : fromOrder;
    return lines;
  })();

  const hstAmount = (() => {
    if (resolvedTaxBreakdown.length > 0) {
      return resolvedTaxBreakdown.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0,
      );
    }
    return Number(resolvedTaxTotal || 0);
  })();

  const resolvedGuests =
    guestCount != null && guestCount !== ""
      ? guestCount
      : order.guestCount != null && order.guestCount !== ""
        ? order.guestCount
        : null;

  const tip = Number(isSplitReceipt ? meta.tipAmount ?? 0 : tipAmount || 0);
  const discount = Number(resolvedDiscountTotal || 0);
  const serviceCharge = Number(resolvedServiceChargeTotal || 0);
  const orderTotal = Number(resolvedTotalAmount || 0);
  const grandTotal = orderTotal + tip;

  const discountPct = (() => {
    if (order.discountPercent != null && Number(order.discountPercent) > 0) {
      return Number(order.discountPercent);
    }
    const numSub = Number(resolvedSubTotal || 0);
    const numDisc = Number(discount || 0);
    if (numSub > 0 && numDisc > 0) {
      return Math.round((numDisc / numSub) * 1000) / 10;
    }
    return null;
  })();

  const discountLabel = (() => {
    if (discountPct != null && discountPct > 0) {
      return `Discount (${discountPct}%)`;
    }
    if (discount > 0) {
      return `Discount ($${discount.toFixed(2)})`;
    }
    return "Discount";
  })();

  const totalHstRate = (() => {
    const breakdownRatesSum = resolvedTaxBreakdown.reduce(
      (sum, t) => sum + (Number(t.rate) || 0),
      0,
    );
    if (breakdownRatesSum > 0) {
      return Math.round(breakdownRatesSum * 10) / 10;
    }
    const taxableBase = Math.max(
      0,
      Number(resolvedSubTotal || 0) - Number(discount || 0),
    );
    if (taxableBase > 0 && hstAmount > 0) {
      return Math.round((hstAmount / taxableBase) * 1000) / 10;
    }
    if (
      Number(resolvedSubTotal || 0) > 0 &&
      (hstAmount > 0 || Number(resolvedTaxTotal || 0) > 0)
    ) {
      return (
        Math.round(
          (Number(resolvedTaxTotal || hstAmount) / Number(resolvedSubTotal)) *
            1000,
        ) / 10
      );
    }
    return null;
  })();

  const hstLabel =
    totalHstRate != null && totalHstRate > 0
      ? `HST (${totalHstRate}%)`
      : "HST";

  const methodStr = String(
    isSplitReceipt
      ? splitMethod || meta.paymentMethod || ""
      : order.paymentMethod || paymentMethod || "",
  ).trim();
  const cash = isSplitReceipt
    ? Number(meta.cashAmount ?? 0)
    : Number(cashAmount || 0);
  const card = isSplitReceipt
    ? Number(meta.cardAmount ?? 0)
    : Number(cardAmount || 0);
  const giftUsed = isSplitReceipt
    ? 0
    : Number(
        order.giftcardUsedAmount ??
          order.giftCardUsedAmount ??
          order.giftCardUsed ??
          giftcardUsedAmount ??
          0,
      );
  const cardLabelMatch = methodStr.match(/Card\s*-\s*([^+/]+)/i);
  const cardLabel = cardLabelMatch
    ? `Card (${cardLabelMatch[1].trim()})`
    : "Card";

  const tipLabel = (() => {
    if (!(tip > 0)) return "Tip";
    const raw = String(tipMethod || "").trim();
    if (/gift/i.test(raw)) return "Tip (Gift Card)";
    if (/cash/i.test(raw)) return "Tip (Cash)";
    if (/card/i.test(raw)) return "Tip (Card)";
    // Fallback from payment method when tipMethod missing on older orders
    if (/gift\s*card/i.test(methodStr) && !/cash|card\s*-/i.test(methodStr)) {
      return "Tip (Gift Card)";
    }
    if (/cash/i.test(methodStr) && !/card/i.test(methodStr)) return "Tip (Cash)";
    if (/card/i.test(methodStr) && !/cash/i.test(methodStr)) return "Tip (Card)";
    if (/cash/i.test(methodStr)) return "Tip (Cash)";
    if (/card/i.test(methodStr)) return "Tip (Card)";
    return "Tip";
  })();

  const hasPaymentSplit =
    giftUsed > 0 || cash > 0 || card > 0 || Boolean(methodStr);

  const normalizeSeat = (item) => {
    if (item?.seatNumber != null && item.seatNumber !== "") {
      const n = Number(item.seatNumber);
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
    }
    if (
      item?.seat != null &&
      item.seat !== "" &&
      !/^table$/i.test(String(item.seat))
    ) {
      const n = Number(item.seat);
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
    }
    return null;
  };

  const showSeatHeaders =
    !seatFilter.filter && items.some((it) => normalizeSeat(it) != null);
  const seatGroups = (() => {
    const map = new Map();
    for (const item of items) {
      const seat = normalizeSeat(item);
      const key = seat == null ? "table" : String(seat);
      if (!map.has(key)) {
        map.set(key, {
          seat,
          label: seat == null ? "Table" : `Seat ${seat}`,
          items: [],
        });
      }
      map.get(key).items.push(item);
    }
    const numbered = [...map.values()]
      .filter((g) => g.seat != null)
      .sort((a, b) => a.seat - b.seat);
    const table = map.get("table");
    return table ? [...numbered, table] : numbered;
  })();

  const renderReceiptItem = (item, idx) => {
    const modifierLines = getReceiptModifierLines(item);
    return (
      <div key={idx} className="mb-2 text-[11px]">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 pr-1">
            {item.qty > 1 ? `${item.qty} × ` : ""}
            {item.productCode ? `${item.productCode} ` : ""}
            {item.name}
            {item.size && item.size !== "Standard" ? (
              <span className="text-[9px]"> ({item.size})</span>
            ) : null}
          </div>
          <span className="shrink-0">
            ${getItemLineTotal(item).toFixed(2)}
          </span>
        </div>
        {modifierLines.length > 0 ? (
          <div className="pl-3 mt-0.5 space-y-0.5 text-[9px] text-zinc-600">
            {modifierLines.map((line, lineIdx) => (
              <div
                key={`${line.kind}-${lineIdx}`}
                className={
                  line.kind === "addon-choice-item" ||
                  line.kind === "choice-item"
                    ? "pl-2 font-semibold"
                    : line.kind === "custom-extra"
                      ? "flex justify-between gap-2"
                      : ""
                }
              >
                <span>{line.text}</span>
                {line.kind === "custom-extra" && line.price != null ? (
                  <span className="shrink-0">
                    +${Number(line.price).toFixed(2)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {item.notes ? (
          <div className="pl-3 mt-0.5 text-[9px] italic text-zinc-700">
            Note: {item.notes}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className="thermal-receipt receipt-font text-xs p-3 bg-white"
      style={{ width: "var(--print-width, 80mm)" }}
    >
      <div className="text-center mb-3">
        <h1 className="text-base receipt-bold mb-1 uppercase tracking-wide">
          {restName}
        </h1>
        {isReprint && (
          <div className="text-xs receipt-bold tracking-wider text-center mb-1">
            *** REPRINT ***
          </div>
        )}
        <div className="text-[9px] text-nowrap">{restAddress}</div>
        <div className="text-[9px] mt-0.5">{restPhone}</div>
        <div className="mt-2 text-[10px]">
          {moment(createdAt || undefined).format("MMM DD, YYYY [at] hh:mm A")}
        </div>
      </div>

      <div className="receipt-divider" />

      <div className="mb-3 space-y-1 text-[10px]">
        <div className="flex justify-between gap-2">
          <span>
            <span className="text-zinc-500">Order #:</span>{" "}
            <span className="receipt-bold">{orderNumber}</span>
          </span>
          <span>
            <span className="text-zinc-500">Invoice No:</span>{" "}
            <span className="receipt-bold">{invoiceNumber || "—"}</span>
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>
            <span className="text-zinc-500">Server:</span>{" "}
            <span className="receipt-bold">{serverName || "Server"}</span>
          </span>
          {resolvedGuests != null && (
            <span>
              <span className="text-zinc-500">Guests:</span>{" "}
              <span className="receipt-bold">{resolvedGuests}</span>
            </span>
          )}
        </div>
        <div className="flex justify-between gap-2">
          {shouldShowTable(order) && (
            <span>
              <span className="text-zinc-500">Table:</span>{" "}
              <span className="receipt-bold">{tableLabel}</span>
            </span>
          )}
        </div>
        {(partyLabel || !shouldShowTable(order)) && (
          <div>
            <span className="text-zinc-500">Party:</span>{" "}
            <span className="receipt-bold">{partyLabel || "Talk Away"}</span>
          </div>
        )}
        <div>
          <span className="text-zinc-500">HST:</span>{" "}
          <span className="receipt-bold">{hstNumber}</span>
        </div>
      </div>

      <div className="receipt-divider" />

      <div className="mb-3">
        <div className="flex justify-between receipt-bold mb-2 text-[10px]">
          <span>ITEM</span>
          <span>AMOUNT</span>
        </div>
        <div className="receipt-divider" />
        {seatGroups.map((group, gIdx) => {
          const regularItems = group.items.filter((item) => !isOfferItem(item));
          const offerItems = group.items.filter((item) => isOfferItem(item));
          return (
            <div key={group.label || gIdx} className={gIdx > 0 ? "mt-3" : ""}>
              {showSeatHeaders ? (
                <div className="mb-2">
                  <div className="receipt-seat-rule" />
                  <div className="receipt-seat-label" style={{ fontSize: 11 }}>
                    {group.label}:
                  </div>
                </div>
              ) : null}
              {regularItems.map((item, idx) =>
                renderReceiptItem(item, `${group.label}-r-${idx}`),
              )}
              {offerItems.length > 0 ? (
                <div className={regularItems.length > 0 ? "mt-2" : ""}>
                  {regularItems.length > 0 && (
                    <div className="receipt-divider mb-2" />
                  )}
                  <div className="receipt-category-title">
                    Offers
                  </div>
                  {offerItems.map((item, idx) =>
                    renderReceiptItem(item, `${group.label}-o-${idx}`),
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="receipt-divider" />

      {/* Totals */}
      <div className="mb-2 space-y-1 text-[11px]">
        <Row label="Subtotal" value={money(resolvedSubTotal)} muted />
        {discount > 0 && (
          <>
            <Row
              label={discountLabel}
              value={`-${money(discount).slice(1)}`}
              muted
            />
            <Row
              label="Net Amount"
              value={money(
                Math.max(0, Number(resolvedSubTotal || 0) - discount),
              )}
              muted
            />
          </>
        )}
        {(hstAmount > 0 || (discount > 0 && totalHstRate > 0)) && (
          <Row label={hstLabel} value={money(hstAmount)} muted />
        )}
        {serviceCharge > 0 && (
          <Row
            label={serviceChargeName || "Server Charge"}
            value={money(serviceCharge)}
            muted
          />
        )}
        {tip > 0 && (
          <>
            <Row label="Order Total" value={money(orderTotal)} muted />
            <Row label={tipLabel} value={money(tip)} muted />
          </>
        )}
      </div>

      <div className="receipt-divider border-t border-black my-1" />
      <div className="mb-2 text-[12px]">
        <Row label="TOTAL" value={money(grandTotal)} bold />
      </div>

      {isSplitReceipt ? (
        <>
          <div className="receipt-divider border-t border-black border-dashed my-1.5" />
          <div className="mb-2 space-y-1 text-[11px]">
            <div className="receipt-bold uppercase text-[10px] mb-1">
              This Slip
            </div>
            {splitName ? (
              <Row label="Payer" value={splitName} />
            ) : null}
            <Row
              label={
                /cash/i.test(splitMethod)
                  ? "Cash"
                  : cardLabelMatch
                    ? cardLabel
                    : /card/i.test(splitMethod)
                      ? "Card"
                      : splitMethod || "Paid"
              }
              value={money(splitAmount || cash || card)}
              bold
            />
            <Row
              label={`Bill total (#${orderNumber})`}
              value={money(grandTotal)}
              muted
            />
          </div>
        </>
      ) : hasPaymentSplit ? (
        <>
          <div className="receipt-divider border-t border-black border-dashed my-1.5" />
          <div className="mb-2 space-y-1 text-[11px]">
            <div className="receipt-bold uppercase text-[10px] mb-1">
              Payment Method
            </div>
            {giftUsed > 0 && (
              <Row label="Gift Card" value={money(giftUsed)} />
            )}
            {cash > 0 && <Row label="Cash" value={money(cash)} />}
            {card > 0 && <Row label={cardLabel} value={money(card)} />}
            {giftUsed <= 0 && cash <= 0 && card <= 0 && methodStr && (
              <Row
                label={
                  methodStr.includes('+')
                    ? methodStr
                    : /gift/i.test(methodStr)
                    ? "Gift Card"
                    : /cash/i.test(methodStr)
                    ? "Cash"
                    : /card/i.test(methodStr)
                    ? cardLabel
                    : methodStr
                }
                value={money(grandTotal > 0 ? grandTotal : orderTotal)}
              />
            )}
          </div>
        </>
      ) : null}

      <div className="receipt-divider" />
      <div className="text-center text-[10px] space-y-1">
        <div className="receipt-bold">{thankYou}</div>
      </div>
    </div>
  );
};

export default CustomerReceipt;
