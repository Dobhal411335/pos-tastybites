"use client";

import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FinancialEmpty from "@/components/reports/financial/FinancialEmpty";
import { money, qty } from "./useInventoryReport";
import { ReportPager, StockStatusBadge } from "./reportUi";

export default function StockTab({ data, loading, onPage }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data || data.empty) {
    return <FinancialEmpty message="No products found." />;
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase whitespace-nowrap">Product</TableHead>
              <TableHead className="text-[11px] uppercase whitespace-nowrap">Category</TableHead>
              <TableHead className="text-[11px] uppercase whitespace-nowrap text-right">Current Stock</TableHead>
              <TableHead className="text-[11px] uppercase whitespace-nowrap">Unit</TableHead>
              <TableHead className="text-[11px] uppercase whitespace-nowrap text-right">Minimum Stock</TableHead>
              <TableHead className="text-[11px] uppercase whitespace-nowrap">Stock Status</TableHead>
              <TableHead className="text-[11px] uppercase whitespace-nowrap text-right">Units Out</TableHead>
              <TableHead className="text-[11px] uppercase whitespace-nowrap text-right">Stock Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.rows || []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                <TableCell className="whitespace-nowrap">{row.categoryName}</TableCell>
                <TableCell className="tabular-nums text-right">{qty(row.currentBalance)}</TableCell>
                <TableCell>{row.unit || "—"}</TableCell>
                <TableCell className="tabular-nums text-right">
                  {row.minStock == null ? "—" : qty(row.minStock)}
                </TableCell>
                <TableCell>
                  <StockStatusBadge status={row.stockStatus} />
                </TableCell>
                <TableCell className="tabular-nums text-right">{qty(row.unitsOutPeriod)}</TableCell>
                <TableCell className="tabular-nums text-right">{money(row.stockValue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ReportPager data={data} onPage={onPage} />
    </div>
  );
}
