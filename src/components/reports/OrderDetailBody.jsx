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

export const STATUS_BADGE = {
  PAID: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  WAIVED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

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

export function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-zinc-900">{value}</p>
    </div>
  );
}

export default function OrderDetailBody({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  return (
    <div className="mt-4 space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <DetailItem label="Date" value={formatDateTime(order.createdAt)} />
        <DetailItem label="Table" value={dash(order.tableNo)} />
        <DetailItem label="Guest" value={dash(order.partyName || order.guestName)} />
        <DetailItem
          label="Employee"
          value={dash(order.processedByName)}
        />
        <DetailItem label="Status" value={order.status} />
        <DetailItem label="Payment" value={dash(order.paymentMethod)} />
        <DetailItem label="Payment status" value={order.paymentStatus} />
        {order.waiveReason ? (
          <DetailItem label="Waive reason" value={order.waiveReason} />
        ) : null}
      </div>
      <div className="overflow-x-auto border border-zinc-200 rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase">Item</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Qty</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-zinc-500">
                  No items on this order.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={item.cartId || `${item.name}-${index}`}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.qty}</TableCell>
                  <TableCell className="text-right">{money(item.price)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Subtotal</span>
          <span>{money(order.subTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Discount</span>
          <span>{money(order.discountTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Tax</span>
          <span>{money(order.taxTotal)}</span>
        </div>
        {Number(order.serviceChargeTotal) > 0 ? (
          <div className="flex justify-between">
            <span className="text-zinc-500">
              {order.serviceChargeName || "Service charge"}
            </span>
            <span>{money(order.serviceChargeTotal)}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{money(order.totalAmount)}</span>
        </div>
        {Number(order.tipAmount) > 0 ? (
          <div className="flex justify-between">
            <span className="text-zinc-500">Tip</span>
            <span>{money(order.tipAmount)}</span>
          </div>
        ) : null}
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
