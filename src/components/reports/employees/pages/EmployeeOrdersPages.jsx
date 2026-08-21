"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import OrderDetailBody from "@/components/reports/OrderDetailBody";
import EmployeeReportPageShell from "../EmployeeReportPageShell";
import {
  ChartCard,
  DonutChart,
  EmployeeKpiCards,
  NamedBarChart,
  ReportEmpty,
  TableSkeleton,
} from "../EmployeeReportUi";
import { formatDateTz, formatTimeTz, money, STATUS_BADGE } from "../employeeFormat";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function EmployeeOrdersReport() {
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const openOrder = async (orderId) => {
    if (!orderId) return;
    setOrderLoading(true);
    setOrderDetail(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Unable to load order.");
      setOrderDetail(json.data);
    } catch (err) {
      toast.error(err.message || "Unable to load order.");
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <>
      <EmployeeReportPageShell
        title="Staff Order List"
        description="Orders attributed to the employee who processed them."
        section="orders"
        exportView="orders"
        detailMode="orders"
        paginate
        showSearch
        searchPlaceholder="Search order #"
      >
        {({ data, loading, openEmployee, applyFilters, filters, timezone }) => {
          const rows = data?.rows || [];
          const pagination = data?.pagination || {};

          if (!loading && rows.length === 0) {
            return <ReportEmpty message="No orders for this period." />;
          }

          return (
            <div className="space-y-4">
              <EmployeeKpiCards
                loading={loading}
                title="Order list highlights"
                description="Orders processed by staff in this period"
                items={[
                  { label: "Orders shown", value: rows.length },
                  { label: "Total matching", value: pagination.total || rows.length },
                  {
                    label: "Page",
                    value: `${pagination.page || filters.page || 1} / ${pagination.pages || 1}`,
                  },
                  {
                    label: "Order total",
                    value: rows.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0),
                    money: true,
                  },
                ]}
              />
              <div className="w-full rounded-lg border border-zinc-200 bg-white overflow-x-auto">
                {loading ? (
                  <div className="p-4"><TableSkeleton cols={8} /></div>
                ) : (
                  <Table className="min-w-[1480px] table-fixed">
                    <TableHeader>
                      <TableRow className="bg-zinc-50">
                        <TableHead className="w-[88px]">Order</TableHead>
                        <TableHead className="w-[120px]">Date/Time</TableHead>
                        <TableHead className="w-[140px]">Employee</TableHead>
                        <TableHead className="w-[200px]">Table</TableHead>
                        <TableHead className="w-[180px]">Items</TableHead>
                        <TableHead className="w-[96px] text-right">Subtotal</TableHead>
                        <TableHead className="w-[88px] text-right">Discount</TableHead>
                        <TableHead className="w-[80px] text-right">Tax</TableHead>
                        <TableHead className="w-[80px] text-right">Svc</TableHead>
                        <TableHead className="w-[80px] text-right">Tip</TableHead>
                        <TableHead className="w-[96px] text-right">Total</TableHead>
                        <TableHead className="w-[100px]">Payment</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow
                          key={row.orderId}
                          className="cursor-pointer hover:bg-orange-50/40"
                          onClick={() => openOrder(row.orderId)}
                        >
                          <TableCell className="font-semibold text-sm whitespace-nowrap">
                            #{row.orderNumber}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums whitespace-nowrap">
                            <p>{formatDateTz(row.createdAt, timezone)}</p>
                            <p className="text-xs text-zinc-400">
                              {formatTimeTz(row.createdAt, timezone)}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <button
                              type="button"
                              className="text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (row.employeeId) {
                                  openEmployee(row.employeeId, {
                                    employeeId: row.employeeId,
                                    name: row.employeeName,
                                  });
                                }
                              }}
                            >
                              <p className="text-sm font-semibold hover:text-orange-600">
                                {row.employeeName}
                              </p>
                            </button>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {row.tableNo || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-600 truncate">
                            {row.itemSummary || `${row.itemCount || 0} items`}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                            {money(row.subTotal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                            {money(row.discountTotal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                            {money(row.taxTotal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                            {money(row.serviceChargeTotal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                            {money(row.tipAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-semibold whitespace-nowrap">
                            {money(row.totalAmount)}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {row.paymentLabel || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              className={`border-none text-[10px] ${
                                STATUS_BADGE[row.status] || "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              {pagination.pages > 1 ? (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() => applyFilters({ page: filters.page - 1 })}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-zinc-500">
                    Page {pagination.page} / {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= pagination.pages}
                    onClick={() => applyFilters({ page: filters.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          );
        }}
      </EmployeeReportPageShell>

      <Sheet
        open={Boolean(orderDetail) || orderLoading}
        onOpenChange={(open) => {
          if (!open) setOrderDetail(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              Order #{orderDetail?.orderNumber || (orderLoading ? "…" : "")}
            </SheetTitle>
            <SheetDescription>Full order details</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {orderLoading ? (
              <TableSkeleton rows={8} cols={2} />
            ) : orderDetail ? (
              <OrderDetailBody order={orderDetail} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function EmployeeCancellationsReport() {
  return (
    <EmployeeReportPageShell
      title="Cancellation Report"
      description="Cancelled and waived orders by employee."
      section="cancellations"
      exportView="cancellations"
      detailMode="cancellations"
      paginate
      showSearch
      searchPlaceholder="Search order #"
    >
      {({ data, loading, openEmployee, applyFilters, filters, timezone }) => {
        const overview = data?.overview || {};
        const rows = data?.rows || [];
        const charts = data?.charts || {};
        const pagination = data?.pagination || {};

        if (!loading && (overview.totalCancellations || 0) === 0) {
          return <ReportEmpty message="No cancellations for this period." />;
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              title="Cancellation highlights"
              description="Cancelled and waived order totals for this period"
              items={[
                { label: "Total Cancellations", value: overview.totalCancellations || 0 },
                { label: "Cancelled Amount", value: overview.cancelledAmount, money: true },
                {
                  label: "Cancellation Rate",
                  value: `${Number(overview.cancellationRate || 0).toFixed(1)}%`,
                },
                {
                  label: "Employees",
                  value: overview.employeesWithCancellations || 0,
                },
              ]}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <ChartCard
                title="Cancellations over time"
                loading={loading}
                empty={!charts.cancellationsOverTime?.some((r) => Number(r.value) > 0)}
              >
                <NamedBarChart
                  data={charts.cancellationsOverTime || []}
                  moneyValue={false}
                />
              </ChartCard>
              <ChartCard
                title="By employee"
                loading={loading}
                empty={!charts.cancellationsByEmployee?.length}
              >
                <NamedBarChart
                  data={(charts.cancellationsByEmployee || []).slice(0, 8)}
                  moneyValue={false}
                  color="#ef4444"
                />
              </ChartCard>
              <ChartCard
                title="Amount by employee"
                loading={loading}
                empty={!charts.cancellationAmountByEmployee?.length}
              >
                <NamedBarChart
                  data={(charts.cancellationAmountByEmployee || []).slice(0, 8)}
                  color="#ef4444"
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
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Cancelled By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.orderId}
                        className="cursor-pointer hover:bg-orange-50/40"
                        onClick={() =>
                          row.employeeId &&
                          openEmployee(row.employeeId, {
                            employeeId: row.employeeId,
                            name: row.employeeName,
                          })
                        }
                      >
                        <TableCell className="text-sm font-semibold">
                          {row.employeeName}
                        </TableCell>
                        <TableCell className="text-sm">#{row.orderNumber}</TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {formatDateTz(row.createdAt, timezone)}{" "}
                          <span className="text-zinc-400">
                            {formatTimeTz(row.createdAt, timezone)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {money(row.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-600 max-w-48 truncate">
                          {row.reason || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{row.cancelledBy || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            className={`border-none text-[10px] ${
                              STATUS_BADGE[row.status] || "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {pagination.pages > 1 ? (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() => applyFilters({ page: filters.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-xs text-zinc-500">
                  Page {pagination.page} / {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= pagination.pages}
                  onClick={() => applyFilters({ page: filters.page + 1 })}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}

export function EmployeeTipsByPaymentReport() {
  return (
    <EmployeeReportPageShell
      title="Tips by Payment Method"
      description="Collected tips by tender, plus earned allocation by tip mode."
      section="tipsbypayment"
      exportView="tips-by-payment"
      detailMode="tipsByPayment"
    >
      {({ data, loading, openEmployee }) => {
        const overview = data?.overview || {};
        const methods = data?.methods || [];
        const byEmployee = data?.byEmployee || [];
        const earnedByEmployee = data?.earnedByEmployee || [];
        const charts = data?.charts || {};

        if (!loading && methods.length === 0) {
          return <ReportEmpty message="No tips found for this period." />;
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              title="Tips by payment highlights"
              description="Collected by tender and earned tip allocation"
              items={[
                { label: "Collected Tips", value: overview.totalTips, money: true },
                { label: "Earned Tips", value: overview.totalEarned, money: true },
                { label: "Shareable Pool", value: overview.shareableTipPool, money: true },
                { label: "Tipped Orders", value: overview.totalOrders || 0 },
                { label: "Average Tip", value: overview.averageTip, money: true },
                { label: "Methods", value: overview.methods || 0 },
              ]}
            />
            {data?.meta?.note ? (
              <p className="text-xs text-zinc-500">{data.meta.note}</p>
            ) : null}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard
                title="Collected tips by method"
                loading={loading}
                empty={!charts.tipsByMethod?.length}
              >
                <DonutChart data={charts.tipsByMethod || []} />
              </ChartCard>
              <ChartCard
                title="Earned tips by employee"
                loading={loading}
                empty={!charts.earnedByEmployee?.some((r) => Number(r.value) > 0)}
              >
                <NamedBarChart
                  data={(charts.earnedByEmployee || []).slice(0, 10).map((r) => ({
                    label: r.label,
                    value: r.value,
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
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Collected Tips</TableHead>
                      <TableHead className="text-right">Average Tip</TableHead>
                      <TableHead className="text-right">Tip % of sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {methods.map((row) => (
                      <TableRow key={row.method}>
                        <TableCell className="font-semibold text-sm">{row.method}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(row.tips)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(row.averageTip)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(row.tipPercent || 0).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Earned tips by employee
              </p>
              <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden mb-4">
                {loading ? (
                  <div className="p-4"><TableSkeleton /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50">
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Mode</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Earned</TableHead>
                        <TableHead className="text-right">Tip orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnedByEmployee.map((row) => (
                        <TableRow
                          key={row.employeeId}
                          className="cursor-pointer hover:bg-orange-50/40"
                          onClick={() => openEmployee(row.employeeId, row)}
                        >
                          <TableCell>
                            <p className="text-sm font-semibold">{row.name}</p>
                            <p className="text-xs text-zinc-500">{row.role}</p>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {row.receiveOwnTips ? "Own" : `${row.tipPercent || 0}%`}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(row.collectedTips)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(row.earnedTips)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Collected by employee × method
              </p>
              <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
                {loading ? (
                  <div className="p-4"><TableSkeleton /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50">
                        <TableHead>Employee</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Tips</TableHead>
                        <TableHead className="text-right">Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byEmployee.map((row, idx) => (
                        <TableRow
                          key={`${row.employeeId}-${row.method}-${idx}`}
                          className={
                            row.employeeId
                              ? "cursor-pointer hover:bg-orange-50/40"
                              : undefined
                          }
                          onClick={() =>
                            row.employeeId &&
                            openEmployee(row.employeeId, {
                              employeeId: row.employeeId,
                              name: row.name,
                              role: row.role,
                            })
                          }
                        >
                          <TableCell>
                            <p className="text-sm font-semibold">{row.name}</p>
                            <p className="text-xs text-zinc-500">{row.role}</p>
                          </TableCell>
                          <TableCell className="text-sm">{row.method}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(row.tips)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(row.averageTip)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </EmployeeReportPageShell>
  );
}
