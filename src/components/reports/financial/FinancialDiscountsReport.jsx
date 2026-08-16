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

export default function FinancialDiscountsReport() {
  const [filters, setFilters] = useState(DEFAULT_FINANCIAL_FILTERS);
  const stableFilters = useMemo(() => filters, [filters]);
  const { data, loading } = useFinancialReport(
    "/api/admin/reports/financial/discounts",
    stableFilters
  );

  return (
    <FinancialPageHeader
      title="Discounts"
      description="Order-level discounts stored at checkout (coupon codes and staff discount)."
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
              { label: "Gross Sales", value: data.summary.grossSales, money: true },
              { label: "Total Discount", value: data.summary.discounts, money: true },
              { label: "Net Sales", value: data.summary.netSales, money: true },
            ]}
          />

          <ChartCard
            title="Discount amount over time"
            empty={!seriesHasValues(data.charts?.discountOverTime)}
          >
            <TimeAreaChart data={data.charts?.discountOverTime} color="#eab308" />
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <BreakdownTable
              title="By discount"
              headers={["Discount Name", "Orders", "Amount"]}
              rows={(data.byCode || []).map((row) => [
                row.discountName,
                row.orders,
                money(row.amount),
              ])}
            />
            <BreakdownTable
              title="By employee"
              headers={["Employee", "Orders", "Amount"]}
              rows={(data.byEmployee || []).map((row) => [
                row.employeeName,
                row.orders,
                money(row.amount),
              ])}
            />
            <BreakdownTable
              title="By date"
              headers={["Date", "Orders", "Amount"]}
              rows={(data.byDate || [])
                .filter((row) => row.amount > 0)
                .map((row) => [row.date, row.orders, money(row.amount)])}
            />
          </div>
        </div>
      )}
    </FinancialPageHeader>
  );
}

function BreakdownTable({ title, headers, rows }) {
  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
      <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h} className="text-[11px] uppercase">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length} className="text-sm text-zinc-500">
                None
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j} className={j > 0 ? "tabular-nums" : ""}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
