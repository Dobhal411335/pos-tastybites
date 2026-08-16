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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FinancialEmpty from "@/components/reports/financial/FinancialEmpty";
import {
  ChartCard,
  NamedBarChart,
  seriesHasValues,
} from "@/components/reports/financial/FinancialCharts";
import { money, qty } from "./useInventoryReport";

export default function TopItemsTab({ data, loading, sortBy, onSortBy }) {
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

  const charts = data.charts || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Select value={sortBy || "quantity"} onValueChange={onSortBy}>
          <SelectTrigger className="h-9 w-[200px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quantity">Top by Quantity</SelectItem>
            <SelectItem value="value">Top by Value</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="Top 10 products by quantity"
          empty={!seriesHasValues(charts.topByQuantity)}
        >
          <NamedBarChart data={charts.topByQuantity} valuePrefix="" />
        </ChartCard>
        <ChartCard
          title="Top 10 products by outgoing value"
          empty={!seriesHasValues(charts.topByValue)}
        >
          <NamedBarChart data={charts.topByValue} color="#3b82f6" />
        </ChartCard>
      </div>

      <div className="border border-zinc-200 rounded-lg bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] uppercase">Rank</TableHead>
              <TableHead className="text-[11px] uppercase">Product</TableHead>
              <TableHead className="text-[11px] uppercase">Category</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Quantity Out</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Outgoing Value</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Avg Unit Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.rows || []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="tabular-nums">{row.rank}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{row.product}</TableCell>
                <TableCell className="whitespace-nowrap">{row.category}</TableCell>
                <TableCell className="tabular-nums text-right">{qty(row.quantity)}</TableCell>
                <TableCell className="tabular-nums text-right">{money(row.value)}</TableCell>
                <TableCell className="tabular-nums text-right">{money(row.averageUnitPrice)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
