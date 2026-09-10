"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChefHat,
  ClipboardList,
  DollarSign,
  Gift,
  Loader2,
  Percent,
  Printer,
  Sunset,
  Users,
  Wine,
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

const STRIP_TONE = {
  paid: "border-blue-200 bg-blue-50 text-blue-800",
  open: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  waived: "border-zinc-200 bg-zinc-50 text-zinc-700",
  staff: "border-violet-200 bg-violet-50 text-violet-800",
};

const EOD_TONE = {
  Closed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Open: "border-amber-200 bg-amber-50 text-amber-800",
  Range: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

function OpsStat({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-2 last:border-0">
      <span className="text-[14px] text-zinc-500">{label}</span>
      <span className="text-[15px] font-semibold tabular-nums text-zinc-900">
        {value}
      </span>
    </div>
  );
}

export default function DailySummarySection({
  data,
  loading,
  onViewRevenue,
  onViewOrders,
  onOpenEod,
  onViewKitchen,
  onViewBar,
  onViewActivity,
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
        title="No activity found"
        message="No orders for the selected period."
      />
    );
  }

  const kpis = data.kpis || {};
  const comparison = data.comparison || {};
  const deltaLabel = comparison.label || "vs prior period";
  const statusStrip = data.statusStrip || [];
  const orders = data.orders || [];
  const attention = data.attention || [];
  const kitchen = data.kitchen || {};
  const bar = data.bar || {};
  const printing = data.printing || {};
  const eod = data.eod || {};
  const activityPeek = data.activityPeek || [];
  const tenders = (data.paymentBreakdown || []).filter(
    (row) => Number(row.amount) > 0
  );

  return (
    <>
      <div className="flex flex-col gap-8">
        {(attention.length > 0 || data.notes?.refunds) && (
          <div className="space-y-3">
            {attention.length > 0 ? (
              <Card className="rounded-lg border-amber-200 bg-amber-50/60 shadow-sm">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                    Needs attention
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-2 flex flex-wrap gap-2">
                  {attention.map((item) => (
                    <Button
                      key={item.key}
                      variant="outline"
                      size="sm"
                      className="border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                      onClick={() => {
                        if (item.href?.includes("kitchen") && onViewKitchen) {
                          onViewKitchen();
                        } else if (item.href?.includes("bar") && onViewBar) {
                          onViewBar();
                        } else if (item.href?.includes("today-order") && onViewOrders) {
                          onViewOrders();
                        } else if (item.href?.includes("eod") && onOpenEod) {
                          onOpenEod();
                        }
                      }}
                    >
                      {item.label}
                      <Badge
                        variant="outline"
                        className="ml-2 border-amber-300 text-amber-900"
                      >
                        {item.count}
                      </Badge>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            ) : null}
            <AdminNote>
              {data.notes?.refunds} {data.notes?.voids}
            </AdminNote>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <AdminKpiCard
            label="Orders"
            value={data.counts?.total || 0}
            icon={ClipboardList}
            delta={comparison.orderCount}
            deltaLabel={deltaLabel}
          />
          <AdminKpiCard
            label="Gross Sales"
            value={money(kpis.grossSales)}
            icon={DollarSign}
            delta={comparison.grossSales}
            deltaLabel={deltaLabel}
          />
          <AdminKpiCard
            label="Collected"
            value={money(kpis.collected)}
            icon={DollarSign}
          />
          <AdminKpiCard
            label="Discounts"
            value={money(kpis.discounts)}
            icon={Percent}
          />
          <AdminKpiCard
            label="Gift Card Redeemed"
            value={money(kpis.giftCard)}
            icon={Gift}
          />
          <AdminKpiCard
            label="Active Employees"
            value={kpis.activeEmployees || 0}
            icon={Users}
          />
          <AdminKpiCard
            label="Net Sales"
            value={money(kpis.netSales)}
            icon={DollarSign}
          />
          <AdminKpiCard
            label="Avg Ticket"
            value={money(kpis.avgTicket)}
            icon={DollarSign}
            delta={comparison.avgTicket}
            deltaLabel={deltaLabel}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {statusStrip.map((item) => (
            <Badge
              key={item.key}
              variant="outline"
              className={`text-[13px] font-normal px-3 py-1.5 ${
                STRIP_TONE[item.key] || ""
              }`}
            >
              {item.label}: {item.value}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card className="rounded-lg border-zinc-200 shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ChefHat className="h-4 w-4" strokeWidth={1.75} />
                Kitchen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <OpsStat label="Tickets" value={kitchen.total || 0} />
              <OpsStat label="Pending" value={kitchen.pending || 0} />
              <OpsStat label="Printed" value={kitchen.completed || 0} />
              <OpsStat label="Failed" value={kitchen.failed || 0} />
              {onViewKitchen ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 px-0"
                  onClick={onViewKitchen}
                >
                  View kitchen log
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-200 shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Wine className="h-4 w-4" strokeWidth={1.75} />
                Bar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <OpsStat label="Tickets" value={bar.total || 0} />
              <OpsStat label="Pending" value={bar.pending || 0} />
              <OpsStat label="Printed" value={bar.completed || 0} />
              <OpsStat label="Failed" value={bar.failed || 0} />
              {onViewBar ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 px-0"
                  onClick={onViewBar}
                >
                  View bar log
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-200 shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Printer className="h-4 w-4" strokeWidth={1.75} />
                Printing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <OpsStat label="Printed" value={printing.completed || 0} />
              <OpsStat label="Pending" value={printing.pending || 0} />
              <OpsStat label="Failed" value={printing.failed || 0} />
              <OpsStat label="Reprints" value={printing.reprints || 0} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-200 shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Sunset className="h-4 w-4" strokeWidth={1.75} />
                End of Day
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <Badge
                variant="outline"
                className={EOD_TONE[eod.status] || EOD_TONE.Open}
              >
                {eod.status || "Open"}
              </Badge>
              {eod.businessDate ? (
                <p className="text-[13px] text-zinc-500">
                  Business date {eod.businessDate}
                </p>
              ) : (
                <p className="text-[13px] text-zinc-500">
                  Select a single day to see close status.
                </p>
              )}
              {onOpenEod ? (
                <Button className="w-full" size="sm" onClick={onOpenEod}>
                  Open EOD report
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="rounded-lg border-zinc-200 shadow-sm lg:col-span-1">
            <CardHeader className="p-5 pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold">Payments</CardTitle>
              {onViewRevenue ? (
                <Button variant="ghost" size="sm" onClick={onViewRevenue}>
                  Revenue
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {tenders.length === 0 ? (
                <p className="text-sm text-zinc-500">No payments in period.</p>
              ) : (
                tenders.map((row) => (
                  <OpsStat
                    key={row.method}
                    label={`${row.method} (${row.count || 0})`}
                    value={money(row.amount)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <AdminTableCard
              title="Recent orders"
              action={
                onViewOrders ? (
                  <Button variant="ghost" size="sm" onClick={onViewOrders}>
                    {data.ordersTruncated
                      ? `View all (${data.counts?.total || 0})`
                      : "View all"}
                  </Button>
                ) : null
              }
            >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={TH_CLASS}>Order #</TableHead>
                    <TableHead className={TH_CLASS}>Time</TableHead>
                    <TableHead className={TH_CLASS}>Table</TableHead>
                    <TableHead className={TH_CLASS}>Server</TableHead>
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
                        colSpan={6}
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
                        <TableCell className={TD_CLASS}>{row.employee}</TableCell>
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
            </AdminTableCard>
          </div>
        </div>

        <AdminTableCard
          title="Recent admin activity"
          action={
            onViewActivity ? (
              <Button variant="ghost" size="sm" onClick={onViewActivity}>
                View all
              </Button>
            ) : null
          }
        >
          {data.notes?.activity ? (
            <p className="px-1 pb-3 text-[13px] text-zinc-500">
              {data.notes.activity}
            </p>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TH_CLASS}>Time</TableHead>
                <TableHead className={TH_CLASS}>Actor</TableHead>
                <TableHead className={TH_CLASS}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityPeek.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className={`${TD_CLASS} text-center text-zinc-500`}
                  >
                    No floor/POS activity for this period.
                  </TableCell>
                </TableRow>
              ) : (
                activityPeek.map((row) => (
                  <TableRow key={row.id} className="h-12">
                    <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                      {row.time}
                    </TableCell>
                    <TableCell className={TD_CLASS}>{row.actor}</TableCell>
                    <TableCell className={TD_CLASS}>{row.action}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </AdminTableCard>
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
