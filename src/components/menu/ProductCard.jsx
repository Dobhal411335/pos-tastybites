"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Plus, Minus, ShoppingBag, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import ProductConfigModal from "./ProductConfigModal";
import ProductDetailModal from "./ProductDetailModal";

export default function ProductCard({ product }) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isAvailable = product.available !== false;

  return (
    <>
      <div className="group flex flex-col justify-between rounded-xl bg-white border border-[#ECECEC] shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
        {/* Product Image & Badges */}
        <div
          onClick={() => setIsDetailOpen(true)}
          className="relative w-full h-[180px] sm:h-[220px] bg-zinc-150 cursor-pointer overflow-hidden"
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-w-7xl) 25vw, 50vw, 100vw"
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-[1.02]",
              !isAvailable && "grayscale opacity-80"
            )}
          />
          
          {/* Availability Badge */}
          <div
            className={cn(
              "absolute top-3 left-3 px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest text-white shadow-sm",
              isAvailable ? "bg-[#12A594]" : "bg-red-500"
            )}
          >
            {isAvailable ? "Available" : "Sold Out"}
          </div>

          {/* Quick View Overlay icon */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <div className="bg-white/90 p-2.5 rounded-full shadow-sm text-zinc-800">
              <Eye className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
          
          <div className="space-y-1 cursor-pointer" onClick={() => setIsDetailOpen(true)}>
            <h3 className="font-bold text-[#1F2937] text-base font-serif line-clamp-1">
              {product.name}
            </h3>
            <p className="text-xs text-[#6B7280] font-light leading-relaxed line-clamp-2">
              {product.desc}
            </p>
          </div>

          {/* Pricing, Quantity Selector & Cart CTA */}
          <div className="space-y-3 pt-3 border-t border-[#ECECEC]">
            {/* Price display */}
            <div className="flex items-baseline justify-between">
              <span className="text-base font-extrabold text-[#1F2937]">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                + Tax
              </span>
            </div>

            {/* Action Row */}
            {isAvailable ? (
              <div className="flex flex-col gap-2">
                {/* Option available banner link */}
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(true)}
                  className="w-full py-1 text-[10px] text-left uppercase tracking-widest text-[#F97316] font-bold border-b border-dashed border-[#F97316]/30 hover:border-[#F97316] transition-all flex items-center justify-between"
                >
                  <span>Option Available</span>
                  <span>Configure &rarr;</span>
                </button>

                {/* Add to Cart button opens config/details options */}
                <Button
                  onClick={() => setIsConfigOpen(true)}
                  className="w-full bg-[#F97316] hover:bg-[#e06510] text-white rounded-none h-10 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Customize & Add</span>
                </Button>
              </div>
            ) : (
              <Button
                disabled
                className="w-full bg-zinc-200 text-zinc-400 cursor-not-allowed rounded-none h-9 text-[10px] uppercase font-bold tracking-widest"
              >
                Unavailable
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* Config Options Modal */}
      {isConfigOpen && (
        <ProductConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          product={product}
        />
      )}

      {/* Product Detail Modal */}
      {isDetailOpen && (
        <ProductDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          product={product}
        />
      )}
    </>
  );
}
