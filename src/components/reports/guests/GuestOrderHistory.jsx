"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, money, OrderSourceBadge, STATUS_BADGE } from "./guestFormat";

export default function GuestOrderHistory({ rows = [], onSelectOrder }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-6 text-center">
        No orders for this guest.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-zinc-200 rounded-md">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] uppercase tracking-wide">Date</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Order #</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Type</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Table</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Items</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-right">
              Total
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Payment</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.orderId}
              className="cursor-pointer hover:bg-orange-50/60"
              onClick={() => onSelectOrder?.(row.orderId, row)}
            >
              <TableCell className="text-sm whitespace-nowrap">
                {formatDateTime(row.createdAt)}
              </TableCell>
              <TableCell className="text-sm font-medium whitespace-nowrap">
                {row.orderNumber}
              </TableCell>
              <TableCell className="text-sm">
                <OrderSourceBadge order={row} />
              </TableCell>
              <TableCell className="text-sm">{row.tableNo}</TableCell>
              <TableCell className="text-sm min-w-36">
                <span className="text-zinc-500 mr-1">{row.itemCount}</span>
                {row.itemSummary || "—"}
              </TableCell>
              <TableCell className="text-sm text-right font-semibold tabular-nums whitespace-nowrap">
                <div>{money(row.totalAmount)}</div>
                {Number(row.tipAmount) > 0 ? (
                  <div className="text-[10px] font-normal text-zinc-500">
                    + tip {money(row.tipAmount)}
                    {row.tipMethod ? ` (${row.tipMethod})` : ""}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                <div>{row.paymentLabel || "—"}</div>
                {row.paymentStatus ? (
                  <div className="text-[10px] text-zinc-500">{row.paymentStatus}</div>
                ) : null}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${STATUS_BADGE[row.status] || "bg-zinc-50 text-zinc-600"}`}
                >
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
