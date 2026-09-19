"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, RotateCcw, X, Clock, Store, Loader2 } from "lucide-react";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";

const SEARCH_DEBOUNCE_MS = 400;

export default function MenuHero({
  categories = [],
  products = [],
  onSearchPendingChange,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { restaurant } = useRestaurantPublic();

  const categoryVal = searchParams.get("category") || "all";
  const searchVal = searchParams.get("search") || "";

  const [search, setSearch] = useState(searchVal);
  const [category, setCategory] = useState(categoryVal);
  const [searchPending, setSearchPending] = useState(false);

  useEffect(() => {
    setSearch(searchVal);
    setCategory(categoryVal || "all");
  }, [searchVal, categoryVal]);

  useEffect(() => {
    onSearchPendingChange?.(searchPending);
  }, [searchPending, onSearchPendingChange]);

  const brandName = restaurant?.name || "";
  const slots = restaurant?.pickupSlots || [];
  const kitchenLive = slots.length > 0;

  const pushFilters = (next = {}) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextCategory = next.category !== undefined ? next.category : category;
    const nextSearch = next.search !== undefined ? next.search : search;

    if (nextCategory && nextCategory !== "all") {
      params.set("category", nextCategory);
    } else {
      params.delete("category");
    }

    if (nextSearch?.trim()) {
      params.set("search", nextSearch.trim());
    } else {
      params.delete("search");
    }

    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const draft = search.trim();
    const applied = searchVal.trim();

    if (draft === applied) {
      setSearchPending(false);
      return;
    }

    setSearchPending(true);
    const timer = setTimeout(() => {
      pushFilters({ search });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // pushFilters reads latest search/category/searchParams via closure each run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, searchVal, pathname, category, searchParams, router]);

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setSearchPending(false);
    router.replace(pathname, { scroll: false });
  };

  return (
    <>
      <div className="w-full bg-primary px-5 py-2.5 text-white shadow-sm md:px-12">
        <div className="mx-auto flex max-w-[1300px] flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                kitchenLive ? "animate-pulse bg-white" : "bg-white/50"
              }`}
            />
            <span className="font-semibold">
              {kitchenLive
                ? `${brandName} is live`
                : `${brandName} pickup is closed for today`}
            </span>
            <span className="hidden text-white/85 sm:inline">
              {kitchenLive
                ? "— Accepting same-day pickup orders"
                : "— Check back during restaurant hours"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Pickup today
            </span>
            <span className="rounded bg-black/20 px-2 py-0.5">Pay at restaurant</span>
          </div>
        </div>
      </div>

      <section className="relative w-full bg-[var(--customer-surface-low)]/60 pb-6 pt-10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 md:px-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex max-w-2xl flex-col">
              <span className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                Same-day pickup · Fresh to order
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--customer-ink)] sm:text-5xl md:text-[56px] md:leading-[1.1]">
                Love at First Bite.
              </h1>
              <p className="mt-2 text-lg text-[var(--customer-muted)]">
                Freshly prepared favorites from {brandName}. Browse the live menu,
                customize your meal, and pick up the same day.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start rounded-xl bg-white p-2 shadow-sm md:self-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--customer-surface-container)] text-primary">
                <Store className="h-6 w-6" />
              </div>
              <div className="flex flex-col pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[var(--customer-ink)]">
                    Kitchen Dispatch
                  </span>
                  <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                    Pickup
                  </span>
                </div>
                <span className="text-xs text-[var(--customer-muted)]">
                  Order online · Pay when you arrive
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 rounded-xl bg-white p-2 shadow-sm lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--customer-muted)]" />
              <input
                id="menu-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setSearchPending(false);
                    pushFilters({ search: e.currentTarget.value });
                  }
                }}
                placeholder="Search burgers, sides, drinks…"
                className="w-full rounded-lg bg-[var(--customer-surface-low)] py-3 pl-11 pr-10 text-sm text-[var(--customer-ink)] placeholder:text-[var(--customer-muted)] focus:bg-white focus:outline-none focus:shadow-[0_0_0_2px_var(--primary)]"
                type="text"
                autoComplete="off"
              />
              {searchPending ? (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
              ) : search ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    setSearchPending(false);
                    pushFilters({ search: "" });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--customer-muted)] hover:text-[var(--customer-ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="relative min-w-[200px]">
              <select
                value={category}
                onChange={(e) => {
                  const next = e.target.value;
                  setCategory(next);
                  pushFilters({ category: next });
                }}
                className="w-full cursor-pointer appearance-none rounded-lg bg-[var(--customer-surface-low)] px-4 py-3 pr-10 text-sm font-semibold text-[var(--customer-ink)] focus:outline-none"
                aria-label="Filter by category"
              >
                <option value="all">
                  All Categories ({products.filter((p) => p.available !== false).length})
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name} ({cat.items || 0})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center justify-center gap-1 rounded-lg bg-[var(--customer-surface-container)] px-4 py-3 text-sm font-semibold text-[var(--customer-ink)] transition-colors hover:bg-[var(--customer-surface-low)]"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
