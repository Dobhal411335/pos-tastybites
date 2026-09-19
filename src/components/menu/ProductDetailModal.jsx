"use client";

import React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { productImageSrc } from "@/lib/public/productImage";

export default function ProductDetailModal({ isOpen, onClose, product, onAdd }) {
  if (!product) return null;

  const price = Number(product.price) || 0;
  const description =
    product.description || product.desc || "Made fresh to order.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl"
      >
        <div className="relative flex max-h-[90vh] flex-col overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[var(--customer-ink)] shadow-md backdrop-blur-md hover:bg-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="overflow-y-auto flex-1">
            <div className="relative h-64 w-full bg-[var(--customer-surface-container)] sm:h-80">
              <Image
                src={productImageSrc(product)}
                alt={product.name}
                fill
                className="object-cover"
                sizes="672px"
              />
              {product.categoryName ? (
                <div className="absolute bottom-4 left-4">
                  <span className="rounded-full bg-[var(--customer-ink)]/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                    {product.categoryName}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl font-semibold text-[var(--customer-ink)] sm:text-3xl">
                    {product.name}
                  </DialogTitle>
                  {product.productType ? (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {product.productType === "BAR" ? "Bar" : "Kitchen"} item
                    </p>
                  ) : null}
                </div>
                <span className="whitespace-nowrap text-2xl font-bold tabular-nums text-[var(--customer-ink)]">
                  ${price.toFixed(2)}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-[var(--customer-muted)]">
                {description}
              </p>

              {(product.addons?.length > 0 ||
                product.choiceOptions?.length > 0 ||
                product.preparationStyles?.length > 0) && (
                <div className="space-y-2 rounded-xl bg-[var(--customer-surface-low)] p-4">
                  <h4 className="text-sm font-bold text-[var(--customer-ink)]">
                    Customization available
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--customer-muted)]">
                    {product.variants?.length > 1 ? (
                      <div>• Size / variant options</div>
                    ) : null}
                    {product.addons?.length > 0 ? (
                      <div>• {product.addons.length} add-on(s)</div>
                    ) : null}
                    {product.choiceOptions?.length > 0 ? (
                      <div>• Choice options</div>
                    ) : null}
                    {product.preparationStyles?.length > 0 ? (
                      <div>• Prep styles</div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-transparent bg-[var(--customer-surface-low)] p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Back to Menu
            </button>
            {product.available !== false ? (
              <button
                type="button"
                onClick={() => (onAdd ? onAdd() : onClose())}
                className="flex-1 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover"
              >
                Order Item (${price.toFixed(2)})
              </button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
