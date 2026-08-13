import React from "react";
import "./print.css";
import moment from "moment";

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
}) => {
  if (!order) return null;

  const {
    orderNumber,
    items = [],
    subTotal = 0,
    taxTotal = 0,
    discountTotal = 0,
    discountCode,
    giftcardUsedAmount = 0,
    totalAmount = 0,
    tipAmount = 0,
    tipMethod,
    paymentMethod,
    cashAmount,
    cardAmount,
    guestName,
    tableNo,
    createdAt,
  } = order;
  const partyLabel = order.partyName || guestName;

  const restName = restaurantDetails?.name || "TASTY BITES";
  const restAddress =
    restaurantDetails?.address ||
    "345 Main Street South\nExeter, ON, Canada, N0M 1S6";
  const restPhone = restaurantDetails?.phone || "519 235 0050";
  const hstNumber = restaurantDetails?.hstNumber || "740811146";
  const thankYou =
    restaurantDetails?.thankYouMessage || "Thank You! Please Come Again!";

  const hstAmount =
    taxBreakdown.length > 0
      ? taxBreakdown.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      : Number(taxTotal || 0);

  const tip = Number(tipAmount || 0);
  const discount = Number(discountTotal || 0);
  const giftUsed = Number(giftcardUsedAmount || 0);
  const cash = Number(cashAmount || 0);
  const card = Number(cardAmount || 0);
  const orderTotal = Number(totalAmount || 0);
  const grandTotal = orderTotal + tip;

  const methodStr = String(paymentMethod || "");
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
    giftUsed > 0 || cash > 0 || card > 0 || Boolean(paymentMethod);

  return (
    <div
      className="thermal-receipt receipt-font text-xs p-3 bg-white"
      style={{ width: "var(--print-width, 80mm)" }}
    >
      <div className="text-center mb-3">
        <h1 className="text-base receipt-bold mb-1 uppercase tracking-wide">
          {restName}
        </h1>
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
            <span className="text-zinc-500">Server:</span>{" "}
            <span className="receipt-bold">{serverName || "Server"}</span>
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>
            <span className="text-zinc-500">Table:</span>{" "}
            <span className="receipt-bold">{tableNo || "N/A"}</span>
          </span>
        </div>
        {partyLabel && (
          <div>
            <span className="text-zinc-500">Party:</span>{" "}
            <span className="receipt-bold">{partyLabel}</span>
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
        {items.map((item, idx) => (
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
                ${(Number(item.price) * Number(item.qty)).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="receipt-divider" />

      {/* Totals + payment */}
      <div className="mb-2 space-y-1 text-[11px]">
        <Row label="Subtotal" value={money(subTotal)} muted />
        {discount > 0 && (
          <Row
            label="Discount"
            value={`-${money(discount).slice(1)}`}
            muted
          />
        )}
        {hstAmount > 0 && <Row label="HST" value={money(hstAmount)} muted />}
        {tip > 0 && <Row label={tipLabel} value={money(tip)} muted />}
      </div>

      {hasPaymentSplit && (
        <>
          <div className="receipt-divider" />
          <div className="mb-2 space-y-1 text-[11px]">
            <div className="receipt-bold uppercase text-[10px] mb-1">
              Payment Method
            </div>
            {giftUsed > 0 && (
              <Row label="Gift Card" value={money(giftUsed)} />
            )}
            {cash > 0 && <Row label="Cash" value={money(cash)} />}
            {card > 0 && <Row label={cardLabel} value={money(card)} />}
            {giftUsed <= 0 && cash <= 0 && card <= 0 && paymentMethod && (
              <Row label="Paid via" value={paymentMethod} />
            )}
          </div>
        </>
      )}

      <div className="mb-2 pt-1 text-[11px]">
        <Row label="TOTAL" value={money(grandTotal)} bold />
      </div>

      <div className="receipt-divider" />
      <div className="text-center text-[10px] space-y-1">
        <div className="receipt-bold">{thankYou}</div>
      </div>
    </div>
  );
};

export default CustomerReceipt;
