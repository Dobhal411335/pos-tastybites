"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InventoryFilters({
  value,
  onChange,
  categories = [],
}) {
  const [searchInput, setSearchInput] = useState(value.search || "");

  useEffect(() => {
    setSearchInput(value.search || "");
  }, [value.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange((prev) => {
        if (searchInput === (prev.search || "")) return prev;
        return { ...prev, search: searchInput, page: 1 };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, onChange]);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products..."
          className="h-11 pl-9 bg-white border-zinc-200"
        />
      </div>
      <Select
        value={value.categoryId || "ALL"}
        onValueChange={(categoryId) =>
          onChange((prev) => ({
            ...prev,
            categoryId,
            productId: "ALL",
            page: 1,
          }))
        }
      >
        <SelectTrigger className="h-11 w-full sm:w-48 bg-white border-zinc-200">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
