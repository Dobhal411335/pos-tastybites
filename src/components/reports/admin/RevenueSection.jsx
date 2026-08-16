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
  BreakdownPie,
  ChartCard,
  NamedBarChart,
  seriesHasValues,
  TimeAreaChart,
} from "@/components/reports/financial/FinancialCharts";
import { money } from "./useAdminReport";

export default function RevenueSection({ data, loading }) {
  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data || data.empty) {
    return <FinancialEmpty message="No paid revenue for the selected period." />;
  }

  const kpis = data.kpis;
  const charts = data.charts;

  return (
    <div className="space-y-4">
      <FinancialKpiCards
        items={[
          { label: "Gross Sales", value: kpis.grossSales, money: true },
          { label: "Discounts", value: kpis.discounts, money: true },
          { label: "Net Sales", value: kpis.netSales, money: true },
          { label: "Tax", value: kpis.tax, money: true },
          { label: "Tips", value: kpis.tips, money: true },
          { label: "Service Charges", value: kpis.serviceCharges, money: true },
          { label: "Total Collected", value: kpis.collected, money: true },
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
            <p className="text-[11px] text-zinc-500">
              {row.count} orders · {row.percent}%
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="Revenue by day"
          empty={!seriesHasValues(charts?.revenueByDay)}
        >
          <TimeAreaChart data={charts?.revenueByDay} />
        </ChartCard>
        <ChartCard
          title="Revenue by payment method"
          empty={!charts?.paymentBreakdown?.some((r) => r.amount > 0)}
        >
          <BreakdownPie data={charts?.paymentBreakdown} />
        </ChartCard>
        <ChartCard
          title="Revenue by category"
          empty={!seriesHasValues(charts?.revenueByCategory)}
        >
          <NamedBarChart data={charts?.revenueByCategory} />
        </ChartCard>
        <ChartCard
          title="Revenue by employee"
          empty={!seriesHasValues(charts?.revenueByEmployee)}
        >
          <NamedBarChart data={charts?.revenueByEmployee} />
        </ChartCard>
      </div>

      <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase">Date</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Orders</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Gross Sales</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Discount</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Net Sales</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Tax</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Tips</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Service Charges</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.byDay.map((row) => (
              <TableRow key={row.date}>
                <TableCell className="text-xs whitespace-nowrap">{row.date}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{row.orders}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{money(row.grossSales)}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{money(row.discounts)}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{money(row.netSales)}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{money(row.tax)}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{money(row.tips)}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{money(row.serviceCharges)}</TableCell>
                <TableCell className="text-xs text-right tabular-nums font-medium">{money(row.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
