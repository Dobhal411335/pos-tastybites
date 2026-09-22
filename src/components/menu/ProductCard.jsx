"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Eye, Plus, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductConfigModal from "./ProductConfigModal";
import ProductDetailModal from "./ProductDetailModal";
import { productImageSrc } from "@/lib/public/productImage";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

function productNeedsConfig(product) {
  if (!product) return false;
  if (product.hasModifiers) return true;
  const variants = product.variants || [];
  const addons = product.addons || [];
  const choices = product.choiceOptions || [];
  const prep = product.preparationStyles || [];
  return variants.length > 1 || addons.length > 0 || choices.length > 0 || prep.length > 0;
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isAvailable = product.available !== false;
  const price = Number(product.price) || 0;
  const needsConfig = productNeedsConfig(product);

  const quickAdd = () => {
    if (!isAvailable) return;
    if (needsConfig) {
      setIsConfigOpen(true);
      return;
    }
    const sizeName = product.variants?.[0]?.size || "Standard";
    const unitPrice = Number(product.variants?.[0]?.price ?? product.price) || 0;
    const cartKey = `${product.id}-${sizeName}`.replace(/\s+/g, "-");
    addToCart(
      {
        cartKey,
        id: product.id,
        menuItemId: product.id,
        name: product.name,
        price: unitPrice,
        image: product.image,
        selectedSize: sizeName,
        size: sizeName,
        sizes: sizeName && !/^standard$/i.test(sizeName) ? [sizeName] : [],
        selectedAddons: [],
        options: [],
        choiceSelections: [],
        category: product.category,
        categoryName: product.categoryName,
        productType: product.productType,
      },
      1
    );
    toast.success(`${product.name} added to bag`);
  };

  return (
    <>
      <article
        className={cn(
          "group flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08)]",
          !isAvailable && "opacity-75"
        )}
      >
        <div
          className="relative h-44 w-full cursor-pointer overflow-hidden bg-[var(--customer-surface-low)]"
          onClick={() => setIsDetailOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setIsDetailOpen(true)}
          role="button"
          tabIndex={0}
        >
          <Image
            src={productImageSrc(product)}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-105",
              !isAvailable && "grayscale"
            )}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {!product.categoryName ? (
              <span className="rounded-md border border-gray-400 bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[var(--customer-ink)]">
                {product.categoryName}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[var(--customer-ink)] opacity-0 shadow-sm backdrop-blur-md transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setIsDetailOpen(true);
            }}
          >
            <Eye className="h-3.5 w-3.5" /> Info
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-2 p-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3
                className="cursor-pointer text-lg font-semibold text-[var(--customer-ink)] transition-colors group-hover:text-primary"
                onClick={() => setIsDetailOpen(true)}
              >
                {product.name}
              </h3>
              <span className="whitespace-nowrap text-lg font-bold tabular-nums text-[var(--customer-ink)]">
                ${price.toFixed(2)}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--customer-muted)]">
              {product.description || product.desc || "Made fresh to order."}
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            {needsConfig ? (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Customize
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-[var(--customer-muted)]">
                Standard
              </span>
            )}

            {isAvailable ? (
              <button
                type="button"
                onClick={needsConfig ? () => setIsConfigOpen(true) : quickAdd}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all",
                  needsConfig
                    ? "bg-primary text-white hover:bg-primary-hover"
                    : "bg-red-500 text-white hover:bg-red-600"                )}
              >
                {needsConfig ? (
                  "Choose Options"
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Add
                  </>
                )}
              </button>
            ) : (
              <span className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-400">
                Unavailable
              </span>
            )}
          </div>
        </div>
      </article>

      <ProductDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        product={product}
        onAdd={() => {
          setIsDetailOpen(false);
          if (needsConfig) setIsConfigOpen(true);
          else quickAdd();
        }}
      />
      <ProductConfigModal
        key={product?.id || product?._id || "config"}
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        product={product}
      />
    </>
  );
}
