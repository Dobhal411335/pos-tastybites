"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { PALETTE } from "@/utils/paletteeColor";
import { money } from "./employeeFormat";

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#eab308", "#64748b"];

export function EmployeeKpiCards({ items = [], loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-zinc-200 bg-white px-3 py-2"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {item.label}
          </p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">
            {item.money ? money(item.value) : item.value}
          </p>
          {item.hint ? (
            <p className="text-[10px] text-zinc-400 mt-0.5">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, children, empty, loading, tall = false }) {
  return (
    <div className={`border border-zinc-200 rounded-lg bg-white p-3 ${tall ? "min-h-64" : "min-h-52"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
        {title}
      </p>
      {loading ? (
        <Skeleton className={`w-full ${tall ? "h-52" : "h-40"}`} />
      ) : empty ? (
        <div className={`${tall ? "h-52" : "h-40"} flex items-center justify-center text-sm text-zinc-400`}>
          Not enough data for this chart.
        </div>
      ) : (
        <div className={tall ? "h-52" : "h-40"}>{children}</div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label, moneyValue = false }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="bg-white border border-zinc-200 rounded-md px-2 py-1 text-xs shadow-sm">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold text-zinc-900">
        {moneyValue ? money(value) : Number(value || 0).toLocaleString("en-US")}
      </p>
    </div>
  );
}

export function TimeAreaChart({ data, dataKey = "value", color = PALETTE.accent }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip moneyValue />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function NamedBarChart({
  data,
  dataKey = "value",
  color = PALETTE.accent,
  moneyValue = true,
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={88}
          tick={{ fontSize: 10 }}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip moneyValue={moneyValue} />} />
        <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={2}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip moneyValue />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ReportEmpty({ message = "No data for the selected filters." }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-6 py-16 text-center">
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}

export function ReportError({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 px-6 py-10 text-center">
      <p className="text-sm text-red-700">{message || "Something went wrong."}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-orange-600 hover:underline"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((__, j) => (
            <Skeleton key={j} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
