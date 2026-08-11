import React from "react";
import "./print.css";
import moment from "moment";

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
}) => {
  if (!order || !kotItems.length) return null;

  const { orderNumber, tableNo, guestName, partyName, createdAt } = order;
  const note = specialNote || order.specialNote;
  const partyLabel = partyName || guestName;

  const groupedItems = kotItems.reduce((acc, item) => {
    const groupName = item.category || "ITEMS";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {});

  return (
    <div
      className="thermal-receipt receipt-font p-3 bg-white text-black"
      style={{ width: "var(--print-width, 80mm)" }}
    >
      <div className="text-center mb-3">
        {restaurantName && (
          <div className="text-[10px] receipt-bold uppercase mb-1">
            {restaurantName}
          </div>
        )}
        <h1 className="text-base receipt-bold underline mb-2 uppercase">
          Kitchen Order Ticket
        </h1>

        <div className="text-lg receipt-bold mb-1">
          {tableNo ? `Table: ${tableNo}` : "Takeaway / No Table"}
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
        {guestCount != null && (
          <div>
            <span className="receipt-bold">Guests:</span> {guestCount}
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
        {Object.entries(groupedItems).map(([group, items], idx) => (
          <div key={idx} className="mb-4">
            <div className="receipt-bold uppercase mb-2 pb-1 border-b border-black text-xs">
              {group}
            </div>
            <div className="space-y-3 mt-2">
              {items.map((item, itemIdx) => (
                <div key={itemIdx}>
                  <div className="flex items-start">
                    <span className="receipt-bold mr-2 text-xs whitespace-nowrap">
                      {item.qty} ×
                    </span>
                    <span className="receipt-bold text-xs leading-tight">
                      {item.productCode ? `${item.productCode} ` : ""}
                      {item.name}
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
                  {item.preparationStyle &&
                    !(item.options || []).some((o) =>
                      String(o).toLowerCase().startsWith("style:")
                    ) && (
                    <div className="pl-7 text-[11px] font-semibold italic">
                      + Style: {item.preparationStyle}
                    </div>
                  )}
                  {item.options?.length > 0 && (
                    <div className="pl-7 mt-1 space-y-0.5">
                      {item.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="text-[11px] font-semibold italic"
                        >
                          + {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {note && (
        <>
          <div className="receipt-divider border-t border-black border-dashed" />
          <div className="text-xs mt-2">
            <span className="receipt-bold">NOTES:</span> {note}
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
