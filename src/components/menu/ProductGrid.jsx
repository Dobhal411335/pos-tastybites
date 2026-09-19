"use client";

import React from "react";
import ProductCard from "./ProductCard";
import LoadingSkeleton from "./LoadingSkeleton";
import EmptyState from "./EmptyState";
import { useLoadMore } from "@/hooks/useLoadMore";

const PAGE_SIZE = 20;

export default function ProductGrid({ products, isLoading, resetKey = "" }) {
  const { visible, hasMore, sentinelRef } = useLoadMore(products || [], {
    pageSize: PAGE_SIZE,
    resetKey,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!products || products.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-xs font-bold uppercase tracking-widest text-zinc-400"
        >
          Loading more dishes…
        </div>
      ) : null}
    </div>
  );
}
