import React from "react";
import "./print.css";
import moment from "moment";
import { isDirectSaleOrder } from "@/utils/orderDisplay";

function isStyleOption(opt, preparationStyle) {
  const value = String(opt || "").trim();
  const lower = value.toLowerCase();
  if (lower.startsWith("style:")) return true;
  if (preparationStyle && lower === String(preparationStyle).trim().toLowerCase()) {
    return true;
  }
  return false;
}

/**
 * Hardware-independent Bar / Counter ticket for small thermal printers.
 * Intentionally omits prices, tax, and payment info.
 */
const BarReceipt = ({
  order,
  barItems = [],
  restaurantName,
  serverName,
  guestCount,
  specialNote,
  isReprint = false,
}) => {
  const items = barItems?.length ? barItems : [];
  if (!order || !items.length) return null;

  const { orderNumber, tableNo, guestName, partyName, createdAt } = order;
  const note = specialNote || order.specialNote;
  const partyLabel = partyName || guestName || (isDirectSaleOrder(order) ? "Walk-in" : "");
  const directSale = isDirectSaleOrder(order);
  const covers =
    guestCount != null && guestCount !== ""
      ? Number(guestCount)
      : null;

  return (
    <div
      className="thermal-receipt receipt-font p-3 bg-white text-black"
      style={{ width: "var(--print-width, 80mm)" }}
    >
      <div className="text-center mb-2">
        {restaurantName && (
          <div className="text-[12px] receipt-bold uppercase mb-1">
            {restaurantName}
          </div>
        )}
        <h1 className="text-base receipt-bold underline mb-1 uppercase">
          Bar Receipt
        </h1>
        {isReprint && (
          <div className="text-[10px] receipt-bold uppercase text-center mb-1">
            *** REPRINT ***
          </div>
        )}
      </div>

      <div className="text-left text-[12px] space-y-0.5 mb-2">
        {(partyLabel || covers != null) && (
          <div className="receipt-bold uppercase">
            Party: {partyLabel || covers}
            {covers != null && partyLabel ? ` (${covers})` : ""}
          </div>
        )}
        {!directSale && (
          <div className="receipt-bold uppercase">
            Table: {tableNo || "Takeaway"}
          </div>
        )}
      </div>

      <div className="receipt-divider border-t border-black border-solid my-2" />

      <div className="text-left text-[11px] space-y-0.5 mb-3">
        <div>
          <span className="receipt-bold">Sent:</span>{" "}
          {moment(createdAt || undefined).format("MMM DD, YYYY [at] hh:mm A")}
        </div>
        {!directSale && tableNo && (
          <div>
            <span className="receipt-bold">Table:</span> {tableNo}
            {covers != null ? `, ${covers} Cover${covers === 1 ? "" : "s"}` : ""}
          </div>
        )}
        <div>
          <span className="receipt-bold">Order:</span> {orderNumber}
        </div>
        {partyLabel && (
          <div>
            <span className="receipt-bold">Party Name:</span> {partyLabel}
          </div>
        )}
        {serverName && (
          <div>
            <span className="receipt-bold">Server:</span> {serverName}
          </div>
        )}
      </div>

      {note && (
        <>
          <div className="text-[11px] mb-2">
            <div className="receipt-bold uppercase mb-0.5">Notes</div>
            <div>{note}</div>
          </div>
        </>
      )}

      <div className="receipt-divider border-t-2 border-black border-solid mb-2" />

      <div className="receipt-bold uppercase text-xs mb-2">Drinks</div>

      <div className="text-sm space-y-3 mb-2">
        {items.map((item, itemIdx) => {
          const extras = (item.options || []).filter(
            (opt) => !isStyleOption(opt, item.preparationStyle)
          );
          const seatBits = [];
          if (item.seat) seatBits.push(item.seat);
          if (Array.isArray(item.seats)) {
            item.seats.filter(Boolean).forEach((s) => seatBits.push(s));
          }

          return (
            <div key={itemIdx}>
              <div className="flex items-start text-xs">
                <span className="receipt-bold mr-2 whitespace-nowrap">
                  {item.qty} x
                </span>
                <span className="receipt-bold leading-tight">
                  {item.productCode ? `${item.productCode} ` : ""}
                  {item.name}
                  {item.size && item.size !== "Standard"
                    ? ` (${item.size})`
                    : ""}
                  {seatBits.length > 0
                    ? ` (${seatBits.map((s) => `S${String(s).replace(/^S/i, "")}`).join(", ")})`
                    : ""}
                </span>
              </div>
              {item.course && (
                <div className="pl-7 text-[10px] italic">
                  Course: {item.course}
                </div>
              )}
              {item.preparationStyle && (
                <div className="pl-7 text-[11px] font-semibold italic">
                  + {item.preparationStyle}
                </div>
              )}
              {extras.length > 0 && (
                <div className="pl-7 mt-0.5 space-y-0.5">
                  {extras.map((opt, oIdx) => (
                    <div key={oIdx} className="text-[11px] font-semibold italic">
                      + {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="receipt-divider border-t-2 border-black border-solid mt-3 mb-1" />
      <div className="text-center text-[10px] mt-1 italic">
        *** BAR #{orderNumber} ***
      </div>
    </div>
  );
};

export default BarReceipt;
