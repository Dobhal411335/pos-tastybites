"use client";

import { useState } from "react";
import {
  ClipboardList,
  DollarSign,
  Loader2,
  Printer,
  Receipt,
  Ticket,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { BreakdownPie } from "@/components/reports/financial/FinancialCharts";
import OrderDetailBody, {
  STATUS_BADGE,
} from "@/components/reports/OrderDetailBody";
import {
  AdminEmptyState,
  AdminKpiCard,
  AdminNote,
  AdminReportSkeleton,
  AdminTableCard,
  TD_CLASS,
  TH_CLASS,
} from "./adminReportUi";
import { money } from "./useAdminReport";

const TENDER_DOT = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-yellow-500",
  "bg-zinc-500",
];

const STRIP_TONE = {
  paid: "border-blue-200 bg-blue-50 text-blue-800",
  open: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  waived: "border-zinc-200 bg-zinc-50 text-zinc-700",
  staff: "border-violet-200 bg-violet-50 text-violet-800",
};

function BreakdownRow({ label, value, danger }) {
  return (
    <div className="flex justify-between items-end border-b border-zinc-200 pb-2">
      <span
        className={
          danger ? "text-[15px] text-red-700" : "text-[15px] text-zinc-500"
        }
      >
        {label}
      </span>
      <span
        className={
          danger
            ? "text-lg font-semibold tabular-nums text-red-700"
            : "text-lg font-semibold tabular-nums text-zinc-900"
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function DailySummarySection({
  data,
  loading,
  onViewRevenue,
  onOpenEod,
}) {
  const [orderId, setOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openOrder = async (id) => {
    setOrderId(id);
    setOrderDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setOrderDetail(json.data);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading && !data) {
    return <AdminReportSkeleton cards={4} />;
  }

  if (!data || data.empty) {
    return (
      <AdminEmptyState
        icon={ClipboardList}
        title="No orders"
        message="No orders for the selected period."
      />
    );
  }

  const kpis = data.kpis;
  const comparison = data.comparison || {};
  const deltaLabel = comparison.label || "vs prior period";
  const servers = (data.byEmployee || []).slice(0, 4);
  const maxSales = Math.max(...servers.map((row) => Number(row.sales) || 0), 1);
  const tenders = (data.paymentBreakdown || []).filter(
    (row) => Number(row.amount) > 0
  );
  const kitchen = data.kitchen || { total: 0, avgPrintMinutes: null };
  const statusStrip = data.statusStrip || [];
  const orders = data.orders || [];

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <AdminKpiCard
            label="Gross Sales"
            value={money(kpis.grossSales)}
            icon={DollarSign}
            delta={comparison.grossSales}
            deltaLabel={deltaLabel}
          />
          <AdminKpiCard
            label="Total Orders"
            value={kpis.orderCount}
            icon={Receipt}
            delta={comparison.orderCount}
            deltaLabel={deltaLabel}
          />
          <AdminKpiCard
            label="Avg Ticket Size"
            value={money(kpis.avgTicket)}
            icon={Ticket}
            delta={comparison.avgTicket}
            deltaLabel={deltaLabel}
          />
          <AdminKpiCard
            label="Guests"
            value={kpis.guests ?? 0}
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statusStrip.map((item) => (
            <div
              key={item.key}
              className={`rounded-lg border px-4 py-3 ${
                STRIP_TONE[item.key] || "border-zinc-200 bg-zinc-50 text-zinc-800"
              }`}
            >
              <p className="text-[12px] font-semibold uppercase tracking-wide opacity-80">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>

        <AdminTableCard
          title="Orders"
          action={
            data.ordersTruncated ? (
              <span className="text-[13px] text-zinc-500">
                Showing latest {orders.length} of {data.counts?.total || 0}
              </span>
            ) : null
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={TH_CLASS}>Order #</TableHead>
                  <TableHead className={TH_CLASS}>Time</TableHead>
                  <TableHead className={TH_CLASS}>Table</TableHead>
                  <TableHead className={TH_CLASS}>Guest</TableHead>
                  <TableHead className={TH_CLASS}>Server</TableHead>
                  <TableHead className={`${TH_CLASS} text-right`}>
                    Guests
                  </TableHead>
                  <TableHead className={`${TH_CLASS} text-right`}>
                    Total
                  </TableHead>
                  <TableHead className={TH_CLASS}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className={`${TD_CLASS} text-center text-zinc-500`}
                    >
                      No orders in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-zinc-50"
                      onClick={() => openOrder(row.id)}
                    >
                      <TableCell
                        className={`${TD_CLASS} whitespace-nowrap font-medium`}
                      >
                        {row.orderNumber}
                      </TableCell>
                      <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                        {row.time}
                      </TableCell>
                      <TableCell className={TD_CLASS}>{row.table}</TableCell>
                      <TableCell className={TD_CLASS}>{row.guest}</TableCell>
                      <TableCell className={TD_CLASS}>{row.employee}</TableCell>
                      <TableCell
                        className={`${TD_CLASS} text-right tabular-nums`}
                      >
                        {row.guestCount == null ? "—" : row.guestCount}
                      </TableCell>
                      <TableCell
                        className={`${TD_CLASS} text-right tabular-nums font-medium`}
                      >
                        {money(row.total)}
                      </TableCell>
                      <TableCell className={TD_CLASS}>
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-normal ${
                            STATUS_BADGE[row.status] || ""
                          }`}
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
        </AdminTableCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 rounded-lg border-zinc-200 shadow-sm">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-semibold text-zinc-900">
                Financial Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-4">
                  <BreakdownRow label="Net Sales" value={money(kpis.netSales)} />
                  <BreakdownRow label="Taxes Collected" value={money(kpis.tax)} />
                  <BreakdownRow label="Tips" value={money(kpis.tips)} />
                  <BreakdownRow
                    label="Service Charges"
                    value={money(kpis.serviceCharges)}
                  />
                </div>
                <div className="space-y-4">
                  <BreakdownRow
                    label="Discounts Applied"
                    value={`-${money(kpis.discounts)}`}
                    danger
                  />
                  <BreakdownRow
                    label="Refunds"
                    value={money(kpis.refunds || 0)}
                    danger
                  />
                  <BreakdownRow
                    label="Voids"
                    value={money(kpis.voids || 0)}
                    danger
                  />
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 p-4 rounded-lg">
                <span className="text-lg font-semibold text-zinc-900">
                  Total Expected Deposit
                </span>
                <span className="text-4xl font-bold tabular-nums text-zinc-900">
                  {money(kpis.expectedDeposit ?? kpis.collected)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-200 shadow-sm">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-semibold text-zinc-900">
                Tender Types
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 flex flex-col">
              <div className="h-48">
                {tenders.length ? (
                  <BreakdownPie data={tenders} />
                ) : (
                  <div className="h-full flex items-center justify-center text-[15px] text-zinc-400">
                    No tender data
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {tenders.map((row, i) => (
                  <div
                    key={row.method}
                    className="flex justify-between items-center py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          TENDER_DOT[i % TENDER_DOT.length]
                        }`}
                      />
                      <span className="text-[15px] text-zinc-800">
                        {row.method}
                      </span>
                    </div>
                    <span className="text-[15px] font-medium tabular-nums text-zinc-900">
                      {row.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-lg border-zinc-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
              <CardTitle className="text-lg font-semibold text-zinc-900">
                Top Servers (Sales)
              </CardTitle>
              <Button variant="link" className="px-0" onClick={onViewRevenue}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-5">
              {servers.length ? (
                servers.map((row) => (
                  <div key={String(row.employeeId)}>
                    <div className="flex justify-between text-[15px] text-zinc-900 mb-2">
                      <span className="font-semibold">{row.employeeName}</span>
                      <span className="tabular-nums font-medium">
                        {money(row.sales)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-800 rounded-full"
                        style={{
                          width: `${Math.max(
                            4,
                            Math.round((Number(row.sales) / maxSales) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[15px] text-zinc-500">
                  No employee sales for this period.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-200 shadow-sm flex flex-col">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-semibold text-zinc-900">
                Kitchen Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 flex-1 flex flex-col">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                    Total KOTs
                  </p>
                  <p className="text-4xl font-bold tabular-nums text-zinc-900">
                    {kitchen.total || 0}
                  </p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                    Avg Print Time
                  </p>
                  <p className="text-4xl font-bold tabular-nums text-zinc-900">
                    {kitchen.avgPrintMinutes == null ? (
                      "—"
                    ) : (
                      <>
                        {kitchen.avgPrintMinutes}
                        <span className="text-lg font-semibold text-zinc-500 ml-1">
                          m
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              {data.notes?.kitchen ? (
                <p className="text-[13px] text-zinc-500">{data.notes.kitchen}</p>
              ) : null}
              <div className="mt-auto pt-6">
                <Button className="w-full" size="lg" onClick={onOpenEod}>
                  <Printer className="h-4 w-4 mr-2" strokeWidth={1.75} />
                  Open EOD Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <AdminNote>
          {data.notes?.guests} {data.notes?.staffMeals} {data.notes?.voided}{" "}
          {data.notes?.refunded}
        </AdminNote>
      </div>

      <Sheet
        open={Boolean(orderId)}
        onOpenChange={(open) => {
          if (!open) {
            setOrderId(null);
            setOrderDetail(null);
          }
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              Order #{orderDetail?.orderNumber || (detailLoading ? "…" : "")}
            </SheetTitle>
            <SheetDescription>
              Existing order record. Totals are stored POS values.
            </SheetDescription>
          </SheetHeader>
          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : orderDetail ? (
            <OrderDetailBody order={orderDetail} />
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Order could not be loaded.
            </p>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
