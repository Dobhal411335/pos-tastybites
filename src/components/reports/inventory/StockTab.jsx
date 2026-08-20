"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

function StockTableSkeleton() {
  return (
    <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-zinc-100">
            <TableRow className="hover:bg-transparent">
              {["Product", "Category", "Current Stock", "Unit", "Status", "Period In", "Period Out", "Opening"].map(
                (label) => (
                  <TableHead
                    key={label}
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100"
                  >
                    {label}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, idx) => (
              <TableRow key={idx} className="h-14">
                {Array.from({ length: 8 }).map((__, cell) => (
                  <TableCell key={cell}>
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function StockTab({
  data,
  loading,
  onPage,
  onSelect,
  selectedId,
}) {
  if (loading) {
    return <StockTableSkeleton />;
  }

  if (!data || data.empty) {
    return <FinancialEmpty message="No products found." />;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="[&>div]:max-h-[600px] [&>div]:overflow-auto [&>div]:custom-scrollbar">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-zinc-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Product
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 text-right bg-zinc-100">
                    Current Stock
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Unit
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 text-right bg-zinc-100">
                    Opening
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 text-right bg-zinc-100">
                    Period In
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 text-right bg-zinc-100">
                    Period Out
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.rows || []).map((row) => {
                  const selected = selectedId === row.id;
                  return (
                    <TableRow
                      key={row.id}
                      className={`h-14 cursor-pointer ${
                        selected ? "bg-orange-50 hover:bg-orange-50" : "hover:bg-zinc-50"
                      }`}
                      onClick={() => onSelect?.(row.id, row)}
                    >
                      <TableCell className="text-[15px] font-medium text-zinc-950 whitespace-nowrap">
                        {row.name}
                      </TableCell>
                      <TableCell className="text-[15px] text-zinc-600 whitespace-nowrap">
                        {row.categoryName}
                      </TableCell>
                      <TableCell className="text-[15px] tabular-nums text-right text-zinc-900">
                        {qty(row.currentBalance)}
                      </TableCell>
                      <TableCell className="text-[15px] text-zinc-600">
                        {row.unit || "—"}
                      </TableCell>
                      <TableCell>
                        <StockStatusBadge status={row.stockStatus} />
                      </TableCell>
                      <TableCell className="text-[15px] tabular-nums text-right text-zinc-700">
                        {qty(row.openingStock)}
                      </TableCell>
                      <TableCell className="text-[15px] tabular-nums text-right text-emerald-700">
                        +{qty(row.unitsInPeriod)}
                      </TableCell>
                      <TableCell className="text-[15px] tabular-nums text-right text-red-700">
                        -{qty(row.unitsOutPeriod)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ReportPager data={data} onPage={onPage} />
    </div>
  );
}
