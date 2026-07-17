"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function MenuSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("search") || "";
  const [query, setQuery] = useState(initialQuery);

  // Sync state with URL parameter (e.g. on manual navigation or reset)
  useEffect(() => {
    setQuery(searchParams.get("search") || "");
  }, [searchParams]);

  // Debounced search updates URL
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      // Reset page when search term changes
      params.delete("page");
      
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, router, pathname, searchParams]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search dishes (e.g., burger, steak, pizza)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-5 bg-white border border-[#ECECEC] rounded-xl text-sm focus-visible:ring-zinc-450 focus-visible:ring-1 focus-visible:border-zinc-450 placeholder-zinc-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full hover:bg-zinc-150 transition-all"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>
    </div>
  );
}
