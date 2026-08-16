"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import FinancialEmpty from "@/components/reports/financial/FinancialEmpty";
import {
  BreakdownPie,
  ChartCard,
  NamedBarChart,
  seriesHasValues,
} from "@/components/reports/financial/FinancialCharts";
import { qty } from "./useInventoryReport";

function MovementTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-md px-2 py-1 text-xs shadow-sm">
      <p className="text-zinc-500">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="font-semibold text-zinc-900">
          {entry.name}: {qty(entry.value)}
        </p>
      ))}
    </div>
  );
}

function MovementOverTimeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} width={48} />
        <Tooltip content={<MovementTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="stockIn" name="Stock In" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="stockOut" name="Stock Out" fill="#f97316" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function OverviewTab({ data }) {
  if (!data || data.empty) {
    return <FinancialEmpty message="No products found." />;
  }

  const charts = data.charts || {};
  const balance = data.balance || {};
  const movementHasValues = (charts.movementOverTime || []).some(
    (row) => Number(row.stockIn) > 0 || Number(row.stockOut) > 0
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["Opening Stock", balance.opening],
          ["Stock Added", balance.added],
          ["Stock Removed", balance.removed],
          ["Closing Stock", balance.closing],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {label}
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">
              {qty(value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="Stock by category"
          empty={!charts.stockByCategory?.some((r) => Number(r.value) !== 0)}
        >
          <NamedBarChart data={charts.stockByCategory} valuePrefix="" />
        </ChartCard>
        <ChartCard
          title="Inventory value by category"
          empty={!charts.stockValueByCategory?.some((r) => r.amount > 0)}
        >
          <BreakdownPie data={charts.stockValueByCategory} />
        </ChartCard>
        <ChartCard
          title="Top outgoing products"
          empty={!seriesHasValues(charts.topOutgoing)}
        >
          <NamedBarChart data={charts.topOutgoing} color="#3b82f6" valuePrefix="" />
        </ChartCard>
        <ChartCard title="Stock movement over time" empty={!movementHasValues}>
          <MovementOverTimeChart data={charts.movementOverTime} />
        </ChartCard>
      </div>
    </div>
  );
}
