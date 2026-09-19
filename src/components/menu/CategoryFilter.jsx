"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoadMore } from "@/hooks/useLoadMore";

const PAGE_SIZE = 10;
const SCROLL_STEP = 220;

export default function CategoryFilter({ categories = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const [expanded, setExpanded] = useState(false);
  const scrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { visible, hasMore } = useLoadMore(categories, {
    pageSize: PAGE_SIZE,
    resetKey: `filter-${categories.length}`,
  });

  useEffect(() => {
    if (!hasMore) setExpanded(false);
  }, [hasMore]);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(max > 4 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, categories.length, expanded]);

  const scrollByDir = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * SCROLL_STEP, behavior: "smooth" });
  };

  const shownCategories = expanded ? categories : visible;
  const items = [
    { id: "all", slug: "all", name: "All Items", items: null },
    ...shownCategories,
  ];

  const handleCategoryClick = (categorySlug) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categorySlug === "all") {
      params.delete("category");
    } else {
      params.set("category", categorySlug);
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="relative space-y-2">
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          aria-label="Scroll categories left"
          onClick={() => scrollByDir(-1)}
          disabled={!canScrollLeft}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full border border-black bg-white text-[var(--customer-ink)] shadow-sm transition-colors",
            canScrollLeft
              ? "hover:bg-[var(--customer-surface-container)]"
              : "cursor-not-allowed opacity-40"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Scroll categories right"
          onClick={() => scrollByDir(1)}
          disabled={!canScrollRight}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full border border-black bg-white text-[var(--customer-ink)] shadow-sm transition-colors",
            canScrollRight
              ? "hover:bg-[var(--customer-surface-container)]"
              : "cursor-not-allowed opacity-40"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-none -mx-5 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0"
      >
        <div className="flex min-w-max items-center gap-2">
          {items.map((cat) => {
            const slug = cat.slug || cat.id;
            const isActive = activeCategory === slug;
            const count = cat.items;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => handleCategoryClick(slug)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border border-gray-400 px-4 py-2 text-xs font-semibold shadow-sm transition-all",
                  isActive
                    ? "bg-[var(--customer-ink)] font-bold text-white"
                    : "bg-white text-[var(--customer-ink)] hover:bg-[var(--customer-surface-container)]"
                )}
              >
                <span>{cat.name}</span>
                {count != null ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px]",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[var(--customer-surface-container)] text-[var(--customer-muted)]"
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}

          {hasMore && !expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="shrink-0 rounded-full border border-dashed border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--customer-muted)]"
            >
              +{categories.length - visible.length} more
            </button>
          ) : null}

          {expanded && hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="shrink-0 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--customer-muted)]"
            >
              Show less
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
