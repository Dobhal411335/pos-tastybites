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
    <div className="w-full space-y-4 md:space-y-4 lg:space-y-6 px-1">
      <div className="mx-auto grid w-full grid-cols-1 items-stretch gap-2 md:grid-cols-2 md:gap-4 xl:grid-cols-3 xl:gap-4">
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
