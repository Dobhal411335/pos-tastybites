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
import { qty } from "./useInventoryReport";
import { ReportPager } from "./reportUi";

export default function MovementTab({ data, loading, onPage }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <FinancialEmpty message="No stock movement recorded for this period." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Date",
                "Time",
                "Product",
                "Category",
                "Type",
                "Quantity",
                "Previous Stock",
                "New Stock",
                "Reason",
                "Performed By",
              ].map((label) => (
                <TableHead key={label} className="text-[11px] uppercase whitespace-nowrap">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.rows || []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{row.date}</TableCell>
                <TableCell className="whitespace-nowrap">{row.time}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{row.product}</TableCell>
                <TableCell className="whitespace-nowrap">{row.category}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      row.movementType === "STOCK_IN"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-orange-200 bg-orange-50 text-orange-700"
                    }`}
                  >
                    {row.movementLabel}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums text-right">{qty(row.quantity)}</TableCell>
                <TableCell className="tabular-nums text-right">
                  {row.previousStock == null ? "—" : qty(row.previousStock)}
                </TableCell>
                <TableCell className="tabular-nums text-right">
                  {row.newStock == null ? "—" : qty(row.newStock)}
                </TableCell>
                <TableCell className="whitespace-nowrap">{row.reason}</TableCell>
                <TableCell className="whitespace-nowrap">{row.performedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ReportPager data={data} onPage={onPage} />
    </div>
  );
}
