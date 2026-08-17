"use client";

import {
  DollarSign,
  Percent,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BreakdownPie,
  ChartCard,
  NamedBarChart,
  seriesHasValues,
  TimeAreaChart,
} from "@/components/reports/financial/FinancialCharts";
import {
  AdminEmptyState,
  AdminKpiCard,
  AdminReportSkeleton,
  AdminTableCard,
  TD_CLASS,
  TH_CLASS,
} from "./adminReportUi";
import { money } from "./useAdminReport";

export default function RevenueSection({ data, loading }) {
  if (loading && !data) {
    return <AdminReportSkeleton cards={4} />;
  }

  if (!data || data.empty) {
    return (
      <AdminEmptyState
        icon={TrendingUp}
        title="No revenue"
        message="No paid revenue for the selected period."
      />
    );
  }

  const kpis = data.kpis;
  const charts = data.charts;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <AdminKpiCard
          label="Gross Sales"
          value={money(kpis.grossSales)}
          icon={DollarSign}
        />
        <AdminKpiCard
          label="Net Sales"
          value={money(kpis.netSales)}
          icon={TrendingUp}
        />
        <AdminKpiCard
          label="Discounts"
          value={money(kpis.discounts)}
          icon={Percent}
          tone="danger"
        />
        <AdminKpiCard
          label="Total Collected"
          value={money(kpis.collected)}
          icon={Wallet}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <AdminKpiCard label="Tax" value={money(kpis.tax)} icon={Receipt} />
        <AdminKpiCard label="Tips" value={money(kpis.tips)} icon={DollarSign} />
        <AdminKpiCard
          label="Service Charges"
          value={money(kpis.serviceCharges)}
          icon={Receipt}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {(data.paymentBreakdown || []).map((row) => (
          <AdminKpiCard
            key={row.method}
            label={row.method}
            value={money(row.amount)}
            hint={`${row.count} orders · ${row.percent}%`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      <AdminTableCard title="Revenue by day">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className={TH_CLASS}>Date</TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>Orders</TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>
                Gross Sales
              </TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>
                Discount
              </TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>
                Net Sales
              </TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>Tax</TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>Tips</TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>
                Service Charges
              </TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.byDay.map((row) => (
              <TableRow key={row.date} className="h-14 hover:bg-zinc-50">
                <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                  {row.date}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {row.orders}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {money(row.grossSales)}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {money(row.discounts)}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {money(row.netSales)}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {money(row.tax)}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {money(row.tips)}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {money(row.serviceCharges)}
                </TableCell>
                <TableCell
                  className={`${TD_CLASS} text-right tabular-nums font-medium`}
                >
                  {money(row.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
