"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Full Create Order shell skeleton for Sales POS (web).
 * Matches panel layout + product tiles while menu loads.
 */
export default function CreateOrderSkeleton({
  panelLayout = "3",
  gridCols = 2,
}) {
  const menuPanelWidth =
    panelLayout === "3" ? "flex-1 min-w-0" : "w-[65%]";
  const cartPanelWidth =
    panelLayout === "3" ? "w-[32%] min-w-[280px] max-w-[420px]" : "w-[35%]";

  const productGridClass =
    panelLayout === "3"
      ? gridCols === 4
        ? "grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 p-3 gap-2.5"
        : gridCols === 3
          ? "grid grid-cols-2 xl:grid-cols-3 p-3 gap-2.5"
          : "grid grid-cols-2 p-3 gap-2.5"
      : gridCols === 4
        ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 p-3 gap-2.5"
        : gridCols === 3
          ? "grid grid-cols-2 md:grid-cols-3 p-3 gap-2.5"
          : "grid grid-cols-2 p-3 gap-2.5";

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] w-full bg-zinc-50 font-sans overflow-hidden border border-zinc-200 rounded-xl shadow-sm">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {panelLayout === "3" ? (
          <aside className="w-[250px] shrink-0 flex flex-col border-r border-zinc-200 bg-white">
            <div className="px-3 py-3 border-b border-zinc-200 shrink-0">
              <Skeleton className="h-3 w-20 bg-zinc-200" />
            </div>
            <div className="flex-1 overflow-hidden py-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`cat-${i}`}
                  className="border-b border-zinc-100 px-3 py-5"
                >
                  <Skeleton className="h-4 w-28 bg-zinc-100" />
                </div>
              ))}
            </div>
          </aside>
        ) : null}

        <div
          className={`${menuPanelWidth} flex flex-col border-r border-zinc-200 bg-zinc-50`}
        >
          <div className="flex flex-col gap-2 px-4 py-3 bg-white border-b border-zinc-200 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-5 w-36 bg-zinc-200" />
                <Skeleton className="h-3 w-48 bg-zinc-100" />
              </div>
              <Skeleton className="h-9 w-44 rounded-lg bg-zinc-100" />
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-zinc-200 shrink-0">
            <Skeleton className="h-10 flex-1 rounded-lg bg-zinc-100" />
            {panelLayout === "2" ? (
              <Skeleton className="h-10 w-56 shrink-0 rounded-lg bg-zinc-100" />
            ) : null}
          </div>

          <div className="flex gap-2 px-3 py-2.5 bg-white border-b border-zinc-200 shrink-0 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={`head-${i}`}
                className="h-16 w-20 shrink-0 rounded-xl bg-zinc-100"
              />
            ))}
          </div>

          <div className="flex-1 bg-zinc-50/50 overflow-hidden">
            <div className={productGridClass}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`prod-${i}`}
                  className="overflow-hidden rounded-xl border-2 border-zinc-200 bg-white"
                >
                  <Skeleton className="aspect-[16/10] w-full rounded-none bg-zinc-100" />
                  <div className="flex flex-col items-center gap-1.5 px-2.5 py-2">
                    <Skeleton className="h-3.5 w-[80%] max-w-[140px] bg-zinc-200" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-14 bg-zinc-200" />
                      <Skeleton className="h-5 w-12 rounded-md bg-zinc-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${cartPanelWidth} flex flex-col bg-white`}>
          <div className="flex items-center justify-between border-b border-zinc-200 p-4 shrink-0">
            <Skeleton className="h-5 w-24 bg-zinc-200" />
            <Skeleton className="h-5 w-10 bg-zinc-100" />
          </div>
          <div className="flex-1 space-y-3 overflow-hidden p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`cart-${i}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3"
              >
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-zinc-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-[75%] bg-zinc-200" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-100" />
                </div>
                <Skeleton className="h-4 w-12 bg-zinc-100" />
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-zinc-200 p-4 shrink-0">
            <Skeleton className="h-4 w-full bg-zinc-100" />
            <Skeleton className="h-4 w-2/3 bg-zinc-100" />
            <Skeleton className="h-6 w-1/2 bg-zinc-200" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-11 flex-1 rounded-lg bg-zinc-100" />
              <Skeleton className="h-11 flex-1 rounded-lg bg-zinc-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
