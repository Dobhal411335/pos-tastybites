"use client";

import { Gift, Percent, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportPager } from "@/components/reports/inventory/reportUi";
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

const EVENT_BADGE = {
  ORDER_CANCELLED: "border-red-200 bg-red-50 text-red-700",
  DISCOUNT_APPLIED: "border-amber-200 bg-amber-50 text-amber-800",
  GIFT_CARD_USED: "border-sky-200 bg-sky-50 text-sky-800",
};

export default function AuditSection({ data, loading, onPage }) {
  if (loading && !data) {
    return <AdminReportSkeleton cards={4} />;
  }

  if (!data || data.empty) {
    return (
      <div className="space-y-4">
        {data?.notes?.unsupported ? (
          <AdminNote>{data.notes.unsupported}</AdminNote>
        ) : null}
        <AdminEmptyState
          icon={ShieldCheck}
          title="No exceptions"
          message="No exception events for the selected period."
        />
      </div>
    );
  }

  const summary = data.summary;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <AdminKpiCard
          label="Total Events"
          value={summary.total}
          icon={ShieldCheck}
        />
        <AdminKpiCard
          label="Cancelled / Waived"
          value={summary.cancelled}
          icon={XCircle}
          tone="danger"
        />
        <AdminKpiCard
          label="Discounted Orders"
          value={summary.discounted}
          icon={Percent}
        />
        <AdminKpiCard
          label="Gift Card Used"
          value={summary.giftCard}
          icon={Gift}
        />
      </div>
      {data.notes?.unsupported ? (
        <AdminNote>{data.notes.unsupported}</AdminNote>
      ) : null}

      <AdminTableCard footer={<ReportPager data={data} onPage={onPage} />}>
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className={TH_CLASS}>Date</TableHead>
              <TableHead className={TH_CLASS}>Time</TableHead>
              <TableHead className={TH_CLASS}>Order #</TableHead>
              <TableHead className={TH_CLASS}>Employee</TableHead>
              <TableHead className={TH_CLASS}>Event Type</TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>Amount</TableHead>
              <TableHead className={TH_CLASS}>Reason</TableHead>
              <TableHead className={TH_CLASS}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.id} className="h-14 hover:bg-zinc-50">
                <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                  {row.date}
                </TableCell>
                <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                  {row.time}
                </TableCell>
                <TableCell className={`${TD_CLASS} font-medium`}>
                  {row.orderNumber}
                </TableCell>
                <TableCell className={TD_CLASS}>{row.employee}</TableCell>
                <TableCell className={TD_CLASS}>
                  <Badge
                    variant="outline"
                    className={`text-[13px] font-normal ${
                      EVENT_BADGE[row.eventType] || ""
                    }`}
                  >
                    {row.eventType}
                  </Badge>
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {money(row.amount)}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-zinc-600`}>
                  {row.reason}
                </TableCell>
                <TableCell className={TD_CLASS}>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
