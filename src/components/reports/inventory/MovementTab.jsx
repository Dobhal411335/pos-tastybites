"use client";

import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

function MovementBadge({ type, label }) {
  const isIn = type === "STOCK_IN";
  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold uppercase ${
        isIn
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {label || (isIn ? "Stock In" : "Stock Out")}
    </Badge>
  );
}

export default function MovementTab({
  data,
  loading,
  onPage,
  onSelect,
  selectedId,
  showPerformedBy = false,
}) {
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
      <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="[&>div]:max-h-[600px] [&>div]:overflow-auto [&>div]:custom-scrollbar">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-zinc-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Product
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Qty
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Prev → New
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                    Reason
                  </TableHead>
                  {showPerformedBy ? (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100">
                      Performed By
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.rows || []).map((row) => {
                  const isIn = row.movementType === "STOCK_IN";
                  const selected = selectedId === row.productId;
                  const unit = row.unit ? ` ${row.unit}` : "";
                  return (
                    <TableRow
                      key={row.id}
                      className={`h-14 cursor-pointer ${
                        selected ? "bg-orange-50 hover:bg-orange-50" : "hover:bg-zinc-50"
                      }`}
                      onClick={() => onSelect?.(row.productId, row)}
                    >
                      <TableCell className="text-[15px] text-zinc-600 whitespace-nowrap">
                        {row.date}
                        {row.time ? (
                          <span className="block text-sm text-zinc-500">{row.time}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-[15px] font-medium text-zinc-950 whitespace-nowrap">
                        {row.product}
                      </TableCell>
                      <TableCell className="text-[15px] text-zinc-600 whitespace-nowrap">
                        {row.category}
                      </TableCell>
                      <TableCell>
                        <MovementBadge
                          type={row.movementType}
                          label={row.movementLabel}
                        />
                      </TableCell>
                      <TableCell
                        className={`text-[15px] tabular-nums font-medium whitespace-nowrap ${
                          isIn ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isIn ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )}
                          {isIn ? "+" : "-"}
                          {qty(row.quantity)}
                          {unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-[15px] tabular-nums text-zinc-600 whitespace-nowrap">
                        {row.previousStock == null ? "—" : qty(row.previousStock)}
                        {" → "}
                        {row.newStock == null ? "—" : qty(row.newStock)}
                      </TableCell>
                      <TableCell className="text-[15px] text-zinc-600 max-w-[160px] truncate">
                        {row.reason || "—"}
                      </TableCell>
                      {showPerformedBy ? (
                        <TableCell className="text-[15px] text-zinc-600 whitespace-nowrap">
                          {row.performedBy || "—"}
                        </TableCell>
                      ) : null}
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
