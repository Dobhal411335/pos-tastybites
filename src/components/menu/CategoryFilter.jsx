"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export default function CategoryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";

  const categories = [
    { id: "all", name: "All Items" },
    { id: "burgers", name: "Burgers" },
    { id: "steaks", name: "Steaks" },
    { id: "seafood", name: "Seafood" },
    { id: "sides", name: "Sides" },
    { id: "beverages", name: "Beverages" },
  ];

  const handleCategoryClick = (categoryId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId === "all") {
      params.delete("category");
    } else {
      params.set("category", categoryId);
    }
    // Reset page when category changes
    params.delete("page");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-none flex gap-2 pb-2">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-200 shrink-0 border",
              isActive
                ? "bg-[#F97316] border-[#F97316] text-white shadow-xs"
                : "bg-white border-[#ECECEC] text-[#1F2937] hover:bg-zinc-50"
            )}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
