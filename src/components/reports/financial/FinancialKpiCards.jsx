"use client";

import { AdminKpiCard } from "@/components/reports/admin/adminReportUi";
import { money } from "./useFinancialReport";
import { cn } from "@/lib/utils";

export default function FinancialKpiCards({
  items = [],
  className,
  columns = "auto",
}) {
  const gridClass =
    columns === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-6"
      : columns === 3
        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
        : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6";

  return (
    <div className={cn(gridClass, className)}>
      {items.map((item) => (
        <AdminKpiCard
          key={item.label}
          label={item.label}
          value={
            item.displayValue != null
              ? item.displayValue
              : item.money
                ? money(item.value)
                : item.value
          }
          icon={item.icon}
          hint={item.hint}
          tone={item.tone}
          delta={item.delta}
          deltaLabel={item.deltaLabel}
        />
      ))}
    </div>
  );
}
