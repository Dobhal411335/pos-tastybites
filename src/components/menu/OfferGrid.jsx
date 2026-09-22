"use client";

import React from "react";
import OfferCard from "./OfferCard";
import LoadingSkeleton from "./LoadingSkeleton";
import EmptyState from "./EmptyState";
import { useLoadMore } from "@/hooks/useLoadMore";

const PAGE_SIZE = 20;

export default function OfferGrid({
  offers,
  isLoading,
  resetKey = "",
  highlightSlug = "",
}) {
  const { visible, hasMore, sentinelRef } = useLoadMore(offers || [], {
    pageSize: PAGE_SIZE,
    resetKey,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!offers || offers.length === 0) {
    return <EmptyState />;
  }

  const highlight = String(highlightSlug || "").toLowerCase();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            highlighted={Boolean(highlight) && offer.slug === highlight}
          />
        ))}
      </div>
      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-xs font-bold uppercase tracking-widest text-zinc-400"
        >
          Loading more offers…
        </div>
      ) : null}
    </div>
  );
}
