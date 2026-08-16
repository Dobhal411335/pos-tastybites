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
import { money } from "./useAdminReport";

const EVENT_BADGE = {
  ORDER_CANCELLED: "border-red-200 bg-red-50 text-red-700",
  DISCOUNT_APPLIED: "border-amber-200 bg-amber-50 text-amber-800",
  GIFT_CARD_USED: "border-sky-200 bg-sky-50 text-sky-800",
};

export default function AuditSection({ data, loading, onPage }) {
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
        {data?.notes?.unsupported ? (
          <p className="text-xs text-zinc-500 border border-zinc-200 rounded-lg bg-white px-3 py-2">
            {data.notes.unsupported}
          </p>
        ) : null}
        <FinancialEmpty message="No exception events for the selected period." />
      </div>
    );
  }

  const summary = data.summary;

  return (
    <div className="space-y-4">
      <FinancialKpiCards
        items={[
          { label: "Total Events", value: summary.total },
          { label: "Cancelled / Waived", value: summary.cancelled },
          { label: "Discounted Orders", value: summary.discounted },
          { label: "Gift Card Used", value: summary.giftCard },
          { label: "Refunds", value: "Not recorded" },
          { label: "Voids", value: "Not recorded" },
          { label: "Payment Failures", value: "Not recorded" },
          { label: "Manual Adjustments", value: "Not recorded" },
        ]}
      />
      <p className="text-xs text-zinc-500">{data.notes?.unsupported}</p>

      <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase">Date</TableHead>
              <TableHead className="text-[11px] uppercase">Time</TableHead>
              <TableHead className="text-[11px] uppercase">Order #</TableHead>
              <TableHead className="text-[11px] uppercase">Employee</TableHead>
              <TableHead className="text-[11px] uppercase">Event Type</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Amount</TableHead>
              <TableHead className="text-[11px] uppercase">Reason</TableHead>
              <TableHead className="text-[11px] uppercase">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs whitespace-nowrap">{row.date}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{row.time}</TableCell>
                <TableCell className="text-xs">{row.orderNumber}</TableCell>
                <TableCell className="text-xs">{row.employee}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-normal ${EVENT_BADGE[row.eventType] || ""}`}
                  >
                    {row.eventType}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {money(row.amount)}
                </TableCell>
                <TableCell className="text-xs text-zinc-600">{row.reason}</TableCell>
                <TableCell className="text-xs">{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ReportPager data={data} onPage={onPage} />
    </div>
  );
}
