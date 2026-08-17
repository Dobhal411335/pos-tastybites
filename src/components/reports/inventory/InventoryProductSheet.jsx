"use client";

import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { qty } from "./useInventoryReport";
import { StockStatusBadge } from "./reportUi";

function signedQty(value, unit) {
  const n = Number(value) || 0;
  const prefix = n > 0 ? "+" : n < 0 ? "" : "";
  return `${prefix}${qty(n)}${unit ? ` ${unit}` : ""}`;
}

function StatCell({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function InventoryProductSheet({
  open,
  onOpenChange,
  product,
  history = [],
  loading,
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
        className="w-full sm:max-w-[420px] custom-scrollbar p-0 flex flex-col gap-0 overflow-hidden"
      >
        <SheetHeader className="bg-zinc-50 px-4 py-3 pr-12 border-b border-zinc-200 text-left space-y-1">
          <SheetTitle className="text-base truncate">{name}</SheetTitle>
          <SheetDescription className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {category}
          </SheetDescription>
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
              <div className="p-4 grid grid-cols-2 gap-4 bg-white border-b border-zinc-200">
                <StatCell label="Current Stock">
                  <p className="text-lg font-semibold text-zinc-900 tabular-nums">
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
                    className={`text-lg font-semibold tabular-nums ${
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
                <StatCell label="Stock In (Total)">
                  <p className="text-[15px] font-medium tabular-nums text-emerald-700">
                    {hasPeriod ? signedQty(stockIn, unit) : "—"}
                  </p>
                </StatCell>
                <StatCell label="Stock Out (Total)">
                  <p className="text-[15px] font-medium tabular-nums text-red-700">
                    {hasPeriod ? signedQty(-stockOut, unit) : "—"}
                  </p>
                </StatCell>
              </div>

              <div className="p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-900 mb-3">
                  Recent History
                </h4>
                {loading ? (
                  <div className="py-6 flex justify-center text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading history…
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No movement recorded for this period.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((row) => {
                      const isIn = row.movementType === "STOCK_IN";
                      const amount = isIn ? row.quantity : -row.quantity;
                      return (
                        <div
                          key={row.id}
                          className="flex justify-between items-center bg-zinc-50 px-3 py-2.5 rounded-lg text-[15px]"
                        >
                          <div className="min-w-0">
                            <p className="text-zinc-600">{row.date}</p>
                            {row.reason && row.reason !== "—" ? (
                              <p className="text-sm text-zinc-400 truncate">
                                {row.reason}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={`font-medium tabular-nums shrink-0 ml-3 ${
                              isIn ? "text-emerald-700" : "text-red-700"
                            }`}
                          >
                            {signedQty(amount, unit || row.unit)}
                          </span>
                        </div>
                      );
                    })}
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
