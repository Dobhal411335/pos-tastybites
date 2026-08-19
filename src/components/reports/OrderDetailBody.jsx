"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getReceiptModifierLines } from "@/utils/productChoices";

export const STATUS_BADGE = {
  PAID: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  WAIVED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const cellBorder = "border border-zinc-300 px-3 py-2";

export function money(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy, h:mm a");
}

export function dash(value) {
  if (value == null || value === "") return "—";
  return value;
}

export function DetailItem({ label, value, highlight = false }) {
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        highlight
          ? "bg-orange-50 border border-orange-200"
          : "bg-zinc-50 border border-zinc-200"
      }`}
    >
      <p
        className={`text-[11px] font-bold uppercase tracking-wider ${
          highlight ? "text-orange-700" : "text-zinc-500"
        }`}
      >
        {label}
      </p>
      <p className={`mt-0.5 font-semibold ${highlight ? "text-orange-950" : "text-zinc-900"}`}>
        {value}
      </p>
    </div>
  );
}

function TotalsRow({ label, value, muted = false, bold = false, negative = false }) {
  return (
    <div
      className={`flex justify-between gap-6 ${
        bold
          ? "font-bold text-orange-950 bg-orange-50 -mx-3 px-3 py-2 rounded-md mt-1"
          : ""
      }`}
    >
      <span className={bold ? "" : muted ? "text-zinc-500 font-medium" : "text-black"}>
        {label}
      </span>
      <span className={`tabular-nums ${bold ? "" : "text-zinc-800"}`}>
        {negative && Number(value) > 0 ? `-${money(value).slice(1)}` : money(value)}
      </span>
    </div>
  );
}

function tipLabel(order) {
  const tip = Number(order.tipAmount || 0);
  if (!(tip > 0)) return "Tip";
  const raw = String(order.tipMethod || "").trim();
  if (/gift/i.test(raw)) return "Tip (Gift Card)";
  if (/cash/i.test(raw)) return "Tip (Cash)";
  if (/card/i.test(raw)) return "Tip (Card)";
  const methodStr = String(order.paymentMethod || "");
  if (/gift\s*card/i.test(methodStr) && !/cash|card\s*-/i.test(methodStr)) {
    return "Tip (Gift Card)";
  }
  if (/cash/i.test(methodStr) && !/card/i.test(methodStr)) return "Tip (Cash)";
  if (/card/i.test(methodStr) && !/cash/i.test(methodStr)) return "Tip (Card)";
  if (/cash/i.test(methodStr)) return "Tip (Cash)";
  if (/card/i.test(methodStr)) return "Tip (Card)";
  return "Tip";
}

function cardPaymentLabel(paymentMethod) {
  const methodStr = String(paymentMethod || "");
  const cardLabelMatch = methodStr.match(/Card\s*-\s*([^+/]+)/i);
  return cardLabelMatch ? `Card (${cardLabelMatch[1].trim()})` : "Card";
}

function itemLineTotal(item) {
  return Number(item.price || 0) * Number(item.qty || 0);
}

function isExtraLine(item) {
  return /^extra$/i.test(String(item?.size || ""));
}

export default function OrderDetailBody({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const taxBreakdown = Array.isArray(order.taxBreakdown) ? order.taxBreakdown : [];
  const discount = Number(order.discountTotal || 0);
  const taxTotal = Number(order.taxTotal || 0);
  const serviceCharge = Number(order.serviceChargeTotal || 0);
  const tip = Number(order.tipAmount || 0);
  const giftUsed = Number(order.giftcardUsedAmount || 0);
  const cash = Number(order.cashAmount || 0);
  const card = Number(order.cardAmount || 0);
  const orderTotal = Number(order.totalAmount || 0);
  const grandTotal = orderTotal + tip;
  const discountLabel =
    order.source === "STAFF" || String(order.discountCode || "").toUpperCase() === "STAFF"
      ? "Staff Discount"
      : order.discountCode
        ? `Discount (${order.discountCode})`
        : "Discount";
  const hasPaymentSplit = giftUsed > 0 || cash > 0 || card > 0;

  return (
    <div className="mt-4 space-y-5 text-sm">
      {order.status === "WAIVED" || order.status === "CANCELLED" ? (
        <div
          className={`rounded-lg border px-3 py-3 ${
            order.status === "WAIVED"
              ? "bg-amber-50 border-amber-300"
              : "bg-red-50 border-red-200"
          }`}
        >
          <p
            className={`text-[11px] font-bold uppercase tracking-wider ${
              order.status === "WAIVED" ? "text-amber-800" : "text-red-700"
            }`}
          >
            {order.status === "WAIVED" ? "Order waived" : "Order cancelled"}
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {order.status === "WAIVED"
              ? `Admin waived this order${order.waivedByName ? ` (${order.waivedByName})` : ""}.`
              : "This order was cancelled."}
          </p>
          <p className="mt-1 text-sm text-zinc-800">
            <span className="font-semibold">Reason: </span>
            {order.waiveReason?.trim()
              ? order.waiveReason
              : "No reason was recorded."}
          </p>
        </div>
      ) : null}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-2">
          Order details
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {order.orderNumber ? (
            <DetailItem label="Order #" value={order.orderNumber} highlight />
          ) : null}
          <DetailItem label="Date" value={formatDateTime(order.createdAt)} />
          <DetailItem label="Table" value={dash(order.tableNo)} highlight />
          <DetailItem
            label="Guest"
            value={dash(order.partyName || order.guestName)}
            highlight
          />
          {order.guestCount != null && order.guestCount !== "" ? (
            <DetailItem label="Guests" value={String(order.guestCount)} />
          ) : null}
          <DetailItem label="Employee" value={dash(order.processedByName)} />
          <DetailItem label="Status" value={order.status} highlight />
          <DetailItem label="Payment" value={dash(order.paymentMethod)} highlight />
          <DetailItem label="Payment status" value={order.paymentStatus} highlight />
          {order.source ? <DetailItem label="Source" value={order.source} /> : null}
          {order.contactNumber ? (
            <DetailItem
              label="Phone"
              value={`${order.guestCountryCode || ""} ${order.contactNumber}`.trim()}
            />
          ) : null}
          {order.guestEmail ? <DetailItem label="Email" value={order.guestEmail} /> : null}
          {order.staffOrderReason ? (
            <DetailItem label="Staff reason" value={order.staffOrderReason} />
          ) : null}
          {order.waiveReason ? (
            <DetailItem label="Waive reason" value={order.waiveReason} highlight />
          ) : null}
          {order.specialNote ? (
            <DetailItem label="Note" value={order.specialNote} />
          ) : null}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-2">
          Items
        </h3>
      <div className="overflow-x-auto rounded-md border border-zinc-300">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${cellBorder} text-[11px] font-bold uppercase tracking-wider text-orange-800 bg-orange-100`}>
                Item
              </TableHead>
              <TableHead className={`${cellBorder} text-[11px] font-bold uppercase tracking-wider text-orange-800 bg-orange-100 text-right w-18`}>
                Qty
              </TableHead>
              <TableHead className={`${cellBorder} text-[11px] font-bold uppercase tracking-wider text-orange-800 bg-orange-100 text-right w-24`}>
                Price
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className={`${cellBorder} text-sm text-zinc-500`}>
                  No items on this order.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => {
                const extra = isExtraLine(item);
                const modifierLines = getReceiptModifierLines(item);
                const even = index % 2 === 1;
                return (
                  <TableRow
                    key={item.cartId || `${item.name}-${index}`}
                    className={`hover:bg-orange-50/70 ${even ? "bg-amber-50/80" : "bg-white"}`}
                  >
                    <TableCell className={`${cellBorder} align-top ${even ? "bg-amber-50/80" : ""}`}>
                      <div className="font-medium text-zinc-900">
                        {item.productCode ? (
                          <span className="text-orange-600 mr-1.5">{item.productCode}</span>
                        ) : null}
                        {item.name}
                        {item.size && item.size !== "Standard" ? (
                          <span className="text-zinc-500 font-normal"> ({item.size})</span>
                        ) : null}
                        {extra ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Extra
                          </span>
                        ) : null}
                        {item.isOffer ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                            Offer
                          </span>
                        ) : null}
                      </div>
                      {item.category ? (
                        <div className="text-[11px] text-zinc-500 mt-0.5">{item.category}</div>
                      ) : null}
                      {modifierLines.length > 0 ? (
                        <div className="mt-1 space-y-0.5 text-[12px] text-zinc-600 italic">
                          {modifierLines.map((line, lineIdx) => (
                            <div key={`${line.kind}-${lineIdx}`}>{line.text}</div>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className={`${cellBorder} text-right align-top tabular-nums ${even ? "bg-amber-50/80" : ""}`}>
                      {item.qty}
                    </TableCell>
                    <TableCell className={`${cellBorder} text-right align-top tabular-nums font-medium ${even ? "bg-amber-50/80" : ""}`}>
                      {money(itemLineTotal(item))}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      </div>

      <div className="w-full rounded-lg border border-zinc-200 bg-white p-3 space-y-1.5 text-sm">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-2">
          Bill summary
        </h3>
        <TotalsRow label="Subtotal" value={order.subTotal} muted />
        <TotalsRow label={discountLabel} value={discount} muted negative={discount > 0} />
        {taxBreakdown.length > 0 ? (
          taxBreakdown.map((tax, idx) => (
            <TotalsRow
              key={tax.taxId || `${tax.name}-${idx}`}
              label={tax.name ? `${tax.name}${tax.rate ? ` (${tax.rate}%)` : ""}` : "Tax"}
              value={tax.amount}
              muted
            />
          ))
        ) : (
          <TotalsRow label="Tax" value={taxTotal} muted />
        )}
        <TotalsRow
          label={order.serviceChargeName || "Service charge"}
          value={serviceCharge}
          muted
        />
        <TotalsRow label={tipLabel(order)} value={tip} muted />
        {hasPaymentSplit ? (
          <div className="pt-1 space-y-1.5 border-t border-dashed border-zinc-300">
            {giftUsed > 0 ? (
              <TotalsRow
                label={
                  order.giftcardCode
                    ? `Gift Card `
                    : "Gift Card"
                }
                value={giftUsed}
                muted
              />
            ) : null}
            {cash > 0 ? <TotalsRow label="Cash" value={cash} muted /> : null}
            {card > 0 ? (
              <TotalsRow label={cardPaymentLabel(order.paymentMethod)} value={card} muted />
            ) : null}
          </div>
        ) : null}
        <TotalsRow label="Total" value={grandTotal} bold />
      </div>

      {order.status ? (
        <Badge
          variant="outline"
          className={`text-[10px] ${STATUS_BADGE[order.status] || "bg-zinc-50 text-zinc-600"}`}
        >
          {order.status}
        </Badge>
      ) : null}
    </div>
  );
}
