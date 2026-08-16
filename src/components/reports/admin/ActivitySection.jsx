"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FinancialEmpty from "@/components/reports/financial/FinancialEmpty";
import { ReportPager } from "@/components/reports/inventory/reportUi";

export default function ActivitySection({ data, loading, onPage }) {
  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <div className="space-y-3">
        {data?.note ? (
          <p className="text-xs text-zinc-500 border border-zinc-200 rounded-lg bg-white px-3 py-2">
            {data.note}
          </p>
        ) : null}
        <FinancialEmpty message="No recorded activity for the selected period." />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 border border-zinc-200 rounded-lg bg-white px-3 py-2">
        {data.note}
      </p>
      <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase">Date</TableHead>
              <TableHead className="text-[11px] uppercase">Time</TableHead>
              <TableHead className="text-[11px] uppercase">Admin</TableHead>
              <TableHead className="text-[11px] uppercase">Action</TableHead>
              <TableHead className="text-[11px] uppercase">Module</TableHead>
              <TableHead className="text-[11px] uppercase">Target</TableHead>
              <TableHead className="text-[11px] uppercase">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs">{row.date}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{row.time}</TableCell>
                <TableCell className="text-xs">{row.admin}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {row.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{row.module}</TableCell>
                <TableCell className="text-xs">{row.target}</TableCell>
                <TableCell className="text-xs text-zinc-600 max-w-xs">
                  {row.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ReportPager data={data} onPage={onPage} />
    </div>
  );
}
