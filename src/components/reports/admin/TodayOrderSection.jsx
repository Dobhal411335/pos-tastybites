"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  ListOrdered,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { ReportPager } from "@/components/reports/inventory/reportUi";
import OrderDetailBody, {
  STATUS_BADGE,
} from "@/components/reports/OrderDetailBody";
import {
  AdminEmptyState,
  AdminKpiCard,
  AdminReportSkeleton,
  AdminTableCard,
  TD_CLASS,
  TH_CLASS,
} from "./adminReportUi";
import { money } from "./useAdminReport";

export default function TodayOrderSection({ data, loading, onPage }) {
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

  const counts = data.counts || {};
  const showDate = data.meta?.preset && data.meta.preset !== "TODAY";

  return (
    <>
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <AdminKpiCard
            label="Total Orders"
            value={counts.total}
            icon={ClipboardList}
          />
          <AdminKpiCard label="Open" value={counts.open} icon={ListOrdered} />
          <AdminKpiCard
            label="Paid"
            value={counts.paid}
            icon={CheckCircle2}
            tone="success"
          />
          <AdminKpiCard
            label="Cancelled"
            value={counts.cancelled}
            icon={XCircle}
            tone="danger"
          />
        </div>

        <AdminTableCard footer={<ReportPager data={data} onPage={onPage} />}>
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead className={TH_CLASS}>Order #</TableHead>
                {showDate ? (
                  <TableHead className={TH_CLASS}>Date</TableHead>
                ) : null}
                <TableHead className={TH_CLASS}>Time</TableHead>
                <TableHead className={TH_CLASS}>Table</TableHead>
                <TableHead className={TH_CLASS}>Server</TableHead>
                <TableHead className={TH_CLASS}>Source</TableHead>
                <TableHead className={`${TH_CLASS} text-right`}>Total</TableHead>
                <TableHead className={TH_CLASS}>Payment</TableHead>
                <TableHead className={TH_CLASS}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.rows || []).map((row) => (
                <TableRow
                  key={row.id}
                  className="h-14 cursor-pointer hover:bg-orange-50/50"
                  onClick={() => openOrder(row.id)}
                >
                  <TableCell
                    className={`${TD_CLASS} whitespace-nowrap font-medium`}
                  >
                    {row.orderNumber}
                  </TableCell>
                  {showDate ? (
                    <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                      {row.date}
                    </TableCell>
                  ) : null}
                  <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                    {row.time}
                  </TableCell>
                  <TableCell className={TD_CLASS}>{row.table}</TableCell>
                  <TableCell className={TD_CLASS}>{row.employee}</TableCell>
                  <TableCell className={TD_CLASS}>{row.source || "—"}</TableCell>
                  <TableCell
                    className={`${TD_CLASS} text-right tabular-nums font-medium`}
                  >
                    {money(row.total)}
                  </TableCell>
                  <TableCell className={TD_CLASS}>
                    {row.paymentStatus || "—"}
                  </TableCell>
                  <TableCell className={TD_CLASS}>
                    <Badge
                      variant="outline"
                      className={`text-[13px] font-normal ${
                        STATUS_BADGE[row.status] || ""
                      }`}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
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
