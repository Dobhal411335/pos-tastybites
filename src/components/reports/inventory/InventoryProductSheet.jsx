"use client";

import {
  ArrowDown,
  ArrowUp,
  Clock3,
  Loader2,
  Package,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { money, qty } from "./useInventoryReport";
import { StockStatusBadge } from "./reportUi";

function signedQty(value, unit) {
  const n = Number(value) || 0;
  const prefix = n > 0 ? "+" : n < 0 ? "" : "";
  return `${prefix}${qty(n)}${unit ? ` ${unit}` : ""}`;
}

function StatCell({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function MovementRow({ row, unit }) {
  const isIn = row.movementType === "STOCK_IN";
  const amount = isIn ? row.quantity : -row.quantity;

  return (
    <div className="relative pb-4 last:pb-0">
      <span
        className={`absolute -left-[1.625rem] top-3 w-3 h-3 rounded-full border-2 bg-white ${
          isIn ? "border-emerald-500" : "border-red-500"
        }`}
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold uppercase ${
                  isIn
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {isIn ? (
                  <ArrowUp className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDown className="h-3 w-3 mr-1" />
                )}
                {row.movementLabel || (isIn ? "Stock In" : "Stock Out")}
              </Badge>
              <span className="text-xs text-zinc-500 tabular-nums inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {row.date}
                {row.time ? ` · ${row.time}` : ""}
              </span>
            </div>
            {row.reason && row.reason !== "—" ? (
              <p className="text-sm text-zinc-600 mt-1.5">{row.reason}</p>
            ) : null}
            {row.performedBy && row.performedBy !== "—" ? (
              <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {row.performedBy}
              </p>
            ) : null}
          </div>
          <span
            className={`text-base font-semibold tabular-nums shrink-0 ${
              isIn ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {signedQty(amount, unit || row.unit)}
          </span>
        </div>

        {row.previousStock != null || row.newStock != null ? (
          <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Balance change</span>
            <span className="tabular-nums font-medium text-zinc-700">
              {row.previousStock == null ? "—" : qty(row.previousStock)}
              {" → "}
              {row.newStock == null ? "—" : qty(row.newStock)}
              {unit || row.unit ? ` ${unit || row.unit}` : ""}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function InventoryProductSheet({
  open,
  onOpenChange,
  product,
  history = [],
  loading,
  timezone,
  dateFrom,
  dateTo,
}) {
  const unit = product?.unit || "";
  const hasPeriod =
    product?.unitsInPeriod != null || product?.unitsOutPeriod != null;
  const stockIn = Number(product?.unitsInPeriod) || 0;
  const stockOut = Number(product?.unitsOutPeriod) || 0;
  const net = stockIn - stockOut;
  const name = product?.name || product?.product || "Product";
  const category = product?.categoryName || product?.category || "—";
  const hasBalance = product?.currentBalance != null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] custom-scrollbar p-0 flex flex-col gap-0 overflow-hidden"
      >
        <SheetHeader className="bg-gradient-to-r from-orange-50 to-white px-4 py-4 pr-12 border-b border-zinc-200 text-left space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base truncate">{name}</SheetTitle>
              <SheetDescription className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {category}
                {unit ? ` · ${unit}` : ""}
              </SheetDescription>
            </div>
          </div>
          {dateFrom && dateTo ? (
            <p className="text-[11px] text-zinc-500">
              Period: {dateFrom} to {dateTo}
              {timezone ? ` (${timezone})` : ""}
            </p>
          ) : null}
        </SheetHeader>

        <div
          key={product?.id || product?.productId || "product"}
          className="flex-1 overflow-y-auto custom-scrollbar sheet-body-in"
        >
          {loading && !product ? (
            <div className="py-10 flex justify-center text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading product…
            </div>
          ) : product ? (
            <>
              <div className="p-4 grid grid-cols-2 gap-3 bg-white border-b border-zinc-200">
                <StatCell label="Current Stock" className="col-span-2 sm:col-span-1">
                  <p className="text-xl font-semibold text-zinc-900 tabular-nums">
                    {hasBalance ? qty(product.currentBalance) : "—"}
                    {hasBalance && unit ? (
                      <span className="ml-1 text-sm font-normal text-zinc-500">
                        {unit}
                      </span>
                    ) : null}
                  </p>
                  {product.stockStatus ? (
                    <div className="mt-1">
                      <StockStatusBadge status={product.stockStatus} />
                    </div>
                  ) : null}
                </StatCell>
                <StatCell label="Net Movement">
                  <p
                    className={`text-xl font-semibold tabular-nums ${
                      !hasPeriod
                        ? "text-zinc-400"
                        : net >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                    }`}
                  >
                    {hasPeriod ? signedQty(net, unit) : "—"}
                  </p>
                </StatCell>
                <StatCell label="Opening Stock">
                  <p className="text-lg font-semibold tabular-nums text-zinc-900">
                    {qty(product.openingStock)}
                    {unit ? ` ${unit}` : ""}
                  </p>
                </StatCell>
                <StatCell label="Stock In">
                  <p className="text-lg font-semibold tabular-nums text-emerald-700">
                    {hasPeriod ? signedQty(stockIn, unit) : "—"}
                  </p>
                </StatCell>
                <StatCell label="Stock Out">
                  <p className="text-lg font-semibold tabular-nums text-red-700">
                    {hasPeriod ? signedQty(-stockOut, unit) : "—"}
                  </p>
                </StatCell>
                {product.minStock != null ? (
                  <StatCell label="Min Stock">
                    <p className="text-lg font-semibold tabular-nums text-zinc-900">
                      {qty(product.minStock)}
                      {unit ? ` ${unit}` : ""}
                    </p>
                  </StatCell>
                ) : null}
                {product.purchasePrice != null ? (
                  <StatCell label="Unit Cost">
                    <p className="text-lg font-semibold tabular-nums text-zinc-900">
                      {money(product.purchasePrice)}
                    </p>
                  </StatCell>
                ) : null}
                {product.stockValue != null ? (
                  <StatCell label="Stock Value">
                    <p className="text-lg font-semibold tabular-nums text-orange-700">
                      {money(product.stockValue)}
                    </p>
                  </StatCell>
                ) : null}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
                    Movement History
                  </h4>
                  <Badge variant="outline" className="text-[10px]">
                    {history.length} entries
                  </Badge>
                </div>
                {loading ? (
                  <div className="py-6 flex justify-center text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading history…
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-zinc-500 bg-zinc-50 rounded-xl px-3 py-4 text-center border border-zinc-200">
                    No movement recorded for this period.
                  </p>
                ) : (
                  <div className="relative border-l-2 border-zinc-200 ml-1.5 pl-5 space-y-0">
                    {history.map((row) => (
                      <MovementRow key={row.id} row={row} unit={unit} />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
