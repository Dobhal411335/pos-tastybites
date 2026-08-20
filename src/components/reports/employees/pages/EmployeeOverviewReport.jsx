"use client";

import EmployeeReportPageShell from "../EmployeeReportPageShell";
import EmployeeGroupedTable, {
  PosSummaryCards,
} from "../EmployeeGroupedTable";
import {
  ChartCard,
  DonutChart,
  EmployeeKpiCards,
  NamedBarChart,
  ReportEmpty,
  TableSkeleton,
  TimeAreaChart,
} from "../EmployeeReportUi";
import { employeeInitials, money } from "../employeeFormat";

export default function EmployeeOverviewReport() {
  return (
    <EmployeeReportPageShell
      title="Overview"
      description="Staff performance snapshot for the selected period."
      section="summary"
      showShift
    >
      {({ data, loading, openEmployee }) => {
        const overview = data?.overview || {};
        const performance = data?.performance || [];
        const charts = data?.charts || {};
        const top = performance.slice(0, 8);

        if (!loading && performance.length === 0) {
          return <ReportEmpty message="No employee activity for this date range." />;
        }

        const tipShareChart = (charts.tipsByEmployee || [])
          .filter((r) => Number(r.tips) > 0)
          .slice(0, 6)
          .map((r) => ({ label: r.label, value: r.tips }));

        return (
          <div className="space-y-4">
            <PosSummaryCards overview={overview} loading={loading} />

            <EmployeeKpiCards
              loading={loading}
              items={[
                { label: "Total Staff", value: overview.totalStaff || 0 },
                { label: "Active Staff", value: overview.activeStaff || 0 },
                { label: "Clocked In", value: overview.clockedIn || 0 },
                {
                  label: "Total Tips",
                  value: overview.distributedTips ?? overview.totalTips,
                  money: true,
                },
                { label: "Gratuity", value: "—", hint: "Not tracked" },
                {
                  label: "Labor Cost",
                  value: overview.laborConfigured ? overview.estimatedPay : "—",
                  money: Boolean(overview.laborConfigured),
                },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <ChartCard
                title="Top sales by employee"
                loading={loading}
                tall
                empty={!charts.salesByEmployee?.some((r) => Number(r.sales) > 0)}
              >
                <div className="grid grid-cols-2 gap-2 h-full">
                  <DonutChart
                    data={(charts.salesByEmployee || [])
                      .slice(0, 5)
                      .map((r) => ({ label: r.label, value: r.sales }))}
                  />
                  <div className="overflow-y-auto text-xs space-y-1.5 pr-1">
                    {(charts.salesByEmployee || []).slice(0, 5).map((r) => (
                      <div key={r.label} className="flex justify-between gap-2">
                        <span className="truncate text-zinc-600">{r.label}</span>
                        <span className="tabular-nums font-semibold shrink-0">
                          {money(r.sales)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
              <ChartCard
                title="Tips by employee"
                loading={loading}
                tall
                empty={!tipShareChart.length}
              >
                <div className="grid grid-cols-2 gap-2 h-full">
                  <DonutChart data={tipShareChart} />
                  <div className="overflow-y-auto text-xs space-y-1.5 pr-1">
                    {tipShareChart.map((r) => (
                      <div key={r.label} className="flex justify-between gap-2">
                        <span className="truncate text-zinc-600">{r.label}</span>
                        <span className="tabular-nums font-semibold shrink-0">
                          {money(r.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
              <ChartCard
                title="Sales over time"
                loading={loading}
                empty={!charts.salesOverTime?.some((r) => Number(r.sales) > 0)}
              >
                <TimeAreaChart
                  data={(charts.salesOverTime || []).map((r) => ({
                    label: r.label,
                    value: r.sales,
                  }))}
                />
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <ChartCard
                title="Orders by employee"
                loading={loading}
                empty={!charts.ordersByEmployee?.some((r) => Number(r.orders) > 0)}
              >
                <NamedBarChart
                  data={(charts.ordersByEmployee || [])
                    .slice(0, 8)
                    .map((r) => ({ label: r.label, value: r.orders }))}
                  moneyValue={false}
                  color="#14b8a6"
                />
              </ChartCard>
              <ChartCard
                title="Working hours"
                loading={loading}
                empty={!charts.hoursByEmployee?.some((r) => Number(r.hours) > 0)}
              >
                <NamedBarChart
                  data={(charts.hoursByEmployee || [])
                    .slice(0, 8)
                    .map((r) => ({ label: r.label, value: r.hours }))}
                  moneyValue={false}
                  color="#8b5cf6"
                />
              </ChartCard>
              <ChartCard
                title="Service charges"
                loading={loading}
                empty={
                  !charts.serviceChargesByEmployee?.some(
                    (r) => Number(r.serviceCharges) > 0
                  )
                }
              >
                <NamedBarChart
                  data={(charts.serviceChargesByEmployee || [])
                    .slice(0, 8)
                    .map((r) => ({ label: r.label, value: r.serviceCharges }))}
                  color="#0ea5e9"
                />
              </ChartCard>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Top performers
              </p>
              {loading ? (
                <TableSkeleton rows={1} cols={4} />
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {top.map((row, index) => (
                    <button
                      key={row.employeeId}
                      type="button"
                      onClick={() => openEmployee(row.employeeId, row)}
                      className="min-w-52 shrink-0 rounded-xl border border-zinc-200 bg-white p-3 text-left hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-orange-600">
                          #{index + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-semibold">
                          {employeeInitials(row.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{row.name}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{row.role}</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Sales</span>
                        <span className="font-semibold tabular-nums">{money(row.sales)}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-zinc-500">Tips</span>
                        <span className="font-semibold tabular-nums">{money(row.tips)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Staff performance (expand for breakdown)
              </p>
              {loading ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                  <TableSkeleton />
                </div>
              ) : (
                <EmployeeGroupedTable
                  rows={performance}
                  onOpenEmployee={openEmployee}
                />
              )}
            </div>
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}
