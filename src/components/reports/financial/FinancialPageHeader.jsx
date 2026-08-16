"use client";

import { Loader2 } from "lucide-react";
import FinancialFilters from "./FinancialFilters";
import FinancialEmpty from "./FinancialEmpty";

export default function FinancialPageHeader({
  title,
  description,
  filters,
  onFiltersChange,
  filterProps,
  loading,
  children,
  empty,
  emptyMessage,
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Financial & Accounting
        </p>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-zinc-500 mt-1">{description}</p>
        ) : null}
      </div>

      {filters ? (
        <FinancialFilters
          value={filters}
          onChange={onFiltersChange}
          {...filterProps}
        />
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : empty ? (
        <FinancialEmpty message={emptyMessage} />
      ) : (
        children
      )}
    </div>
  );
}
