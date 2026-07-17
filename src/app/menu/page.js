"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import MenuSearch from "@/components/menu/MenuSearch";
import CategoryFilter from "@/components/menu/CategoryFilter";
import ProductGrid from "@/components/menu/ProductGrid";
import Pagination from "@/components/menu/Pagination";
import CartDrawer from "@/components/menu/CartDrawer";
import MobileCart from "@/components/menu/MobileCart";
import { mockProducts } from "@/components/menu/mockProducts";
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "sonner";

const ITEMS_PER_PAGE = 20;

function MenuContent() {
  const searchParams = useSearchParams();
  const searchVal = searchParams.get("search") || "";
  const categoryVal = searchParams.get("category") || "";
  const pageVal = parseInt(searchParams.get("page") || "1", 10);

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [paginatedProducts, setPaginatedProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Simulate minor network latency for organic restaurant feel
    const timer = setTimeout(() => {
      let result = [...mockProducts];

      // Filter by category
      if (categoryVal && categoryVal !== "all") {
        result = result.filter(
          (p) => p.category.toLowerCase() === categoryVal.toLowerCase()
        );
      }

      // Filter by search
      if (searchVal) {
        const query = searchVal.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.desc.toLowerCase().includes(query)
        );
      }

      // Calculate pagination totals
      const total = Math.ceil(result.length / ITEMS_PER_PAGE);
      setTotalPages(total || 1);

      // Slice for current page
      const startIndex = (pageVal - 1) * ITEMS_PER_PAGE;
      const paginated = result.slice(startIndex, startIndex + ITEMS_PER_PAGE);

      setFilteredProducts(result);
      setPaginatedProducts(paginated);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchVal, categoryVal, pageVal]);

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] font-sans antialiased text-[#1F2937] pb-16 md:pb-0">
      <Toaster position="top-right" richColors />
      
      {/* Navbar (reused, White background) */}
      <Navbar />

      {/* Restaurant Header Banner (No abstract neon shapes, real warm photo layout) */}
      <div className="relative w-full h-[220px] md:h-[280px] bg-zinc-950 flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=1600&auto=format&fit=crop"
          alt="Tasty Bites Restaurant Kitchen"
          fill
          priority
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950/70 via-zinc-950/30 to-transparent"></div>
        <div className="relative z-10 text-center space-y-2 text-white">
          <span className="text-xs font-bold uppercase tracking-widest text-[#F97316]">
            Welcome to Tasty Bites
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-serif">
            Our Fine Culinary Menu
          </h1>
          <p className="text-xs md:text-sm text-zinc-350 max-w-md mx-auto font-light leading-relaxed">
            Fresh local Canadian ingredients cooked to absolute perfection. Place your order below.
          </p>
        </div>
      </div>

      {/* Main Filter & Grid Container */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12 sm:px-8">
        
        {/* Search and Filters Layout */}
        <div className="flex flex-col gap-6 mb-8 border-b border-[#ECECEC] pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold font-serif text-[#1F2937]">
              Explore Dishes
            </h2>
            <MenuSearch />
          </div>
          <CategoryFilter />
        </div>

        {/* Content columns (Grid & Sticky Cart Drawer on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Products List (takes 3 cols on desktop) */}
          <div className="lg:col-span-3 space-y-6">
            <ProductGrid products={paginatedProducts} isLoading={isLoading} />
            <Pagination currentPage={pageVal} totalPages={totalPages} />
          </div>

          {/* Sticky Cart Drawer (Desktop) */}
          <div className="hidden lg:block lg:col-span-1">
            <CartDrawer />
          </div>

        </div>

      </main>

      {/* Mobile Floating Bottom Cart */}
      <MobileCart />

      {/* Footer (Reused as explicitly instructed) */}
      <Footer />
    </div>
  );
}

export default function MenuPage() {
  return (
    <CartProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center font-serif text-[#1F2937]">
          Loading Menu...
        </div>
      }>
        <MenuContent />
      </Suspense>
    </CartProvider>
  );
}
