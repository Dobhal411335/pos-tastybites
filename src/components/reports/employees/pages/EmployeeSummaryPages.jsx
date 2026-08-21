"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EmployeeReportPageShell from "../EmployeeReportPageShell";
import { EmployeePayrollTable } from "../EmployeeGroupedTable";
import {
  ChartCard,
  EmployeeKpiCards,
  NamedBarChart,
  ReportEmpty,
  TableSkeleton,
} from "../EmployeeReportUi";
import { formatHoursLabel, money } from "../employeeFormat";

export default function EmployeeSalesReport() {
  return (
    <EmployeeReportPageShell
      title="Sales Performance"
      description="Gross and net sales attributed to staff who processed orders."
      section="summary"
      exportView="sales"
      detailMode="sales"
    >
      {({ data, loading, openEmployee }) => {
        const rows = data?.performance || [];
        const charts = data?.charts || {};
        const overview = data?.overview || {};
        const discounts = rows.reduce((s, r) => s + (Number(r.discounts) || 0), 0);
        const netSales = Number(overview.totalSales) || 0;
        const grossSales = netSales + discounts;
        const aov =
          Number(overview.completedOrders) > 0
            ? netSales / Number(overview.completedOrders)
            : 0;

        if (!loading && rows.length === 0) {
          return <ReportEmpty message="No sales for this period." />;
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              title="Sales highlights"
              description="Gross, net, orders, and cancellations for this period"
              items={[
                { label: "Total Sales", value: grossSales, money: true },
                { label: "Net Sales", value: netSales, money: true },
                { label: "Total Orders", value: overview.completedOrders || 0 },
                { label: "AOV", value: aov, money: true },
                { label: "Discounts", value: discounts, money: true },
                { label: "Cancelled", value: overview.cancelCount || 0 },
              ]}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard
                title="Sales over time"
                loading={loading}
                empty={!charts.salesOverTime?.some((r) => Number(r.sales) > 0)}
              >
                <NamedBarChart
                  data={(charts.salesOverTime || []).map((r) => ({
                    label: r.label,
                    value: r.sales,
                  }))}
                />
              </ChartCard>
              <ChartCard
                title="Sales by employee"
                loading={loading}
                empty={!charts.salesByEmployee?.some((r) => Number(r.sales) > 0)}
              >
                <NamedBarChart
                  data={(charts.salesByEmployee || []).slice(0, 10).map((r) => ({
                    label: r.label,
                    value: r.sales,
                  }))}
                />
              </ChartCard>
              <ChartCard
                title="Orders by employee"
                loading={loading}
                empty={!charts.ordersByEmployee?.some((r) => Number(r.orders) > 0)}
              >
                <NamedBarChart
                  data={(charts.ordersByEmployee || []).slice(0, 10).map((r) => ({
                    label: r.label,
                    value: r.orders,
                  }))}
                  moneyValue={false}
                  color="#10b981"
                />
              </ChartCard>
              <ChartCard
                title="AOV by employee"
                loading={loading}
                empty={!charts.aovByEmployee?.some((r) => Number(r.aov) > 0)}
              >
                <NamedBarChart
                  data={(charts.aovByEmployee || []).slice(0, 10).map((r) => ({
                    label: r.label,
                    value: r.aov,
                  }))}
                  color="#8b5cf6"
                />
              </ChartCard>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              {loading ? (
                <div className="p-4"><TableSkeleton /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50">
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Discounts</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">AOV</TableHead>
                      <TableHead className="text-right">Cancelled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const net = Number(row.sales) || 0;
                      const disc = Number(row.discounts) || 0;
                      return (
                        <TableRow
                          key={row.employeeId}
                          className="cursor-pointer hover:bg-orange-50/40"
                          onClick={() => openEmployee(row.employeeId, row)}
                        >
                          <TableCell>
                            <p className="text-sm font-semibold">{row.name}</p>
                            <p className="text-xs text-zinc-500">{row.role}</p>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(net + disc)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(disc)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(net)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(row.aov)}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.cancellations || 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}

export function EmployeeTipsReport() {
  return (
    <EmployeeReportPageShell
      title="Tips & Gratuity"
      description="Allocated tips by tip % or earned tips from processed orders."
      section="summary"
      exportView="tips"
      detailMode="tips"
    >
      {({ data, loading, openEmployee }) => {
        const tipEmployees = data?.tips?.employees || [];
        const charts = data?.charts || {};
        const totals = data?.tips?.totals || {};
        const receiving = tipEmployees.filter((r) => Number(r.tips) > 0).length;
        const tipOrders = tipEmployees.reduce((s, r) => s + (Number(r.orders) || 0), 0);
        const avgTip = tipOrders > 0 ? (Number(totals.tips) || 0) / tipOrders : 0;

        if (!loading && tipEmployees.length === 0) {
          return <ReportEmpty message="No tip data for this period." />;
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              title="Tips highlights"
              description="Earned allocation vs tips collected on orders"
              items={[
                { label: "Earned Tips", value: totals.tips, money: true },
                { label: "Collected Tips", value: totals.collectedTips, money: true },
                { label: "Shareable Pool", value: totals.shareableTipPool ?? totals.tipPool, money: true },
                { label: "Avg Earned / Order", value: avgTip, money: true },
                { label: "Gratuity", value: "—", hint: "Not tracked" },
                { label: "Receiving Tips", value: receiving },
              ]}
            />
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              Own-tip staff keep tips on their orders. Tip-% staff share the pool after own-tip collections are excluded. Gratuity is not stored separately.
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard
                title="Earned tips by employee"
                loading={loading}
                empty={!charts.tipsByEmployee?.some((r) => Number(r.tips) > 0)}
              >
                <NamedBarChart
                  data={(charts.tipsByEmployee || []).slice(0, 10).map((r) => ({
                    label: r.label,
                    value: r.tips,
                  }))}
                  color="#3b82f6"
                />
              </ChartCard>
              <ChartCard
                title="Collected tips over time"
                loading={loading}
                empty={!charts.tipsOverTime?.some((r) => Number(r.tips) > 0)}
              >
                <NamedBarChart
                  data={(charts.collectedTipsOverTime || charts.tipsOverTime || []).map((r) => ({ label: r.label, value: r.tips }))}
                  color="#3b82f6"
                />
              </ChartCard>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              {loading ? (
                <div className="p-4"><TableSkeleton /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50">
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Mode</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Earned</TableHead>
                      <TableHead className="text-right">Avg Collected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tipEmployees.map((row) => (
                      <TableRow
                        key={row.employeeId}
                        className="cursor-pointer hover:bg-orange-50/40"
                        onClick={() => openEmployee(row.employeeId, row)}
                      >
                        <TableCell>
                          <p className="text-sm font-semibold">{row.name}</p>
                          <p className="text-xs text-zinc-500">
                            {row.receiveOwnTips ? "Own tips" : row.role}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                        <TableCell className="text-right text-xs">
                          {row.receiveOwnTips ? "Own" : `${row.tipPercent || 0}%`}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{money(row.collectedTips)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(row.tips)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(row.averageTip)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}

export function EmployeeServiceChargesReport() {
  return (
    <EmployeeReportPageShell
      title="Service Charges"
      description="Service charges on orders processed by each employee."
      section="summary"
      exportView="service"
      detailMode="service"
    >
      {({ data, loading, openEmployee }) => {
        const rows = (data?.performance || []).filter(
          (r) => Number(r.serviceCharges) > 0 || Number(r.orders) > 0
        );
        const charts = data?.charts || {};
        const total = Number(data?.overview?.serviceCharges) || 0;
        const withSc = rows.filter((r) => Number(r.serviceCharges) > 0).length;
        const ordersWith = rows.reduce(
          (s, r) => s + (Number(r.serviceCharges) > 0 ? Number(r.orders) || 0 : 0),
          0
        );
        const avg = ordersWith > 0 ? total / Math.max(1, withSc) : 0;

        if (!loading && total === 0) {
          return <ReportEmpty message="No service charges for this period." />;
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              title="Service charge highlights"
              description="Service charges on orders processed by staff"
              items={[
                { label: "Total Service Charges", value: total, money: true },
                { label: "Staff with charges", value: withSc },
                { label: "Average / staff", value: avg, money: true },
              ]}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard
                title="Service charges over time"
                loading={loading}
                empty={!charts.serviceChargesOverTime?.some((r) => Number(r.serviceCharges) > 0)}
              >
                <NamedBarChart
                  data={(charts.serviceChargesOverTime || []).map((r) => ({
                    label: r.label,
                    value: r.serviceCharges,
                  }))}
                />
              </ChartCard>
              <ChartCard
                title="By employee"
                loading={loading}
                empty={!charts.serviceChargesByEmployee?.some((r) => Number(r.serviceCharges) > 0)}
              >
                <NamedBarChart
                  data={(charts.serviceChargesByEmployee || []).slice(0, 10).map((r) => ({
                    label: r.label,
                    value: r.serviceCharges,
                  }))}
                />
              </ChartCard>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              {loading ? (
                <div className="p-4"><TableSkeleton /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50">
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Service Charges</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.employeeId}
                        className="cursor-pointer hover:bg-orange-50/40"
                        onClick={() => openEmployee(row.employeeId, row)}
                      >
                        <TableCell>
                          <p className="text-sm font-semibold">{row.name}</p>
                          <p className="text-xs text-zinc-500">{row.role}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(row.serviceCharges)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(row.sales)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}

export function EmployeeHoursReport() {
  return (
    <EmployeeReportPageShell
      title="Working Hours Summary"
      description="Regular, overtime, and total hours from clock records."
      section="summary"
      exportView="hours"
      detailMode="hours"
      showShift
      showStatus={false}
      showPayment={false}
    >
      {({ data, loading, openEmployee }) => {
        const rows = data?.performance || [];
        const charts = data?.charts || {};
        const overview = data?.overview || {};

        if (!loading && !rows.some((r) => Number(r.hours) > 0)) {
          return <ReportEmpty message="No working hours for this period." />;
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              title="Working hours highlights"
              description="Regular, overtime, and total hours for this period"
              items={[
                { label: "Total Hours", value: formatHoursLabel(overview.totalHours) },
                { label: "Regular", value: formatHoursLabel(overview.regularHours) },
                { label: "Overtime", value: formatHoursLabel(overview.overtimeHours) },
                { label: "Staff", value: overview.totalStaff || 0 },
              ]}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard
                title="Hours over time"
                loading={loading}
                empty={!charts.hoursOverTime?.some((r) => Number(r.hours) > 0)}
              >
                <NamedBarChart
                  data={(charts.hoursOverTime || []).map((r) => ({
                    label: r.label,
                    value: r.hours,
                  }))}
                  moneyValue={false}
                  color="#8b5cf6"
                />
              </ChartCard>
              <ChartCard
                title="Hours by employee"
                loading={loading}
                empty={!charts.hoursByEmployee?.length}
              >
                <NamedBarChart
                  data={(charts.hoursByEmployee || []).slice(0, 10).map((r) => ({
                    label: r.label,
                    value: r.hours,
                  }))}
                  moneyValue={false}
                  color="#8b5cf6"
                />
              </ChartCard>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              {loading ? (
                <div className="p-4"><TableSkeleton /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50">
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Regular</TableHead>
                      <TableHead className="text-right">Break</TableHead>
                      <TableHead className="text-right">Overtime</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.employeeId}
                        className="cursor-pointer hover:bg-orange-50/40"
                        onClick={() => openEmployee(row.employeeId, row)}
                      >
                        <TableCell>
                          <p className="text-sm font-semibold">{row.name}</p>
                          <p className="text-xs text-zinc-500">{row.role}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatHoursLabel(row.regularHours)}
                        </TableCell>
                        <TableCell className="text-right text-zinc-400">—</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatHoursLabel(row.overtimeHours)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatHoursLabel(row.hours)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.daysWorked || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}

export function EmployeeLaborReport() {
  return (
    <EmployeeReportPageShell
      title="Hourly Labor Cost"
      description="Estimated labor cost from hourly rates and worked hours."
      section="summary"
      exportView="labor"
      detailMode="labor"
      showShift
      showStatus={false}
      showPayment={false}
    >
      {({ data, loading, openEmployee }) => {
        const overview = data?.overview || {};
        const rows = (data?.performance || []).filter(
          (r) => Number(r.hourlyRate) > 0 || Number(r.estimatedPay) > 0
        );

        if (!loading && !overview.laborConfigured) {
          return (
            <ReportEmpty message="Labor-cost reporting requires employee hourly pay rates. Set rates on each employee profile to enable this report." />
          );
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              title="Labor cost highlights"
              description="Estimated pay from hourly rates × worked hours"
              items={[
                { label: "Total Labor Cost", value: overview.estimatedPay, money: true },
                { label: "Regular Pay", value: overview.regularPay, money: true },
                { label: "Overtime Pay", value: overview.overtimePay, money: true },
                { label: "Hours", value: formatHoursLabel(overview.totalHours) },
              ]}
            />
            <ChartCard
              title="Labor cost by employee"
              loading={loading}
              empty={!rows.some((r) => Number(r.estimatedPay) > 0)}
            >
              <NamedBarChart
                data={rows.slice(0, 12).map((r) => ({
                  label: r.name,
                  value: r.estimatedPay,
                }))}
              />
            </ChartCard>
            {loading ? (
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <TableSkeleton />
              </div>
            ) : (
              <EmployeePayrollTable rows={rows} onOpenEmployee={openEmployee} />
            )}
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}
