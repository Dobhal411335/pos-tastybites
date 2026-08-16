"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FinancialPageHeader from "./FinancialPageHeader";
import FinancialKpiCards from "./FinancialKpiCards";
import FinancialEmpty from "./FinancialEmpty";
import { ChartCard, seriesHasValues, TimeAreaChart } from "./FinancialCharts";
import {
  DEFAULT_FINANCIAL_FILTERS,
  money,
  useFinancialReport,
} from "./useFinancialReport";

export default function FinancialTaxReport() {
  const [filters, setFilters] = useState(DEFAULT_FINANCIAL_FILTERS);
  const stableFilters = useMemo(() => filters, [filters]);
  const { data, loading } = useFinancialReport(
    "/api/admin/reports/financial/tax",
    stableFilters
  );

  const summary = data?.summary;
  const zeroTax = summary?.ordersWithNoTaxCollected;

  return (
    <FinancialPageHeader
      title="Tax Summary"
      description="Tax collected from stored order tax totals and payment-time tax breakdown."
      filters={filters}
      onFiltersChange={setFilters}
      loading={loading}
    >
      {!data || data.empty ? (
        <FinancialEmpty />
      ) : (
        <div className="space-y-4">
          <FinancialKpiCards
            items={[
              { label: "Gross Sales", value: summary.grossSales, money: true },
              { label: "Net Sales", value: summary.netSales, money: true },
              { label: "Tax collected", value: summary.taxCollected, money: true },
              {
                label: "Orders with $0 tax",
                value: zeroTax?.orders || 0,
              },
            ]}
          />

          {zeroTax?.note ? (
            <p className="text-xs text-zinc-500">{zeroTax.note}</p>
          ) : null}

          <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Tax Name", "Rate", "Taxable Amount", "Tax Collected", "Orders"].map(
                    (h) => (
                      <TableHead key={h} className="text-[11px] uppercase">
                        {h}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.breakdown || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-zinc-500">
                      No tax breakdown on paid orders in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.breakdown.map((row) => (
                    <TableRow key={`${row.name}-${row.rate}`}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{Number(row.rate) ? `${row.rate}%` : "—"}</TableCell>
                      <TableCell className="tabular-nums">{money(row.taxableAmount)}</TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {money(row.taxCollected)}
                      </TableCell>
                      <TableCell>{row.orderCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <ChartCard
            title="Tax over time"
            empty={!seriesHasValues(data.charts?.taxOverTime)}
          >
            <TimeAreaChart data={data.charts?.taxOverTime} color="#8b5cf6" />
          </ChartCard>
        </div>
      )}
    </FinancialPageHeader>
  );
}
