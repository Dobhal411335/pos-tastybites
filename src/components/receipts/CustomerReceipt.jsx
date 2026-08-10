import React from "react";
import "./print.css";
import moment from "moment";

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
    giftcardCode,
    giftcardUsedAmount = 0,
    totalAmount = 0,
    tipAmount = 0,
    paymentMethod,
    guestName,
    tableNo,
    createdAt,
  } = order;

  const restName = restaurantDetails?.name || "TASTY BITES";
  const restAddress =
    restaurantDetails?.address ||
    "345 Main Street South\nExeter, ON, Canada, N0M 1S6";
  const restPhone = restaurantDetails?.phone || "519 235 0050";
  const hstNumber = restaurantDetails?.hstNumber || "740811146";
  const thankYou =
    restaurantDetails?.thankYouMessage || "Thank You! Please Come Again!";
  const grandTotal = Number(totalAmount || 0) + Number(tipAmount || 0);

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
          {guestCount != null && (
            <span>
              <span className="text-zinc-500">Guests:</span>{" "}
              <span className="receipt-bold">{guestCount}</span>
            </span>
          )}
        </div>
        {guestName && (
          <div>
            <span className="text-zinc-500">Party:</span>{" "}
            <span className="receipt-bold">{guestName}</span>
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
            {item.preparationStyle &&
              !(item.options || []).some((o) =>
                String(o).toLowerCase().startsWith("style:")
              ) && (
              <div className="pl-3 text-[9px] mt-0.5">
                + Style: {item.preparationStyle}
              </div>
            )}
            {item.options?.length > 0 && (
              <div className="pl-3 text-[9px] mt-0.5">
                {item.options.map((opt, oIdx) => (
                  <div key={oIdx}>+ {opt}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="receipt-divider" />

      <div className="mb-3 flex flex-col items-end space-y-1 text-[11px]">
        <div className="w-full max-w-[160px] flex justify-between">
          <span className="text-zinc-500">Subtotal:</span>
          <span className="receipt-bold">${Number(subTotal).toFixed(2)}</span>
        </div>
        {Number(discountTotal) > 0 && (
          <div className="w-full max-w-[160px] flex justify-between">
            <span className="text-zinc-500">
              Discount{discountCode ? ` (${discountCode})` : ""}:
            </span>
            <span className="receipt-bold">
              -${Number(discountTotal).toFixed(2)}
            </span>
          </div>
        )}
        {(() => {
          const hstAmount =
            taxBreakdown.length > 0
              ? taxBreakdown.reduce((sum, t) => sum + Number(t.amount || 0), 0)
              : Number(taxTotal || 0);
          if (hstAmount <= 0) return null;
          return (
            <div className="w-full max-w-[160px] flex justify-between">
              <span className="text-zinc-500">HST:</span>
              <span className="receipt-bold">${hstAmount.toFixed(2)}</span>
            </div>
          );
        })()}
        {Number(tipAmount) > 0 && (
          <div className="w-full max-w-[160px] flex justify-between">
            <span className="text-zinc-500">Tip:</span>
            <span className="receipt-bold">${Number(tipAmount).toFixed(2)}</span>
          </div>
        )}
        {Number(giftcardUsedAmount) > 0 && (
          <div className="w-full max-w-[160px] flex justify-between">
            <span className="text-zinc-500">
              Gift Card:
            </span>
            <span className="receipt-bold">
              -${Number(giftcardUsedAmount).toFixed(2)}
            </span>
          </div>
        )}
        {paymentMethod && (
          <div className="w-full max-w-[160px] flex justify-between">
            <span className="text-zinc-500">Paid via:</span>
            <span className="receipt-bold">{paymentMethod}</span>
          </div>
        )}
      </div>

      <div className="receipt-divider" />

      <div className="flex justify-between text-sm receipt-bold mb-3">
        <span>TOTAL</span>
        <span>${grandTotal.toFixed(2)}</span>
      </div>

      <div className="receipt-divider" />
      <div className="text-center text-[10px] space-y-1">
        <div className="receipt-bold">{thankYou}</div>
      </div>
    </div>
  );
};

export default CustomerReceipt;
