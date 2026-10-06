import React from "react";
import "./print.css";
import moment from "moment";
import { isOfferItem } from "@/utils/offerDetails";
import { getReceiptModifierLines } from "@/utils/productChoices";
import { isDirectSaleOrder, formatTableLocation } from "@/utils/orderDisplay";

/**
 * Hardware-independent Kitchen Order Ticket for 80mm thermal paper.
 * Intentionally omits prices, tax, and payment info.
 */
const KitchenOrderTicket = ({
  order,
  kotItems = [],
  restaurantName,
  serverName,
  guestCount,
  specialNote,
  isReprint = false,
}) => {
  const items = kotItems && kotItems.length > 0 ? kotItems : (order?.items || []);
  if (!order || !items.length) {
    return (
      <div
        className="thermal-receipt receipt-font p-6 bg-white text-black text-center"
        style={{ width: "var(--print-width, 80mm)" }}
      >
        <div className="text-[11px] receipt-bold uppercase mb-1">
          {restaurantName || order?.restaurantName || "TASTY BITES"}
        </div>
        <h1 className="text-sm receipt-bold underline mb-2 uppercase">KOT</h1>
        <p className="text-xs text-zinc-500 font-medium">No items found for this KOT ticket.</p>
      </div>
    );
  }

  const { orderNumber, tableNo, guestName, partyName, createdAt } = order;
  const tableLabel = formatTableLocation(
    tableNo,
    order.floorName || order.floor?.name,
  );
  const note = specialNote || order.specialNote;
  const partyLabel =
    partyName || guestName || (isDirectSaleOrder(order) ? "Take-Away" : "");
  const directSale = isDirectSaleOrder(order);
  const brand = restaurantName || "TASTY BITES";
  const resolvedGuestCount =
    guestCount != null && guestCount !== ""
      ? guestCount
      : order.guestCount != null && order.guestCount !== ""
        ? order.guestCount
        : null;

  const normalizeSeat = (item) => {
    if (item?.seatNumber != null && item.seatNumber !== "") {
      const n = Number(item.seatNumber);
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
    }
    if (item?.seat != null && item.seat !== "" && !/^table$/i.test(String(item.seat))) {
      const n = Number(item.seat);
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
    }
    return null;
  };

  const showSeatHeaders = items.some((it) => normalizeSeat(it) != null);
  const seatGroups = (() => {
    const map = new Map();
    for (const item of items) {
      const seat = normalizeSeat(item);
      const key = seat == null ? "table" : String(seat);
      if (!map.has(key)) {
        map.set(key, {
          seat,
          label: seat == null ? "TABLE" : `SEAT ${seat}`,
          byCategory: {},
        });
      }
      const g = map.get(key);
      const cat = isOfferItem(item) ? "Offers" : item.category || "ITEMS";
      if (!g.byCategory[cat]) g.byCategory[cat] = [];
      g.byCategory[cat].push(item);
    }
    const numbered = [...map.values()]
      .filter((g) => g.seat != null)
      .sort((a, b) => a.seat - b.seat);
    const table = map.get("table");
    return table ? [...numbered, table] : numbered;
  })();

  return (
    <div
      className="thermal-receipt receipt-font p-3 bg-white text-black"
      style={{ width: "var(--print-width, 80mm)" }}
    >
      <div className="text-center mb-3">
        <div className="text-[11px] receipt-bold uppercase mb-1">
          {brand}
        </div>
        <h1 className="text-base receipt-bold underline mb-1 uppercase">
          KOT
        </h1>
        {isReprint && (
          <div className="text-xs receipt-bold tracking-wider text-center mb-1">
            *** REPRINT ***
          </div>
        )}

        <div className="text-sm receipt-bold mb-1">
          {directSale
            ? partyLabel || "Take-Away"
            : tableLabel
              ? `${tableLabel}`
              : "Takeaway / No Table"}
        </div>
      </div>

      <div className="receipt-divider border-t-2 border-black border-solid my-2" />

      <div className="text-left text-[11px] space-y-0.5 mb-3">
        <div>
          <span className="receipt-bold">Order #:</span> {orderNumber}
        </div>
        <div>
          <span className="receipt-bold">Sent:</span>{" "}
          {moment(createdAt || undefined).format("MMM DD, YYYY [at] hh:mm A")}
        </div>
        {serverName && (
          <div>
            <span className="receipt-bold">Server:</span> {serverName}
          </div>
        )}
        {resolvedGuestCount != null && (
          <div>
            <span className="receipt-bold">Guests:</span> {resolvedGuestCount}
          </div>
        )}
        {partyLabel && (
          <div>
            <span className="receipt-bold">Party:</span> {partyLabel}
          </div>
        )}
      </div>

      <div className="receipt-divider border-t-2 border-black border-solid mb-3" />

      <div className="text-sm">
        {seatGroups.map((seatGroup, seatIdx) => (
          <div key={seatGroup.label || seatIdx} className={seatIdx > 0 ? "mt-3" : ""}>
            {showSeatHeaders ? (
              <div className="mb-2">
                <div className="receipt-seat-rule" />
                <div className="receipt-seat-label">
                  {seatGroup.label}:
                </div>
              </div>
            ) : null}
            {Object.entries(seatGroup.byCategory).map(([group, groupItems], idx) => (
              <div key={`${seatGroup.label}-${group}-${idx}`} className="mb-3">
                <div className="receipt-category-title">
                  {group}
                </div>
                <div className="space-y-3 mt-2">
                  {groupItems.map((item, itemIdx) => {
                    const modifierLines = getReceiptModifierLines(item);

                    return (
                      <div key={itemIdx}>
                        <div className="flex items-start">
                          <span className="receipt-bold mr-2 text-xs whitespace-nowrap">
                            {item.qty} ×
                          </span>
                          <span className="receipt-bold text-xs leading-tight">
                            {item.productCode ? `${item.productCode} ` : ""}
                            {item.name || item.productName || "Item"}
                            {item.size && item.size !== "Standard"
                              ? ` (${item.size})`
                              : ""}
                          </span>
                        </div>
                        {item.course && (
                          <div className="pl-7 text-[10px] italic">
                            Course: {item.course}
                          </div>
                        )}
                        {modifierLines.length > 0 && (
                          <div className="pl-7 mt-1 space-y-0.5">
                            {modifierLines.map((line, lineIdx) => (
                              <div
                                key={`${line.kind}-${lineIdx}`}
                                className={`text-[11px] font-semibold ${
                                  line.kind === "addon-choice-item" ||
                                  line.kind === "choice-item"
                                    ? "pl-2"
                                    : "italic"
                                }`}
                              >
                                {line.text}
                              </div>
                            ))}
                          </div>
                        )}
                        {(item.notes || item.specialInstructions) && (
                          <div className="pl-7 mt-0.5 text-[10px] italic receipt-bold text-zinc-800">
                            Note: {item.notes || item.specialInstructions}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {note && (
        <>
          <div className="receipt-divider border-t border-black border-dashed my-2" />
          <div className="p-2 border-2 border-black border-dashed rounded text-xs bg-zinc-50">
            <div className="receipt-bold uppercase text-[10px] tracking-wider mb-0.5">
              SPECIAL INSTRUCTIONS / NOTES:
            </div>
            <div className="receipt-bold text-xs">{note}</div>
          </div>
        </>
      )}

      <div className="receipt-divider border-t-2 border-black border-solid mt-3 mb-1" />
      <div className="text-center text-[10px] mt-1 italic">
        *** KOT #{orderNumber} ***
      </div>
    </div>
  );
};

export default KitchenOrderTicket;
