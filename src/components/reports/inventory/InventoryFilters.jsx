"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DATE_PRESETS = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "Week" },
  { value: "LAST_WEEK", label: "Last Week" },
  { value: "THIS_MONTH", label: "Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "CUSTOM", label: "Custom" },
];

function ymdToDate(ymd) {
  if (!ymd) return undefined;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function dateToYmd(date) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

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

  const patch = (next) => onChange((prev) => ({ ...prev, ...next, page: 1 }));

  const onPresetChange = (preset) => {
    if (preset === "CUSTOM") {
      const today = format(new Date(), "yyyy-MM-dd");
      patch({
        preset,
        dateFrom: value.dateFrom || today,
        dateTo: value.dateTo || today,
      });
      return;
    }
    patch({ preset, dateFrom: "", dateTo: "" });
  };

  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-zinc-100 border border-zinc-300 rounded-lg p-1">
            {DATE_PRESETS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                size="sm"
                className={`h-8 px-3 text-xs ${
                  value.preset === option.value
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
                onClick={() => onPresetChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {value.preset === "CUSTOM" ? (
            <DateRangePicker
              dateFrom={ymdToDate(value.dateFrom)}
              dateTo={ymdToDate(value.dateTo)}
              onChange={({ from, to }) =>
                patch({
                  preset: "CUSTOM",
                  dateFrom: dateToYmd(from),
                  dateTo: dateToYmd(to || from),
                })
              }
              className="h-10"
            />
          ) : null}
        </div>
      </div>

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
        <Select
          value={value.stockStatus || "ALL"}
          onValueChange={(stockStatus) => patch({ stockStatus })}
        >
          <SelectTrigger className="h-11 w-full sm:w-44 bg-white border-zinc-200">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="IN_STOCK">In stock</SelectItem>
            <SelectItem value="LOW_STOCK">Low stock</SelectItem>
            <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
