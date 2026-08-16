"use client";

import { money } from "./useFinancialReport";

export default function FinancialKpiCards({ items = [] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-zinc-200 bg-white px-3 py-2"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {item.label}
          </p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">
            {item.money ? money(item.value) : item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
