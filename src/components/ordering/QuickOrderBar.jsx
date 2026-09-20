"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Store, UtensilsCrossed } from "lucide-react";
import { usePublicMenu } from "@/hooks/usePublicMenu";

export default function QuickOrderBar() {
  const router = useRouter();
  const { categories, loading } = usePublicMenu();
  const [categorySlug, setCategorySlug] = useState("all");
  const [query, setQuery] = useState("");

  const chips = useMemo(() => categories.slice(0, 8), [categories]);

  const goSearch = (overrideCategory) => {
    const params = new URLSearchParams();
    const cat = overrideCategory ?? categorySlug;
    if (cat && cat !== "all") params.set("category", cat);
    if (query.trim()) params.set("search", query.trim());
    const qs = params.toString();
    router.push(qs ? `/menu?${qs}` : "/menu");
  };

  return (
    <section className="relative z-20 w-full bg-[var(--customer-surface)] pb-10 -mt-4" id="quick-order">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)]/20 bg-white p-5 shadow-xl lg:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Instant Ordering
              </span>
              <h2 className="text-xl font-bold text-[var(--customer-ink)] sm:text-2xl">
                What are you craving?
              </h2>
            </div>

            <div className="inline-flex self-start rounded-xl bg-[var(--customer-surface-container)] p-1 text-xs font-semibold md:self-auto">
              <span className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-[var(--customer-ink)] shadow-sm">
                <Store className="h-4 w-4 text-primary" />
                Pickup only
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative md:col-span-4">
              <div className="flex h-12 items-center rounded-lg border border-transparent bg-[var(--customer-surface-low)] px-3.5 text-[var(--customer-ink)] transition-all focus-within:border-primary">
                <UtensilsCrossed className="mr-2 h-5 w-5 text-[var(--customer-muted)]" />
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  disabled={loading}
                  className="w-full cursor-pointer appearance-none bg-transparent text-sm focus:outline-none"
                  aria-label="Menu category"
                >
                  <option value="all">All Menu Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative md:col-span-6">
              <div className="flex h-12 items-center rounded-lg border border-transparent bg-[var(--customer-surface-low)] px-3.5 text-[var(--customer-ink)] transition-all focus-within:border-primary">
                <Search className="mr-2 h-5 w-5 text-[var(--customer-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") goSearch();
                  }}
                  placeholder="Search food (e.g. burger, wings, pasta…)"
                  className="w-full bg-transparent text-sm placeholder:text-[var(--customer-muted)] focus:outline-none"
                  aria-label="Search food"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => goSearch()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[var(--ink)]/90"
              >
                <span>Search Food</span>
                <Search className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          {chips.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-nowrap scrollbar-none">
              <span className="mr-1 text-xs font-bold uppercase tracking-wider text-[var(--customer-muted)]">
                Popular:
              </span>
              {chips.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => goSearch(cat.slug)}
                  className="rounded-full bg-[var(--customer-surface-container)] px-3 py-1 text-xs font-semibold text-[var(--customer-ink)] transition-colors hover:bg-primary hover:text-white"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
