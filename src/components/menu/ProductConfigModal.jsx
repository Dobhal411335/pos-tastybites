"use client";

import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function ProductConfigModal({ isOpen, onClose, product }) {
  const { addToCart } = useCart();
  
  // Default sizes selection to the first size or regular base
  const defaultSize = product.sizes?.[0] || { name: "Regular Size", price: 0.00, tax: 2.00 };
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [selectedAddons, setSelectedAddons] = useState([]);

  if (!product) return null;

  const handleAddonToggle = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.name === addon.name);
      if (exists) {
        return prev.filter((a) => a.name !== addon.name);
      }
      return [...prev, addon];
    });
  };

  const handleAddToCart = () => {
    // Total price calculation
    const finalPrice = product.price + selectedSize.price + selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const cartKey = `${product.id}-${selectedSize.name.replace(/\s+/g, "-")}-${selectedAddons.map(a => a.name.replace(/\s+/g, "-")).join("-")}`;
    
    addToCart({
      cartKey,
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: product.image,
      selectedSize: selectedSize.name,
      selectedAddons: selectedAddons.map(a => a.name),
    }, 1);

    toast.success(`${product.name} customized and added to cart!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white border border-[#ECECEC] p-6 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ECECEC]">
          <DialogTitle className="text-lg font-bold text-[#1F2937] font-serif">
            {product.name}
          </DialogTitle>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Customization Options Grid/Table */}
        <div className="py-4 space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-semibold text-zinc-700">
              <thead>
                <tr className="border-b border-[#ECECEC] text-left text-zinc-400 uppercase tracking-widest text-[9px] pb-2">
                  <th className="pb-2">Option</th>
                  <th className="pb-2 text-center">Amount</th>
                  <th className="pb-2 text-right">Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                
                {/* Size options (Single Select / Radios) */}
                {product.sizes?.map((size, index) => {
                  const isChecked = selectedSize.name === size.name;
                  const itemPrice = product.price + size.price;
                  return (
                    <tr key={index} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 flex items-center gap-3">
                        <input
                          type="radio"
                          name="product-size"
                          checked={isChecked}
                          onChange={() => setSelectedSize(size)}
                          className="h-4 w-4 text-[#F97316] border-zinc-300 focus:ring-[#F97316]"
                        />
                        <span className="text-[#1F2937]">{size.name}</span>
                      </td>
                      <td className="py-3 text-center text-[#1F2937] font-bold">
                        ${itemPrice.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-zinc-400 font-light">
                        ${size.tax.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {/* Addon options (Multi Select / Checkboxes) */}
                {product.addons?.map((addon, index) => {
                  const isChecked = !!selectedAddons.find((a) => a.name === addon.name);
                  return (
                    <tr key={index} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAddonToggle(addon)}
                          className="h-4 w-4 rounded-sm text-[#F97316] border-zinc-300 focus:ring-[#F97316]"
                        />
                        <span className="text-[#1F2937]">{addon.name}</span>
                      </td>
                      <td className="py-3 text-center text-[#1F2937] font-bold">
                        +${addon.price.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-zinc-400 font-light">
                        ${addon.tax.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-[#ECECEC]">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-none border-zinc-300 text-zinc-700 hover:bg-zinc-50 py-5 text-xs font-bold uppercase tracking-widest"
          >
            Close
          </Button>
          <Button
            onClick={handleAddToCart}
            className="flex-1 bg-[#F97316] hover:bg-[#e06510] text-white rounded-none py-5 text-xs font-bold uppercase tracking-widest transition-all"
          >
            Add to Cart
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
