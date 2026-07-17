"use client";

import React, { useState } from "react";
import { Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import CheckoutModal from "./CheckoutModal";

export default function CartDrawer() {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.13; // 13% HST Canadian Tax
  const total = subtotal + tax;

  return (
    <>
      <div className="w-full bg-white border border-[#ECECEC] rounded-xl shadow-xs p-6 sticky top-24 self-start">
        <div className="flex items-center justify-between pb-4 border-b border-[#ECECEC] mb-4">
          <h3 className="font-bold text-[#1F2937] text-base font-serif flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#F97316]" />
            <span>Your Order</span>
          </h3>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[10px] uppercase font-bold tracking-widest text-[#6B7280] hover:text-red-500 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-[#6B7280] font-light">
              Your cart is empty.
            </p>
            <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
              Start adding delicious items!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Items List */}
            <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {cartItems.map((item) => (
                <div key={item.cartKey} className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-50 last:border-0 last:pb-0">
                  <div className="flex-1 space-y-0.5">
                    <h4 className="text-xs font-bold text-[#1F2937] line-clamp-1">{item.name}</h4>
                    <p className="text-[10px] text-[#6B7280] leading-relaxed">
                      {item.selectedSize ? `${item.selectedSize}` : "Regular"}
                      {item.selectedAddons && item.selectedAddons.length > 0 && ` + ${item.selectedAddons.join(", ")}`}
                    </p>
                  </div>

                  {/* Quantity Editor */}
                  <div className="flex items-center border border-[#ECECEC] bg-zinc-50 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                      className="p-1 hover:bg-zinc-150 text-zinc-500 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-xs font-bold text-[#1F2937] min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                      className="p-1 hover:bg-zinc-150 text-zinc-500 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Price and Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-extrabold text-[#1F2937] min-w-[50px] text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.cartKey)}
                      className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="pt-4 border-t border-[#ECECEC] space-y-2 text-xs font-semibold text-[#1F2937]">
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-light">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-light">Tax (13% HST)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-zinc-100">
                <span>Total</span>
                <span className="text-[#F97316]">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <Button
              className="w-full bg-[#F97316] hover:bg-[#e06510] text-white rounded-none py-6 text-xs uppercase tracking-widest font-bold transition-all shadow-xs"
              onClick={() => setIsCheckoutOpen(true)}
            >
              Continue Order
            </Button>
          </div>
        )}
      </div>

      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </>
  );
}
