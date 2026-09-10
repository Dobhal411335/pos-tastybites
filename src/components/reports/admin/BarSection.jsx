"use client";

import { CheckCircle2, Clock, Wine, XCircle } from "lucide-react";
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

const STATUS_BADGE = {
  QUEUED: "border-amber-200 bg-amber-50 text-amber-800",
  PRINTING: "border-sky-200 bg-sky-50 text-sky-800",
  PRINTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-600",
};

export default function BarSection({ data, loading, onPage }) {
  if (loading && !data) {
    return <AdminReportSkeleton cards={4} />;
  }

  if (!data || data.empty) {
    return (
      <div className="space-y-4">
        {data?.note ? <AdminNote>{data.note}</AdminNote> : null}
        <AdminEmptyState
          icon={Wine}
          title="No bar tickets"
          message="No bar tickets for the selected period."
        />
      </div>
    );
  }

  const counts = data.counts;

  return (
    <div className="space-y-8">
      {data.note ? <AdminNote>{data.note}</AdminNote> : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <AdminKpiCard label="Total tickets" value={counts.total} icon={Wine} />
        <AdminKpiCard
          label="Completed"
          value={counts.completed}
          icon={CheckCircle2}
          tone="success"
        />
        <AdminKpiCard label="Pending" value={counts.pending} icon={Clock} />
        <AdminKpiCard
          label="Failed"
          value={counts.failed}
          icon={XCircle}
          tone="danger"
        />
      </div>

      <AdminTableCard footer={<ReportPager data={data} onPage={onPage} />}>
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className={TH_CLASS}>Ticket #</TableHead>
              <TableHead className={TH_CLASS}>Order #</TableHead>
              <TableHead className={TH_CLASS}>Time</TableHead>
              <TableHead className={TH_CLASS}>Table</TableHead>
              <TableHead className={TH_CLASS}>Server</TableHead>
              <TableHead className={TH_CLASS}>Items</TableHead>
              <TableHead className={TH_CLASS}>Status</TableHead>
              <TableHead className={TH_CLASS}>Reprint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.id} className="h-14 hover:bg-zinc-50">
                <TableCell
                  className={`${TD_CLASS} whitespace-nowrap font-medium`}
                >
                  {row.ticketNumber || row.kotNumber}
                </TableCell>
                <TableCell className={TD_CLASS}>{row.orderNumber}</TableCell>
                <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                  {row.time}
                </TableCell>
                <TableCell className={TD_CLASS}>{row.table}</TableCell>
                <TableCell className={TD_CLASS}>{row.employee}</TableCell>
                <TableCell
                  className={`${TD_CLASS} max-w-[180px] truncate text-zinc-600`}
                >
                  {row.itemsSummary || "—"}
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
                <TableCell className={TD_CLASS}>
                  {row.reprint ? "Yes" : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>

      <AdminTableCard title="Top bar items">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className={TH_CLASS}>Rank</TableHead>
              <TableHead className={TH_CLASS}>Product</TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>
                Quantity
              </TableHead>
              <TableHead className={`${TH_CLASS} text-right`}>Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.topItems || []).map((row) => (
              <TableRow
                key={`${row.rank}-${row.item}`}
                className="h-14 hover:bg-zinc-50"
              >
                <TableCell className={`${TD_CLASS} tabular-nums`}>
                  {row.rank}
                </TableCell>
                <TableCell className={`${TD_CLASS} font-medium`}>
                  {row.item}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {row.quantity}
                </TableCell>
                <TableCell className={`${TD_CLASS} text-right tabular-nums`}>
                  {row.orderCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
