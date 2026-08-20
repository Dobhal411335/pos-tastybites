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
              <div className="rounded-lg border border-zinc-200 bg-white overflow-x-auto">
                {loading ? (
                  <div className="p-4"><TableSkeleton cols={8} /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50">
                        <TableHead>Order</TableHead>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Svc</TableHead>
                        <TableHead className="text-right">Tip</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow
                          key={row.orderId}
                          className="cursor-pointer hover:bg-orange-50/40"
                          onClick={() => openOrder(row.orderId)}
                        >
                          <TableCell className="font-semibold text-sm">
                            #{row.orderNumber}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            <p>{formatDateTz(row.createdAt, timezone)}</p>
                            <p className="text-xs text-zinc-400">
                              {formatTimeTz(row.createdAt, timezone)}
                            </p>
                          </TableCell>
                          <TableCell>
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
                          <TableCell className="text-sm">{row.tableNo || "—"}</TableCell>
                          <TableCell className="text-xs text-zinc-600 max-w-40 truncate">
                            {row.itemSummary || `${row.itemCount || 0} items`}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {money(row.subTotal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {money(row.discountTotal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {money(row.taxTotal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {money(row.serviceChargeTotal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {money(row.tipAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-semibold">
                            {money(row.totalAmount)}
                          </TableCell>
                          <TableCell className="text-xs">{row.paymentLabel || "—"}</TableCell>
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
      description="Collected tips grouped by cash, card, gift card, or other."
      section="tipsbypayment"
    >
      {({ data, loading, openEmployee }) => {
        const overview = data?.overview || {};
        const methods = data?.methods || [];
        const byEmployee = data?.byEmployee || [];
        const charts = data?.charts || {};

        if (!loading && methods.length === 0) {
          return <ReportEmpty message="No tips found for this period." />;
        }

        return (
          <div className="space-y-4">
            <EmployeeKpiCards
              loading={loading}
              items={[
                { label: "Total Tips", value: overview.totalTips, money: true },
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
                title="Tips by method"
                loading={loading}
                empty={!charts.tipsByMethod?.length}
              >
                <DonutChart data={charts.tipsByMethod || []} />
              </ChartCard>
              <ChartCard
                title="Method amounts"
                loading={loading}
                empty={!methods.length}
              >
                <NamedBarChart
                  data={methods.map((r) => ({ label: r.method, value: r.tips }))}
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
                      <TableHead className="text-right">Tips</TableHead>
                      <TableHead className="text-right">Average Tip</TableHead>
                      <TableHead className="text-right">Tip %</TableHead>
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
                Employee breakdown
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
