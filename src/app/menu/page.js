"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Leaf } from "lucide-react";
import Footer from "@/components/sections/Footer";
import Navbar from "@/components/sections/Navbar";
import MenuHero from "@/components/menu/MenuHero";
import CategoryFilter from "@/components/menu/CategoryFilter";
import ProductGrid from "@/components/menu/ProductGrid";
import MobileCart from "@/components/menu/MobileCart";
import LoadingSkeleton from "@/components/menu/LoadingSkeleton";
import EmptyState from "@/components/menu/EmptyState";
import CartDrawer from "@/components/menu/CartDrawer";
import { usePublicMenu } from "@/hooks/usePublicMenu";

function MenuContent() {
  const searchParams = useSearchParams();
  const searchVal = searchParams.get("search") || "";
  const categoryVal = searchParams.get("category") || "";
  const { categories, products, loading, error } = usePublicMenu();
  const [searchPending, setSearchPending] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const onSearchPendingChange = useCallback((pending) => {
    setSearchPending(Boolean(pending));
  }, []);

  useEffect(() => {
    const openCart = () => setCartOpen(true);
    window.addEventListener("tastybites:open-cart", openCart);
    return () => window.removeEventListener("tastybites:open-cart", openCart);
  }, []);

  useEffect(() => {
    const cartParam = searchParams.get("cart");
    if (cartParam === "1" || cartParam === "open") {
      window.dispatchEvent(new CustomEvent("tastybites:open-cart"));
    }
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (categoryVal && categoryVal !== "all") {
      result = result.filter(
        (p) =>
          String(p.category).toLowerCase() === categoryVal.toLowerCase() ||
          String(p.categoryId) === categoryVal
      );
    }
    if (searchVal) {
      const q = searchVal.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || p.desc || "").toLowerCase().includes(q) ||
          (p.categoryName || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, categoryVal, searchVal]);

  const showProductLoading = loading || searchPending;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--customer-surface)] pb-24 text-[var(--customer-ink)] antialiased lg:pb-0">
      <Navbar />

      <main className="w-full flex-1 bg-[var(--customer-surface)]">
        <MenuHero
          categories={categories}
          products={products}
          onSearchPendingChange={onSearchPendingChange}
        />

        <div className="mx-auto max-w-[1400px] px-5 pb-2 md:px-12">
          <CategoryFilter categories={categories} />
        </div>

        <section className="mx-auto w-full max-w-[1400px] px-5 py-10 md:px-12">
          <div className="flex items-start gap-8">
            <div className="min-w-0 flex-1">
              <div className="mb-6 flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-[var(--customer-ink)]">
                    Kitchen Selections
                  </h2>
                  <span className="rounded bg-[var(--customer-surface-container)] px-2 py-0.5 text-xs font-semibold text-[var(--customer-muted)]">
                    {showProductLoading
                      ? "…"
                      : `${filteredProducts.length} Available`}
                  </span>
                </div>
                <div className="hidden items-center gap-2 text-xs font-semibold text-[var(--customer-muted)] sm:flex">
                  <Leaf className="h-4 w-4 text-primary" />
                  <span>Made fresh to order · Same-day pickup</span>
                </div>
              </div>

              {showProductLoading ? (
                <LoadingSkeleton />
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                  {error}
                </div>
              ) : filteredProducts.length === 0 ? (
                <EmptyState />
              ) : (
                <ProductGrid
                  products={filteredProducts}
                  resetKey={`${categoryVal}|${searchVal}`}
                />
              )}
            </div>

            <CartDrawer
              mode="menu"
              open={cartOpen}
              onOpenChange={setCartOpen}
            />
          </div>
        </section>
      </main>

      <MobileCart />
      <Footer />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-(--customer-muted)">
          Loading menu…
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
