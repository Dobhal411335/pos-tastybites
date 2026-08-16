"use client";

import { Loader2 } from "lucide-react";
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
import {
  ChartCard,
  NamedBarChart,
  seriesHasValues,
  TimeAreaChart,
} from "@/components/reports/financial/FinancialCharts";
import { money } from "./useAdminReport";

export default function DailySummarySection({ data, loading }) {
  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data || data.empty) {
    return <FinancialEmpty message="No orders for the selected period." />;
  }

  const counts = data.counts;
  const kpis = data.kpis;

  return (
    <div className="space-y-4">
      <FinancialKpiCards
        items={[
          { label: "Total Orders", value: counts.total },
          { label: "Completed (Paid)", value: counts.completed },
          { label: "Pending", value: counts.pending },
          { label: "Cancelled", value: counts.cancelled },
          { label: "Waived", value: counts.waived },
          { label: "Voided", value: "Not recorded" },
          { label: "Refunded", value: "Not recorded" },
        ]}
      />

      <FinancialKpiCards
        items={[
          { label: "Gross Sales", value: kpis.grossSales, money: true },
          { label: "Discounts", value: kpis.discounts, money: true },
          { label: "Net Sales", value: kpis.netSales, money: true },
          { label: "Tax", value: kpis.tax, money: true },
          { label: "Tips", value: kpis.tips, money: true },
          { label: "Service Charges", value: kpis.serviceCharges, money: true },
          { label: "Final Total", value: kpis.collected, money: true },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(data.paymentBreakdown || []).map((row) => (
          <div
            key={row.method}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {row.method}
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums">
              {money(row.amount)}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-500">
        {data.notes?.completed} {data.notes?.voided} {data.notes?.refunded}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="Net sales by day"
          empty={!seriesHasValues(data.charts?.salesOverTime)}
        >
          <TimeAreaChart data={data.charts?.salesOverTime} />
        </ChartCard>
        <ChartCard
          title="Orders by status"
          empty={!seriesHasValues(data.charts?.ordersByStatus)}
        >
          <NamedBarChart
            data={data.charts?.ordersByStatus}
            valuePrefix=""
            color="#3b82f6"
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 px-3 pt-3">
            Employee summary
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] uppercase">Employee</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Orders</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Sales</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Tips</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.byEmployee || []).map((row) => (
                <TableRow key={String(row.employeeId)}>
                  <TableCell className="text-xs">{row.employeeName}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.orders}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{money(row.sales)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{money(row.tips)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 px-3 pt-3">
            Top selling items
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] uppercase">Item</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Qty</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.topItems || []).map((row) => (
                <TableRow key={row.item}>
                  <TableCell className="text-xs">{row.item}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.quantity}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{money(row.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
