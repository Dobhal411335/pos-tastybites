"use client";

import React, { useState } from "react";
import { ShoppingBag, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import CheckoutModal from "./CheckoutModal";

export default function MobileCart() {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.13; // HST Canadian Tax
  const total = subtotal + tax;

  if (totalItems === 0) return null;

  const handleCheckoutClick = () => {
    setIsSheetOpen(false); // close bottom sheet
    setIsCheckoutOpen(true); // open checkout dialog
  };

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#ECECEC] px-6 py-4 shadow-xl flex md:hidden items-center justify-between">
        {/* Short Summary */}
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-full bg-[#F97316]/10 text-[#F97316]">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-[#F97316] text-white text-[9px] font-black rounded-full h-5 w-5 flex items-center justify-center border border-white">
              {totalItems}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#6B7280]">
              Subtotal
            </span>
            <span className="text-sm font-extrabold text-[#1F2937]">
              ${subtotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Cart Sheet Trigger */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              className="bg-[#F97316] hover:bg-[#e06510] text-white rounded-none px-6 py-4 text-xs font-bold uppercase tracking-widest"
            >
              View Order
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] border-t border-[#ECECEC] bg-white p-6 rounded-t-2xl flex flex-col justify-between">
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#ECECEC] shrink-0">
                <SheetTitle className="font-bold text-lg text-[#1F2937] font-serif flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[#F97316]" />
                  <span>Your Order</span>
                </SheetTitle>
                <button
                  onClick={clearCart}
                  className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 hover:text-red-500 transition-colors"
                >
                  Clear All
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {cartItems.map((item) => (
                  <div key={item.cartKey} className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-50 last:border-0 last:pb-0">
                    <div className="flex-1 space-y-0.5">
                      <h4 className="text-xs font-bold text-[#1F2937] line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-[#6B7280] leading-relaxed">
                        {item.selectedSize ? `${item.selectedSize}` : "Regular"}
                        {item.selectedAddons && item.selectedAddons.length > 0 && ` + ${item.selectedAddons.join(", ")}`}
                      </p>
                    </div>

                    {/* Quantity Controls */}
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

                    {/* Pricing and Delete */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-extrabold text-[#1F2937] min-w-[50px] text-right">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.cartKey)}
                        className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing summary + Checkout button at the bottom */}
            <div className="pt-4 border-t border-[#ECECEC] space-y-4 shrink-0 bg-white">
              <div className="space-y-1.5 text-xs font-semibold text-[#1F2937]">
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

              <Button
                className="w-full bg-[#F97316] hover:bg-[#e06510] text-white rounded-none py-6 text-xs uppercase tracking-widest font-bold transition-all shadow-xs"
                onClick={handleCheckoutClick}
              >
                Continue Order
              </Button>
            </div>
          </SheetContent>
        </Sheet>
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
