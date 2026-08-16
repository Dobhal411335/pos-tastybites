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
import {
  ChartCard,
  NamedBarChart,
  seriesHasValues,
  TimeAreaChart,
} from "./FinancialCharts";
import {
  DEFAULT_FINANCIAL_FILTERS,
  money,
  useFinancialReport,
} from "./useFinancialReport";

export default function FinancialTipsReport() {
  const [filters, setFilters] = useState(DEFAULT_FINANCIAL_FILTERS);
  const stableFilters = useMemo(() => filters, [filters]);
  const { data, loading } = useFinancialReport(
    "/api/admin/reports/financial/tips",
    stableFilters
  );

  return (
    <FinancialPageHeader
      title="Tips & Charges"
      description="Tips and service charges stored on paid orders, attributed to the original server."
      filters={filters}
      onFiltersChange={setFilters}
      loading={loading}
    >
      {!data || data.empty ? (
        <FinancialEmpty message="No tips or service charges found for the selected period." />
      ) : (
        <div className="space-y-4">
          <FinancialKpiCards
            items={[
              { label: "Total Tips", value: data.summary.tips, money: true },
              {
                label: "Service Charges",
                value: data.summary.serviceCharges,
                money: true,
              },
              { label: "Combined Total", value: data.summary.combined, money: true },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard
              title="Tips over time"
              empty={!seriesHasValues(data.charts?.tipsOverTime)}
            >
              <TimeAreaChart data={data.charts?.tipsOverTime} />
            </ChartCard>
            <ChartCard
              title="Service charges over time"
              empty={!seriesHasValues(data.charts?.serviceChargesOverTime)}
            >
              <TimeAreaChart
                data={data.charts?.serviceChargesOverTime}
                color="#10b981"
              />
            </ChartCard>
            <ChartCard
              title="Tips by employee"
              empty={!data.charts?.tipsByEmployee?.some((r) => r.value > 0)}
            >
              <NamedBarChart data={data.charts?.tipsByEmployee} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
              <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Employee breakdown
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Employee", "Orders", "Tips", "Service Charges", "Total"].map(
                      (h) => (
                        <TableHead key={h} className="text-[11px] uppercase">
                          {h}
                        </TableHead>
                      )
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.byEmployee || []).map((row) => (
                    <TableRow key={String(row.employeeId)}>
                      <TableCell>{row.employeeName}</TableCell>
                      <TableCell>{row.orders}</TableCell>
                      <TableCell className="tabular-nums">{money(row.tips)}</TableCell>
                      <TableCell className="tabular-nums">
                        {money(row.serviceCharges)}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {money(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
              <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Date breakdown
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Date", "Tips", "Service Charges", "Total"].map((h) => (
                      <TableHead key={h} className="text-[11px] uppercase">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.byDate || [])
                    .filter((row) => row.total > 0)
                    .map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell className="tabular-nums">{money(row.tips)}</TableCell>
                        <TableCell className="tabular-nums">
                          {money(row.serviceCharges)}
                        </TableCell>
                        <TableCell className="tabular-nums font-medium">
                          {money(row.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </FinancialPageHeader>
  );
}
