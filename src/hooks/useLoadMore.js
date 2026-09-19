"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Client-side pagination over an already-loaded list.
 * Renders a sentinel for intersection-based "load more".
 */
export function useLoadMore(items = [], { pageSize = 20, resetKey = "" } = {}) {
  const list = Array.isArray(items) ? items : [];
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [resetKey, pageSize, list.length]);

  const visible = useMemo(
    () => list.slice(0, visibleCount),
    [list, visibleCount]
  );

  const hasMore = visibleCount < list.length;

  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + pageSize, list.length));
  }, [pageSize, list.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, visible.length]);

  return { visible, hasMore, loadMore, sentinelRef, visibleCount };
}

/**
 * Grow a carousel's visible window when the user reaches near the last slide.
 */
export function useCarouselLoadMore(carouselApi, { hasMore, loadMore } = {}) {
  useEffect(() => {
    if (!carouselApi || !hasMore || !loadMore) return undefined;

    const maybeLoad = () => {
      const snaps = carouselApi.scrollSnapList();
      if (!snaps.length) return;
      const selected = carouselApi.selectedScrollSnap();
      const last = snaps.length - 1;
      if (selected >= last - 1) {
        loadMore();
      }
    };

    maybeLoad();
    carouselApi.on("select", maybeLoad);
    carouselApi.on("settle", maybeLoad);
    return () => {
      carouselApi.off("select", maybeLoad);
      carouselApi.off("settle", maybeLoad);
    };
  }, [carouselApi, hasMore, loadMore]);
}
