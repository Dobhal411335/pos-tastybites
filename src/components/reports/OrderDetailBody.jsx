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
import {
  formatMergedSeatLabel,
  groupItemsBySeat,
} from "@/lib/orders/seatHelpers";
import {
  getItemLineTotal,
  getReceiptModifierLines,
} from "@/utils/productChoices";
import {
  getOrderSourceLabel,
  getOrderTypeBadgeClass,
  getOrderTypeLabel,
} from "@/utils/orderDisplay";
import { countryCodes } from "@/utils/countryCodes";

export const STATUS_BADGE = {
  PAID: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  WAIVED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export const PAYMENT_STATUS_BADGE = {
  PAID: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-800 border-amber-300",
  UNPAID: "bg-zinc-100 text-zinc-600 border-zinc-200",
  REFUNDED: "bg-red-50 text-red-700 border-red-200",
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

export function formatPhone(contactNumber, countryCode) {
  let code = (countryCode || "").trim();
  let num = (contactNumber || "").trim();
  if (!num) return "—";

  if (code && num.startsWith(code)) {
    num = num.slice(code.length).trim();
  } else if (!code && num.startsWith("+")) {
    const matchedCode = countryCodes.find((c) => num.startsWith(c.code));
    if (matchedCode) {
      code = matchedCode.code;
      num = num.slice(code.length).trim();
    }
  }

  // Only format as US number if the country code is +1 or empty
  const digits = num.replace(/\D/g, "");
  if (!code || code === "+1") {
    if (digits.length === 10) {
      num = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      num = `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
  }

  if (code) {
    return `${code} ${num}`;
  }
  return num;
}

export function formatSpecialNote(note) {
  if (!note) return note;
  return note.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (match, h, m) => {
    const hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  });
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
  if (item?.lineTotal != null && Number.isFinite(Number(item.lineTotal))) {
    return Number(item.lineTotal);
  }
  return getItemLineTotal(item);
}

function isExtraLine(item) {
  return /^extra$/i.test(String(item?.size || ""));
}

function seatLabel(split) {
  if (split?.seatLabel) return split.seatLabel;
  if (Array.isArray(split?.seatNumbers) && split.seatNumbers.length > 0) {
    return formatMergedSeatLabel(split.seatNumbers);
  }
  if (split?.seatNumber != null) return formatMergedSeatLabel([split.seatNumber]);
  return null;
}

function ItemRows({ items, startIndex = 0 }) {
  return items.map((item, index) => {
    const extra = isExtraLine(item);
    const modifierLines = getReceiptModifierLines(item);
    const even = (startIndex + index) % 2 === 1;
    return (
      <TableRow
        key={item.cartId || `${item.name}-${startIndex + index}`}
        className={`hover:bg-orange-50/70 ${even ? "bg-amber-50/80" : "bg-white"}`}
      >
        <TableCell className={`${cellBorder} align-top ${even ? "bg-amber-50/80" : ""}`}>
          <div className="font-medium text-zinc-900">
            {item.productCode ? (
              <span className="text-orange-600 mr-1.5">{item.productCode}</span>
            ) : null}
            {item.name}
            {item.size && item.size !== "Standard" ? (
              <span className="text-red-500 font-semibold"> ({item.size})</span>
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
                <div key={`${line.kind}-${lineIdx}`}>
                  {line.text}
                  {line.kind === "custom-extra" && Number(line.price) > 0
                    ? ` (${money(line.price)})`
                    : ""}
                </div>
              ))}
            </div>
          ) : null}
          {item.notes ? (
            <div className="mt-1 text-[12px] font-medium italic text-amber-800">
              Remark: {item.notes}
            </div>
          ) : null}
        </TableCell>
        <TableCell
          className={`${cellBorder} text-right align-top tabular-nums ${even ? "bg-amber-50/80" : ""}`}
        >
          {item.qty}
        </TableCell>
        <TableCell
          className={`${cellBorder} text-right align-top tabular-nums font-medium ${even ? "bg-amber-50/80" : ""}`}
        >
          {money(itemLineTotal(item))}
          {Array.isArray(item.customExtras) && item.customExtras.length > 0 ? (
            <div className="mt-1 space-y-0.5 text-[10px] font-normal text-zinc-500">
              {item.customExtras.map((extra, extraIdx) => {
                const qty = Math.max(1, Math.floor(Number(extra.qty) || 1));
                const line =
                  Math.round((Number(extra.price) || 0) * qty * 100) / 100;
                return (
                  <div key={`${extra.name}-${extraIdx}`}>
                    + {extra.name}
                    {qty > 1 ? ` ×${qty}` : ""}
                    {line > 0 ? ` (${money(line)})` : ""}
                  </div>
                );
              })}
            </div>
          ) : null}
        </TableCell>
      </TableRow>
    );
  });
}

const SOURCE_BADGE_CLASS = {
  POS: "bg-emerald-100 text-emerald-800 border-emerald-200",
  WALK_IN: "bg-orange-100 text-orange-800 border-orange-200",
  TAKEAWAY: "bg-orange-100 text-orange-800 border-orange-200",
  STAFF: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ONLINE: "bg-sky-100 text-sky-800 border-sky-200",
};

export function OrderSourceBadge({ order, source, className = "" }) {
  const sourceValue = String(source || order?.source || "POS").toUpperCase();
  const label =
    order?.orderTypeLabel ||
    order?.sourceLabel ||
    getOrderSourceLabel(sourceValue) ||
    getOrderTypeLabel(order || { source: sourceValue });
  const badgeClass =
    SOURCE_BADGE_CLASS[sourceValue] ||
    getOrderTypeBadgeClass(order || { source: sourceValue });
  return (
    <span
      className={`inline-flex items-center border font-semibold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md w-max ${badgeClass} ${className}`}
    >
      {label}
    </span>
  );
}

export default function OrderDetailBody({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const taxBreakdown = Array.isArray(order.taxBreakdown) ? order.taxBreakdown : [];
  const discount = Number(order.discountTotal || 0);
  const taxTotal = Number(order.taxTotal || 0);
  const hstAmount =
    taxBreakdown.length > 0
      ? taxBreakdown.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      : taxTotal;
  const serviceCharge = Number(order.serviceChargeTotal || 0);
  const tip = Number(order.tipAmount || 0);
  const giftUsed = Number(
    order.giftcardUsedAmount != null
      ? order.giftcardUsedAmount
      : order.giftCard || 0
  );
  const cash = Number(
    order.cashAmount != null ? order.cashAmount : order.cash || 0
  );
  const card = Number(
    order.cardAmount != null ? order.cardAmount : order.card || 0
  );
  const orderTotal = Number(order.totalAmount || 0);
  const grandTotal = orderTotal + tip;
  const discountLabel =
    order.source === "STAFF" || String(order.discountCode || "").toUpperCase() === "STAFF"
      ? "Staff Discount"
      : order.discountCode
        ? `Discount (${order.discountCode}${
            order.discountPercent != null ? ` ${order.discountPercent}%` : ""
          })`
        : order.discountPercent != null
          ? `Discount (${order.discountPercent}%)`
          : "Discount";
  const hasPaymentSplit = giftUsed > 0 || cash > 0 || card > 0;
  const paymentSplits = Array.isArray(order.paymentSplits)
    ? order.paymentSplits
    : [];
  const seatGroups =
    Array.isArray(order.seatGroups) && order.seatGroups.length > 0
      ? order.seatGroups
      : groupItemsBySeat(items);
  const showSeatGroups =
    seatGroups.length > 1 ||
    items.some((item) => item?.seatNumber != null && item?.seatNumber !== "");
  const paidAmount =
    order.paidAmount != null
      ? Number(order.paidAmount)
      : paymentSplits.reduce((sum, split) => sum + (Number(split.amount) || 0), 0);
  const remainingDue =
    order.remainingDue != null
      ? Number(order.remainingDue)
      : order.paymentStatus === "PARTIAL" || order.paymentStatus === "UNPAID"
        ? Math.max(0, orderTotal - paidAmount)
        : 0;

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
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
            Order details
          </h3>
          <OrderSourceBadge order={order} />
        </div>
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
          <DetailItem label="Payment" value={dash(order.paymentMethod || order.paymentLabel)} highlight />
          <DetailItem
            label="Payment status"
            value={
              order.paymentStatus === "PARTIAL" && remainingDue > 0
                ? `PARTIAL · ${money(remainingDue)} due`
                : order.paymentStatus
            }
            highlight
          />
          <DetailItem
            label="Order type"
            value={
              order.orderTypeLabel ||
              order.sourceLabel ||
              getOrderTypeLabel(order) ||
              getOrderSourceLabel(order.source)
            }
            highlight
          />
          {order.contactNumber ? (
            <DetailItem
              label="Phone"
              value={formatPhone(order.contactNumber, order.guestCountryCode)}
            />
          ) : null}
          {order.guestEmail ? <DetailItem label="Email" value={order.guestEmail} /> : null}
          {order.staffOrderReason ? (
            <DetailItem label="Staff reason" value={order.staffOrderReason} />
          ) : null}
          {Array.isArray(order.releasedSeats) && order.releasedSeats.length > 0 ? (
            <DetailItem
              label="Released seats"
              value={formatMergedSeatLabel(order.releasedSeats)}
            />
          ) : null}
          {order.waiveReason ? (
            <DetailItem label="Waive reason" value={order.waiveReason} highlight />
          ) : null}
          {order.specialNote ? (
            <DetailItem label="Note" value={formatSpecialNote(order.specialNote)} />
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
            ) : showSeatGroups ? (
              seatGroups.flatMap((group, groupIdx) => {
                const header = (
                  <TableRow
                    key={`seat-header-${group.seatNumber ?? "table"}-${groupIdx}`}
                    className="hover:bg-transparent"
                  >
                    <TableCell
                      colSpan={3}
                      className={`${cellBorder} bg-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-700`}
                    >
                      {group.label || formatMergedSeatLabel([group.seatNumber])}
                      {group.subtotal != null ? (
                        <span className="ml-2 font-semibold normal-case tracking-normal tabular-nums text-zinc-500">
                          {money(group.subtotal)}
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
                const priorCount = seatGroups
                  .slice(0, groupIdx)
                  .reduce((sum, g) => sum + (g.items?.length || 0), 0);
                return [header, ...ItemRows({ items: group.items || [], startIndex: priorCount })];
              })
            ) : (
              <ItemRows items={items} />
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
        {hstAmount > 0 && <TotalsRow label="HST" value={hstAmount} muted />}
        {(serviceCharge > 0 || order.serviceChargeName) ? (
          <TotalsRow
            label={order.serviceChargeName || "Service charge"}
            value={serviceCharge}
            muted
          />
        ) : null}
        {tip > 0 ? <TotalsRow label={tipLabel(order)} value={tip} muted /> : null}
        {hasPaymentSplit ? (
          <div className="pt-1 space-y-1.5 border-t border-dashed border-zinc-300">
            {giftUsed > 0 ? (
              <TotalsRow
                label={
                  order.giftcardCode
                    ? `Gift Card (${order.giftcardCode})`
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
        {paymentSplits.length > 0 ? (
          <div className="pt-1.5 space-y-1.5 border-t border-dashed border-violet-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
              Named splits
            </p>
            {paymentSplits
              .filter((split) => {
                // Hide empty / cash-stripped rows with no remaining tender.
                const c = Number(split.cashAmount) || 0;
                const d = Number(split.cardAmount) || 0;
                const g =
                  Number(split.giftAmount || split.tenders?.giftCard) || 0;
                const amt = Number(split.amount) || 0;
                if (c <= 0 && d <= 0 && g <= 0 && amt <= 0) return false;
                return true;
              })
              .map((split, idx) => {
              const seats = seatLabel(split);
              const splitTip = Number(split.tipAmount) || 0;
              const cashAmt = Number(split.cashAmount) || 0;
              const cardAmt = Number(split.cardAmount) || 0;
              const giftAmt =
                Number(split.giftAmount || split.tenders?.giftCard) || 0;
              const amountToShow =
                Number(split.amount) > 0
                  ? Number(split.amount)
                  : Math.max(0, cardAmt + giftAmt + cashAmt - splitTip);
              return (
                <div
                  key={`od-split-${idx}`}
                  className="rounded-md bg-violet-50/60 px-2 py-1.5 space-y-0.5"
                >
                  <div className="flex justify-between text-xs text-zinc-800 gap-3">
                    <span className="min-w-0">
                      <span className="font-semibold">{split.name}</span>
                      {split.method
                        ? ` · ${
                            split.cardType
                              ? `Card - ${split.cardType}`
                              : split.method
                          }`
                        : ""}
                      {seats ? ` · ${seats}` : ""}
                    </span>
                    <span className="font-semibold tabular-nums shrink-0">
                      {money(amountToShow)}
                    </span>
                  </div>
                  {splitTip > 0 ? (
                    <div className="flex justify-between text-[11px] text-zinc-600 gap-3">
                      <span>
                        Tip
                        {split.tipMethod ? ` (${split.tipMethod})` : ""}
                      </span>
                      <span className="tabular-nums">{money(splitTip)}</span>
                    </div>
                  ) : null}
                  {cashAmt > 0 || cardAmt > 0 || giftAmt > 0 ? (
                    <div className="flex flex-wrap gap-x-3 text-[11px] text-zinc-500">
                      {cashAmt > 0 ? (
                        <span>Cash {money(cashAmt)}</span>
                      ) : null}
                      {cardAmt > 0 ? (
                        <span>Card {money(cardAmt)}</span>
                      ) : null}
                      {giftAmt > 0 ? (
                        <span>Gift {money(giftAmt)}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
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
