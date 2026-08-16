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
import { PALETTE } from "@/utils/paletteeColor";
import { money } from "./useFinancialReport";

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#eab308", "#64748b"];

function ChartTooltip({ active, payload, label, prefix = "$" }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="bg-white border border-zinc-200 rounded-md px-2 py-1 text-xs shadow-sm">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold text-zinc-900">
        {prefix === "$" ? money(value) : value}
      </p>
    </div>
  );
}

export function ChartCard({ title, children, empty }) {
  return (
    <div className="border border-zinc-200 rounded-lg bg-white p-3 min-h-52">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
        {title}
      </p>
      {empty ? (
        <div className="h-40 flex items-center justify-center text-sm text-zinc-400">
          Not enough data for this chart.
        </div>
      ) : (
        <div className="h-40">{children}</div>
      )}
    </div>
  );
}

export function TimeAreaChart({ data, color = PALETTE.accent }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TimeBarChart({ data, color = "#3b82f6" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip prefix="" />} />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BreakdownPie({ data }) {
  const rows = (data || []).filter((d) => Number(d.amount) > 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={rows}
          dataKey="amount"
          nameKey="method"
          innerRadius={36}
          outerRadius={58}
          paddingAngle={2}
        >
          {rows.map((entry, i) => (
            <Cell key={entry.method} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => money(value)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function NamedBarChart({ data, color = PALETTE.accent, valuePrefix = "$" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10 }}
          tickLine={false}
          width={90}
        />
        <Tooltip content={<ChartTooltip prefix={valuePrefix} />} />
        <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function seriesHasValues(series) {
  return Array.isArray(series) && series.some((row) => Number(row.value) > 0);
}
