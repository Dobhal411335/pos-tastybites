"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  DollarSign,
  Percent,
  Receipt,
  Wallet,
} from "lucide-react";
import FinancialPageHeader from "./FinancialPageHeader";
import FinancialKpiCards from "./FinancialKpiCards";
import {
  BreakdownPie,
  ChartCard,
  seriesHasValues,
  TimeAreaChart,
  TimeBarChart,
} from "./FinancialCharts";
import {
  DEFAULT_FINANCIAL_FILTERS,
  useFinancialReport,
} from "./useFinancialReport";

export default function FinancialOverviewReport() {
  const [filters, setFilters] = useState(DEFAULT_FINANCIAL_FILTERS);
  const stableFilters = useMemo(() => filters, [filters]);
  const { data, loading, error, reload } = useFinancialReport(
    "/api/admin/reports/financial/overview",
    stableFilters
  );

  const kpis = data?.kpis;
  const charts = data?.charts;

  return (
    <FinancialPageHeader
      title="Overview"
      description="Sales, collections, tax, tips, and discounts from paid orders."
      filters={filters}
      onFiltersChange={setFilters}
      filterProps={{ showStatus: false }}
      loading={loading}
      error={error}
      onRetry={reload}
      empty={!error && (!data || data.empty)}
    >
      {data && !data.empty ? (
      <div className="space-y-4">
        <FinancialKpiCards
          items={[
            {
              label: "Gross Sales",
              value: kpis.grossSales,
              money: true,
              icon: DollarSign,
            },
            {
              label: "Discounts",
              value: kpis.discounts,
              money: true,
              icon: Percent,
              tone: "danger",
            },
            {
              label: "Net Sales",
              value: kpis.netSales,
              money: true,
              icon: DollarSign,
            },
            {
              label: "Tax",
              value: kpis.tax,
              money: true,
              icon: Receipt,
            },
            {
              label: "Tips",
              value: kpis.tips,
              money: true,
              icon: DollarSign,
            },
            {
              label: "Service Charges",
              value: kpis.serviceCharges,
              money: true,
              icon: Receipt,
            },
            {
              label: "Total Collected",
              value: kpis.collected,
              money: true,
              icon: Wallet,
            },
            {
              label: "Total Orders",
              value: kpis.orderCount,
              icon: ClipboardList,
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard
            title="Sales over time"
            empty={!seriesHasValues(charts?.salesOverTime)}
          >
            <TimeAreaChart data={charts?.salesOverTime} />
          </ChartCard>
          <ChartCard
            title="Orders over time"
            empty={!seriesHasValues(charts?.ordersOverTime)}
          >
            <TimeBarChart data={charts?.ordersOverTime} />
          </ChartCard>
          <ChartCard
            title="Payment method breakdown"
            empty={!charts?.paymentBreakdown?.some((r) => r.amount > 0)}
          >
            <BreakdownPie data={charts?.paymentBreakdown} />
          </ChartCard>
          <ChartCard
            title="Tax collected over time"
            empty={!seriesHasValues(charts?.taxOverTime)}
          >
            <TimeAreaChart data={charts?.taxOverTime} color="#8b5cf6" />
          </ChartCard>
          <ChartCard
            title="Discount amount over time"
            empty={!seriesHasValues(charts?.discountOverTime)}
          >
            <TimeAreaChart data={charts?.discountOverTime} color="#eab308" />
          </ChartCard>
        </div>
      </div>
      ) : null}
    </FinancialPageHeader>
  );
}
