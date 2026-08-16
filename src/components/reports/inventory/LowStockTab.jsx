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
import { qty } from "./useInventoryReport";
import { ReportPager, StockStatusBadge } from "./reportUi";

export default function LowStockTab({ data, loading, onPage }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <FinancialEmpty message="All products are currently above their stock threshold." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase">Product</TableHead>
              <TableHead className="text-[11px] uppercase">Category</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Current Stock</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Minimum Stock</TableHead>
              <TableHead className="text-[11px] uppercase">Status</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Quantity Needed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.rows || []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                <TableCell className="whitespace-nowrap">{row.categoryName}</TableCell>
                <TableCell className="tabular-nums text-right">{qty(row.currentBalance)}</TableCell>
                <TableCell className="tabular-nums text-right">
                  {row.minStock == null ? "—" : qty(row.minStock)}
                </TableCell>
                <TableCell>
                  <StockStatusBadge status={row.stockStatus} />
                </TableCell>
                <TableCell className="tabular-nums text-right">
                  {row.quantityNeeded == null ? "—" : qty(row.quantityNeeded)}
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
