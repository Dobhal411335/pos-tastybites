"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { SearchX, RotateCcw } from "lucide-react";

export default function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--customer-surface-container)] text-[var(--customer-muted)]">
        <SearchX className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--customer-ink)]">
        No matching items
      </h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--customer-muted)]">
        We couldn&apos;t find items matching your filter or keyword. Try clearing
        filters or searching for something else.
      </p>
      <button
        type="button"
        onClick={() => router.replace("/menu")}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--customer-ink)] px-4 py-2 text-sm font-semibold text-white"
      >
        <RotateCcw className="h-4 w-4" />
        Reset All Filters
      </button>
    </div>
  );
}
