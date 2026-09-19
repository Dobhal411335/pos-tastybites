"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function MobileCart({ onOpenCart }) {
  const { itemCount, displaySubtotal } = useCart();

  if (itemCount === 0) return null;

  const openCart = () => {
    if (typeof onOpenCart === "function") {
      onOpenCart();
      return;
    }
    window.dispatchEvent(new CustomEvent("tastybites:open-cart"));
  };

  return (
    <aside aria-label="Mobile order bar" className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
      <button
        type="button"
        onClick={openCart}
        className="flex w-full items-center justify-between rounded-xl bg-[var(--customer-ink)] p-3.5 text-white shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold tabular-nums">
            {itemCount}
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <ShoppingBag className="h-4 w-4" />
            View Bag
          </span>
        </div>
        <span className="text-sm font-bold tabular-nums">${displaySubtotal.toFixed(2)}</span>
      </button>
    </aside>
  );
}
