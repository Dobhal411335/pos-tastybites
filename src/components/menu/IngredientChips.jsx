"use client";

import React from "react";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeIngredients } from "@/lib/menu/addons";

/**
 * Clear ingredient callout for variants / linked addons.
 * Used on online ProductConfigModal and sales order picker.
 */
export default function IngredientChips({
  ingredients,
  label = "Includes",
  className,
  chipClassName,
  compact = false,
}) {
  const list = normalizeIngredients(ingredients);
  if (list.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-2.5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-amber-50/60",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
        className,
      )}
      role="group"
      aria-label={`${label}: ${list.join(", ")}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700">
          <Leaf className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold leading-tight text-emerald-950">
            {label}
          </p>
          <p className="text-[10px] font-medium leading-tight text-emerald-800/70">
            {list.length} item{list.length === 1 ? "" : "s"} in this option
          </p>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {list.map((name) => (
          <li key={name}>
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-emerald-950 shadow-sm",
                chipClassName,
              )}
              title={name}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                aria-hidden
              />
              <span className="truncate">{name}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
