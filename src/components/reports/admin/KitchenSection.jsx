"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FinancialKpiCards from "@/components/reports/financial/FinancialKpiCards";
import FinancialEmpty from "@/components/reports/financial/FinancialEmpty";
import { ReportPager } from "@/components/reports/inventory/reportUi";

const STATUS_BADGE = {
  QUEUED: "border-amber-200 bg-amber-50 text-amber-800",
  PRINTING: "border-sky-200 bg-sky-50 text-sky-800",
  PRINTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-600",
};

export default function KitchenSection({ data, loading, onPage }) {
  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <div className="space-y-3">
        {data?.note ? (
          <p className="text-xs text-zinc-500 border border-zinc-200 rounded-lg bg-white px-3 py-2">
            {data.note}
          </p>
        ) : null}
        <FinancialEmpty message="No kitchen tickets for the selected period." />
      </div>
    );
  }

  const counts = data.counts;

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 border border-zinc-200 rounded-lg bg-white px-3 py-2">
        {data.note}
      </p>
      <FinancialKpiCards
        items={[
          { label: "Total KOTs", value: counts.total },
          { label: "Completed", value: counts.completed },
          { label: "Pending", value: counts.pending },
          { label: "Cancelled", value: counts.cancelled },
        ]}
      />

      <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase">KOT #</TableHead>
              <TableHead className="text-[11px] uppercase">Order #</TableHead>
              <TableHead className="text-[11px] uppercase">Date</TableHead>
              <TableHead className="text-[11px] uppercase">Time</TableHead>
              <TableHead className="text-[11px] uppercase">Table</TableHead>
              <TableHead className="text-[11px] uppercase">Server</TableHead>
              <TableHead className="text-[11px] uppercase">Status</TableHead>
              <TableHead className="text-[11px] uppercase">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs whitespace-nowrap">{row.kotNumber}</TableCell>
                <TableCell className="text-xs">{row.orderNumber}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{row.date}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{row.time}</TableCell>
                <TableCell className="text-xs">{row.table}</TableCell>
                <TableCell className="text-xs">{row.employee}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-normal ${STATUS_BADGE[row.status] || ""}`}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{row.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ReportPager data={data} onPage={onPage} />

      <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 px-3 pt-3">
          Top kitchen items
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase">Rank</TableHead>
              <TableHead className="text-[11px] uppercase">Product</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Quantity</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.topItems || []).map((row) => (
              <TableRow key={`${row.rank}-${row.item}`}>
                <TableCell className="text-xs tabular-nums">{row.rank}</TableCell>
                <TableCell className="text-xs">{row.item}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{row.quantity}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{row.orderCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
