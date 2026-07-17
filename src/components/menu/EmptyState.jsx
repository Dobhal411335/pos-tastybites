"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Frown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyState() {
  const router = useRouter();

  const handleClearFilters = () => {
    router.replace("/menu");
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-5 rounded-xl border border-dashed border-zinc-200 bg-white">
      <div className="p-4 rounded-full bg-zinc-50 border border-[#ECECEC]">
        <Frown className="h-10 w-10 text-zinc-400" />
      </div>
      
      <div className="space-y-1">
        <h3 className="font-bold text-lg text-[#1F2937] font-serif">No Products Found</h3>
        <p className="text-xs text-[#6B7280] font-light max-w-xs mx-auto">
          We couldn&apos;t find any items matching your selected category or search term. Try adjusting your filters.
        </p>
      </div>

      <Button
        onClick={handleClearFilters}
        className="bg-[#F97316] hover:bg-[#e06510] text-white rounded-none px-6 py-5 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        <span>Clear Filters</span>
      </Button>
    </div>
  );
}
