"use client";

import React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ProductDetailModal({ isOpen, onClose, product }) {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white border border-[#ECECEC] p-6 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ECECEC] mb-4">
          <DialogTitle className="text-lg font-bold text-[#1F2937] font-serif">
            {product.name}
          </DialogTitle>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image Content */}
        <div className="space-y-4">
          <div className="relative w-full h-[280px] bg-zinc-150 rounded-lg overflow-hidden">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>

          {/* Description & Ingredients */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              Ingredients
            </h4>
            <p className="text-sm text-[#1F2937] leading-relaxed font-light">
              {product.ingredients || "Freshly sourced local ingredients prepared daily."}
            </p>
          </div>
        </div>

        {/* Close CTA */}
        <div className="pt-4 border-t border-[#ECECEC] mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full rounded-none border-zinc-300 text-zinc-700 hover:bg-zinc-50 py-5 text-xs font-bold uppercase tracking-widest"
          >
            Close
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
