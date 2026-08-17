"use client";

import { Activity } from "lucide-react";
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
  AdminNote,
  AdminReportSkeleton,
  AdminTableCard,
  TD_CLASS,
  TH_CLASS,
} from "./adminReportUi";

export default function ActivitySection({ data, loading, onPage }) {
  if (loading && !data) {
    return <AdminReportSkeleton cards={0} />;
  }

  if (!data || data.empty) {
    return (
      <div className="space-y-4">
        {data?.note ? <AdminNote>{data.note}</AdminNote> : null}
        <AdminEmptyState
          icon={Activity}
          title="No activity"
          message="No recorded activity for the selected period."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.note ? <AdminNote>{data.note}</AdminNote> : null}
      <AdminTableCard
        footer={<ReportPager data={data} onPage={onPage} />}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className={TH_CLASS}>Date</TableHead>
              <TableHead className={TH_CLASS}>Time</TableHead>
              <TableHead className={TH_CLASS}>Admin</TableHead>
              <TableHead className={TH_CLASS}>Action</TableHead>
              <TableHead className={TH_CLASS}>Module</TableHead>
              <TableHead className={TH_CLASS}>Target</TableHead>
              <TableHead className={TH_CLASS}>Description</TableHead>
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
                  {row.admin}
                </TableCell>
                <TableCell className={TD_CLASS}>
                  <Badge variant="outline" className="text-[13px] font-normal">
                    {row.action}
                  </Badge>
                </TableCell>
                <TableCell className={TD_CLASS}>{row.module}</TableCell>
                <TableCell className={TD_CLASS}>{row.target}</TableCell>
                <TableCell className={`${TD_CLASS} text-zinc-600 max-w-xs`}>
                  {row.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
