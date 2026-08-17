"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const STATUS_BADGE = {
  IN_STOCK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  LOW_STOCK: "border-amber-200 bg-amber-50 text-amber-800",
  OUT_OF_STOCK: "border-red-200 bg-red-50 text-red-700",
};

export const STATUS_LABEL = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

export function StockStatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${STATUS_BADGE[status] || ""}`}
    >
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

export function ReportPager({ data, onPage }) {
  return (
    <div className="flex items-center justify-between text-sm text-zinc-500">
      <p>{data?.total || 0} records</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={(data?.page || 1) <= 1}
          onClick={() => onPage((data?.page || 1) - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span>
          Page {data?.page || 1} of {data?.pageCount || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={(data?.page || 1) >= (data?.pageCount || 1)}
          onClick={() => onPage((data?.page || 1) + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
