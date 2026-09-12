"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FinancialFilters from "./FinancialFilters";
import FinancialEmpty from "./FinancialEmpty";
import { DEFAULT_FINANCIAL_FILTERS } from "./useFinancialReport";

export default function FinancialPageHeader({
  title,
  description,
  filters,
  onFiltersChange,
  filterProps,
  loading,
  error,
  onRetry,
  children,
  empty,
  emptyMessage,
}) {
  const clearFilters = () => {
    if (!onFiltersChange) return;
    onFiltersChange({ ...DEFAULT_FINANCIAL_FILTERS });
  };

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
          loading={loading}
          onRefresh={onRetry}
          onClear={clearFilters}
          {...filterProps}
        />
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : error ? (
        <div className="border border-red-200 rounded-lg bg-red-50 p-5 space-y-3 max-w-xl">
          <p className="text-sm font-medium text-red-900">
            Failed to load report
          </p>
          <p className="text-sm text-red-700">{error}</p>
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="bg-white"
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : empty ? (
        <FinancialEmpty message={emptyMessage} />
      ) : (
        children
      )}
    </div>
  );
}
