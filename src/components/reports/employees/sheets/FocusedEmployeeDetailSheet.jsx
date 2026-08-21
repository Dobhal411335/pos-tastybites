"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartCard, NamedBarChart, TimeAreaChart } from "../EmployeeReportUi";
import {
  STATUS_BADGE,
  formatDateTz,
  formatHoursLabel,
  formatTimeTz,
  money,
} from "../employeeFormat";
import EmployeeSheetShell, {
  EmployeeSheetHeaderCard,
  SheetKpiGrid,
  SheetSection,
} from "./EmployeeSheetShell";

function OrdersMiniTable({ orders = [], timezone, onSelectOrder, columns = "sales" }) {
  if (!orders.length) {
    return <p className="text-sm text-zinc-500">No orders in this period.</p>;
  }
  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50">
            <TableHead>Order</TableHead>
            <TableHead>When</TableHead>
            {columns !== "cancel" ? <TableHead>Table</TableHead> : null}
            {columns === "tips" || columns === "tipsByPayment" ? (
              <>
                <TableHead>Tip method</TableHead>
                <TableHead className="text-right">Tip</TableHead>
              </>
            ) : null}
            {columns === "service" ? (
              <TableHead className="text-right">Service charge</TableHead>
            ) : null}
            {columns === "sales" || columns === "orders" ? (
              <TableHead className="text-right">Total</TableHead>
            ) : null}
            {columns === "cancel" ? (
              <>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
              </>
            ) : null}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((row) => (
            <TableRow
              key={row.orderId || row.orderNumber}
              className={onSelectOrder ? "cursor-pointer hover:bg-orange-50/40" : undefined}
              onClick={() => onSelectOrder?.(row.orderId)}
            >
              <TableCell className="font-medium tabular-nums">
                #{row.orderNumber || "—"}
              </TableCell>
              <TableCell className="text-xs text-zinc-600">
                {formatDateTz(row.createdAt, timezone)}
                <br />
                {formatTimeTz(row.createdAt, timezone)}
              </TableCell>
              {columns !== "cancel" ? (
                <TableCell className="tabular-nums">{row.tableNo || "—"}</TableCell>
              ) : null}
              {columns === "tips" || columns === "tipsByPayment" ? (
                <>
                  <TableCell className="text-xs">
                    {row.tipPaymentMethod || row.tipMethod || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(row.tipAmount)}
                  </TableCell>
                </>
              ) : null}
              {columns === "service" ? (
                <TableCell className="text-right tabular-nums">
                  {money(row.serviceChargeTotal)}
                </TableCell>
              ) : null}
              {columns === "sales" || columns === "orders" ? (
                <TableCell className="text-right tabular-nums">
                  {money(row.totalAmount)}
                </TableCell>
              ) : null}
              {columns === "cancel" ? (
                <>
                  <TableCell className="text-right tabular-nums">
                    {money(row.amount ?? row.totalAmount)}
                  </TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate">
                    {row.reason || "—"}
                  </TableCell>
                </>
              ) : null}
              <TableCell>
                <Badge
                  variant="secondary"
                  className={STATUS_BADGE[row.status] || "bg-zinc-100 text-zinc-700"}
                >
                  {row.status || "—"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PunchesTable({ punches = [], timezone, showSchedule = false }) {
  if (!punches.length) {
    return <p className="text-sm text-zinc-500">No clock punches in this period.</p>;
  }
  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50">
            <TableHead>Date</TableHead>
            <TableHead>Clock in</TableHead>
            <TableHead>Clock out</TableHead>
            {showSchedule ? <TableHead>Scheduled</TableHead> : null}
            <TableHead className="text-right">Hours</TableHead>
            <TableHead className="text-right">OT</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {punches.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-xs">
                {formatDateTz(row.date || row.clockIn, timezone)}
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                {row.clockIn ? formatTimeTz(row.clockIn, timezone) : "—"}
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                {row.isIncomplete
                  ? "Open"
                  : row.clockOut
                    ? formatTimeTz(row.clockOut, timezone)
                    : "—"}
              </TableCell>
              {showSchedule ? (
                <TableCell className="text-xs text-zinc-600">
                  {row.scheduledStart
                    ? `${formatTimeTz(row.scheduledStart, timezone)} – ${formatTimeTz(row.scheduledEnd, timezone)}`
                    : "—"}
                </TableCell>
              ) : null}
              <TableCell className="text-right tabular-nums text-xs">
                {formatHoursLabel(row.workedHours)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs">
                {formatHoursLabel(row.overtimeHours)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SalesFocusBody({ detail, timezone, onSelectOrder }) {
  const overview = detail?.overview || {};
  const chart = (detail?.charts?.salesOverTime || []).map((r) => ({
    label: r.label,
    value: r.sales,
  }));
  return (
    <>
      <EmployeeSheetHeaderCard employee={detail?.employee} subtitle="Sales for selected period" />
      <SheetKpiGrid
        items={[
          { label: "Net sales", value: money(overview.sales) },
          { label: "Orders", value: overview.orders || 0 },
          { label: "AOV", value: money(overview.aov) },
          { label: "Tables served", value: overview.tablesServed || 0 },
          { label: "Cancelled", value: overview.cancelCount || 0 },
          { label: "Discounts", value: money(overview.discounts) },
        ]}
      />
      <SheetSection title="Sales over time">
        <ChartCard empty={!chart.some((r) => Number(r.value) > 0)} tall>
          <TimeAreaChart data={chart} />
        </ChartCard>
      </SheetSection>
      <SheetSection title="Orders">
        <OrdersMiniTable
          orders={detail?.orders || []}
          timezone={timezone}
          onSelectOrder={onSelectOrder}
          columns="sales"
        />
      </SheetSection>
    </>
  );
}

function TipsFocusBody({ detail, timezone, onSelectOrder, focus = "tips" }) {
  const overview = detail?.overview || {};
  const employee = detail?.employee || {};
  const methods = (detail?.tipMethods || []).map((r) => ({
    label: r.method,
    value: r.tips,
  }));
  return (
    <>
      <EmployeeSheetHeaderCard
        employee={employee}
        subtitle={
          employee.receiveOwnTips
            ? "Receives own tips collected on their orders"
            : `Tip share ${Number(employee.tipPercent) || 0}% of shareable pool`
        }
      />
      <SheetKpiGrid
        items={[
          { label: "Earned tips", value: money(overview.allocatedTips) },
          { label: "Collected on orders", value: money(overview.collectedTips) },
          {
            label: "Mode",
            value: employee.receiveOwnTips ? "Own tips" : `${overview.tipPercent || 0}%`,
          },
          { label: "Shareable pool", value: money(overview.shareableTipPool) },
          { label: "Tip orders", value: overview.tipOrders || 0 },
          { label: "Tables served", value: overview.tablesServed || 0 },
        ]}
      />
      <SheetSection title="Tips by payment method">
        <ChartCard empty={!methods.some((r) => Number(r.value) > 0)}>
          <NamedBarChart data={methods} />
        </ChartCard>
      </SheetSection>
      <SheetSection title="Orders with tips">
        <OrdersMiniTable
          orders={detail?.orders || []}
          timezone={timezone}
          onSelectOrder={onSelectOrder}
          columns={focus}
        />
      </SheetSection>
    </>
  );
}

function ServiceFocusBody({ detail, timezone, onSelectOrder }) {
  const overview = detail?.overview || {};
  return (
    <>
      <EmployeeSheetHeaderCard
        employee={detail?.employee}
        subtitle="Service charges on processed orders"
      />
      <SheetKpiGrid
        items={[
          { label: "Service charges", value: money(overview.serviceCharges) },
          { label: "Avg charge", value: money(overview.averageCharge) },
          { label: "Orders with SC", value: overview.ordersWithCharge || 0 },
          { label: "Completed orders", value: overview.totalOrders || 0 },
        ]}
      />
      <SheetSection title="Orders with service charge">
        <OrdersMiniTable
          orders={detail?.orders || []}
          timezone={timezone}
          onSelectOrder={onSelectOrder}
          columns="service"
        />
      </SheetSection>
    </>
  );
}

function OrdersFocusBody({ detail, timezone, onSelectOrder }) {
  const overview = detail?.overview || {};
  return (
    <>
      <EmployeeSheetHeaderCard employee={detail?.employee} subtitle="Orders in selected period" />
      <SheetKpiGrid
        items={[
          { label: "Orders", value: overview.completedOrders || overview.totalOrders || 0 },
          { label: "Sales", value: money(overview.sales) },
          { label: "Tips collected", value: money(overview.tips) },
          { label: "Service charges", value: money(overview.serviceCharges) },
          { label: "Tables served", value: overview.tablesServed || 0 },
          { label: "Cancelled", value: overview.cancelCount || 0 },
        ]}
      />
      <SheetSection title="Orders">
        <OrdersMiniTable
          orders={detail?.orders || []}
          timezone={timezone}
          onSelectOrder={onSelectOrder}
          columns="orders"
        />
      </SheetSection>
    </>
  );
}

function CancellationsFocusBody({ detail, timezone, onSelectOrder }) {
  const overview = detail?.overview || {};
  const rows = (detail?.cancellations || []).map((row) => ({
    ...row,
    tipAmount: 0,
  }));
  return (
    <>
      <EmployeeSheetHeaderCard
        employee={detail?.employee}
        subtitle="Cancelled and waived orders"
      />
      <SheetKpiGrid
        items={[
          { label: "Total", value: overview.cancelCount || 0 },
          { label: "Amount", value: money(overview.cancelledAmount) },
          { label: "Cancelled", value: overview.cancelled || 0 },
          { label: "Waived", value: overview.waived || 0 },
        ]}
      />
      <p className="text-xs text-zinc-500 mb-3">
        Reason and cancelled-by are available for waived orders. Cancelled orders show status and
        amount only.
      </p>
      <SheetSection title="Cancellations">
        <div className="rounded-lg border border-zinc-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead>Order</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-zinc-500 text-center py-6">
                    No cancellations for this employee.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.orderId}
                    className="cursor-pointer hover:bg-orange-50/40"
                    onClick={() => onSelectOrder?.(row.orderId)}
                  >
                    <TableCell className="font-medium">#{row.orderNumber}</TableCell>
                    <TableCell className="text-xs">
                      {formatDateTz(row.createdAt, timezone)}{" "}
                      {formatTimeTz(row.createdAt, timezone)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.amount)}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">
                      {row.reason || "—"}
                    </TableCell>
                    <TableCell className="text-xs">{row.cancelledByName || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUS_BADGE[row.status] || "bg-zinc-100 text-zinc-700"}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SheetSection>
    </>
  );
}

function ClockFocusBody({ detail, timezone, showSchedule = false }) {
  const overview = detail?.overview || {};
  return (
    <>
      <EmployeeSheetHeaderCard
        employee={detail?.employee}
        subtitle="Clock punches from attendance logs"
      />
      <SheetKpiGrid
        items={[
          { label: "Punches", value: overview.punches || 0 },
          { label: "Days", value: overview.days || 0 },
          { label: "Total hours", value: formatHoursLabel(overview.totalHours) },
          { label: "Overtime", value: formatHoursLabel(overview.overtimeHours) },
        ]}
      />
      <SheetSection title="Clock in / out">
        <PunchesTable
          punches={detail?.punches || []}
          timezone={timezone}
          showSchedule={showSchedule}
        />
      </SheetSection>
    </>
  );
}

function HoursFocusBody({ detail, timezone }) {
  const overview = detail?.overview || {};
  const chart = (detail?.charts?.hoursOverTime || []).map((r) => ({
    label: r.label,
    value: r.hours ?? r.value,
  }));
  return (
    <>
      <EmployeeSheetHeaderCard employee={detail?.employee} subtitle="Working hours summary" />
      <SheetKpiGrid
        items={[
          { label: "Total hours", value: formatHoursLabel(overview.hours) },
          { label: "Regular", value: formatHoursLabel(overview.regularHours) },
          { label: "Overtime", value: formatHoursLabel(overview.overtimeHours) },
          { label: "Days worked", value: overview.daysWorked || 0 },
        ]}
      />
      <SheetSection title="Hours over time">
        <ChartCard empty={!chart.some((r) => Number(r.value) > 0)} tall>
          <TimeAreaChart data={chart} dataKey="value" moneyValue={false} />
        </ChartCard>
      </SheetSection>
      <SheetSection title="Clock logs">
        <PunchesTable punches={detail?.punches || []} timezone={timezone} />
      </SheetSection>
    </>
  );
}

function LaborFocusBody({ detail, timezone }) {
  const overview = detail?.overview || {};
  const calc = detail?.calculation || {};
  return (
    <>
      <EmployeeSheetHeaderCard
        employee={detail?.employee}
        subtitle="Hourly labor cost calculation"
      />
      <SheetKpiGrid
        items={[
          { label: "Est. pay", value: money(overview.estimatedPay) },
          { label: "Hourly rate", value: money(overview.hourlyRate) },
          { label: "OT rate", value: money(overview.overtimeRate) },
          { label: "Hours", value: formatHoursLabel(overview.hours) },
          { label: "Regular pay", value: money(overview.regularPay) },
          { label: "OT pay", value: money(overview.overtimePay) },
        ]}
      />
      <SheetSection title="How this is calculated">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2 text-sm">
          <p>
            <span className="text-zinc-500">Regular: </span>
            <span className="font-medium tabular-nums">{calc.regular?.formula}</span>
            <span className="text-zinc-500"> = </span>
            <span className="font-semibold tabular-nums">{money(calc.regular?.pay)}</span>
          </p>
          <p>
            <span className="text-zinc-500">Overtime: </span>
            <span className="font-medium tabular-nums">{calc.overtime?.formula}</span>
            <span className="text-zinc-500"> = </span>
            <span className="font-semibold tabular-nums">{money(calc.overtime?.pay)}</span>
          </p>
          <p className="pt-1 border-t border-zinc-200">
            <span className="text-zinc-500">Total: </span>
            <span className="font-semibold tabular-nums">{money(calc.total?.pay)}</span>
          </p>
          {!overview.laborConfigured ? (
            <p className="text-xs text-amber-700">
              Hourly rate is not set on this employee profile.
            </p>
          ) : null}
        </div>
      </SheetSection>
      <SheetSection title="Hours that produced this cost">
        <PunchesTable punches={detail?.punches || []} timezone={timezone} />
      </SheetSection>
    </>
  );
}

const TITLES = {
  sales: "Sales details",
  tips: "Tips details",
  tipsByPayment: "Tips by payment",
  service: "Service charges",
  orders: "Staff orders",
  cancellations: "Cancellations",
  clock: "Clock in / out",
  hours: "Working hours",
  labor: "Labor cost",
};

/**
 * Renders the page-scoped employee detail sidebar for non-overview reports.
 */
export default function FocusedEmployeeDetailSheet({
  open,
  onOpenChange,
  detailMode = "sales",
  employee,
  detail,
  loading,
  timezone,
  orderDetail,
  orderLoading,
  onSelectOrder,
  onBackFromOrder,
  showSchedule = false,
}) {
  const focus = detail?.focus || detailMode;
  const title = TITLES[focus] || "Employee details";

  let body = null;
  if (focus === "sales") {
    body = (
      <SalesFocusBody detail={detail} timezone={timezone} onSelectOrder={onSelectOrder} />
    );
  } else if (focus === "tips" || focus === "tipsByPayment") {
    body = (
      <TipsFocusBody
        detail={detail}
        timezone={timezone}
        onSelectOrder={onSelectOrder}
        focus={focus}
      />
    );
  } else if (focus === "service") {
    body = (
      <ServiceFocusBody detail={detail} timezone={timezone} onSelectOrder={onSelectOrder} />
    );
  } else if (focus === "orders") {
    body = (
      <OrdersFocusBody detail={detail} timezone={timezone} onSelectOrder={onSelectOrder} />
    );
  } else if (focus === "cancellations") {
    body = (
      <CancellationsFocusBody
        detail={detail}
        timezone={timezone}
        onSelectOrder={onSelectOrder}
      />
    );
  } else if (focus === "clock") {
    body = (
      <ClockFocusBody detail={detail} timezone={timezone} showSchedule={showSchedule} />
    );
  } else if (focus === "hours") {
    body = <HoursFocusBody detail={detail} timezone={timezone} />;
  } else if (focus === "labor") {
    body = <LaborFocusBody detail={detail} timezone={timezone} />;
  }

  return (
    <EmployeeSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={employee?.name}
      loading={loading}
      employee={detail?.employee || employee}
      orderDetail={orderDetail}
      orderLoading={orderLoading}
      onBackFromOrder={onBackFromOrder}
    >
      {detail ? body : null}
    </EmployeeSheetShell>
  );
}
