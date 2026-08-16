"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESETS = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "LAST_WEEK", label: "Last Week" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "CUSTOM", label: "Custom Range" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "IN_STOCK", label: "In Stock" },
  { value: "LOW_STOCK", label: "Low Stock" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
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

function Field({ label, children }) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <Label className="text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function InventoryFilters({
  value,
  onChange,
  categories = [],
  products = [],
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

  const patch = (next) => {
    onChange((prev) => ({ ...prev, ...next, page: 1 }));
  };

  const categoryProducts =
    value.categoryId && value.categoryId !== "ALL"
      ? products.filter((p) => p.categoryId === value.categoryId)
      : products;

  return (
    <div className="border border-zinc-200 rounded-lg bg-white p-3">
      <div className="flex flex-wrap gap-3 items-end overflow-x-auto">
        <Field label="Date range">
          <Select
            value={value.preset}
            onValueChange={(preset) => {
              if (preset === "CUSTOM") {
                const today = format(new Date(), "yyyy-MM-dd");
                patch({
                  preset,
                  dateFrom: value.dateFrom || today,
                  dateTo: value.dateTo || today,
                });
              } else {
                patch({ preset });
              }
            }}
          >
            <SelectTrigger className="h-9 w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {value.preset === "CUSTOM" ? (
          <>
            <Field label="From">
              <DatePicker
                value={ymdToDate(value.dateFrom)}
                onChange={(d) => patch({ dateFrom: dateToYmd(d) })}
                className="h-9 w-[170px]"
              />
            </Field>
            <Field label="To">
              <DatePicker
                value={ymdToDate(value.dateTo)}
                onChange={(d) => patch({ dateTo: dateToYmd(d) })}
                className="h-9 w-[170px]"
              />
            </Field>
          </>
        ) : null}

        <Field label="Category">
          <Select
            value={value.categoryId || "ALL"}
            onValueChange={(categoryId) =>
              patch({ categoryId, productId: "ALL" })
            }
          >
            <SelectTrigger className="h-9 w-[180px] bg-white">
              <SelectValue placeholder="All categories" />
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
        </Field>

        <Field label="Product">
          <Select
            value={value.productId || "ALL"}
            onValueChange={(productId) => patch({ productId })}
          >
            <SelectTrigger className="h-9 w-[200px] bg-white">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All products</SelectItem>
              {categoryProducts.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Stock status">
          <Select
            value={value.stockStatus || "ALL"}
            onValueChange={(stockStatus) => patch({ stockStatus })}
          >
            <SelectTrigger className="h-9 w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Search">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products"
            className="h-9 w-[180px] bg-white"
          />
        </Field>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        Current stock, units, and inventory value are a live snapshot. Movement,
        opening/closing, and top outgoing items use the selected date range.
      </p>
    </div>
  );
}
