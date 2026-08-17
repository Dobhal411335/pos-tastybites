"use client";

import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const TH_CLASS =
  "text-[13px] font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100";
export const TD_CLASS = "text-[15px] text-zinc-800 h-14";

export function DeltaBadge({ percent, label }) {
  const n = Number(percent) || 0;
  const up = n > 0.05;
  const down = n < -0.05;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const tone = up
    ? "bg-emerald-50 text-emerald-700"
    : down
      ? "bg-red-50 text-red-700"
      : "bg-zinc-100 text-zinc-500";

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 text-[13px] font-semibold",
          tone
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        {Math.abs(n).toFixed(1)}%
      </span>
      {label ? (
        <span className="text-[13px] text-zinc-500">{label}</span>
      ) : null}
    </div>
  );
}

export function AdminKpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  hint,
  tone = "neutral",
}) {
  const valueClass =
    tone === "danger"
      ? "text-red-700"
      : tone === "success"
        ? "text-emerald-700"
        : "text-zinc-900";
  const iconClass =
    tone === "danger"
      ? "bg-red-50 text-red-700"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-zinc-100 text-zinc-600";

  return (
    <Card className="rounded-lg border-zinc-200 shadow-sm p-8">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        {Icon ? (
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              iconClass
            )}
          >
            <Icon className="w-6 h-6" strokeWidth={1.75} />
          </div>
        ) : null}
      </div>
      <p
        className={cn(
          "text-4xl font-bold tabular-nums tracking-tight mt-2",
          valueClass
        )}
      >
        {value}
      </p>
      {delta != null ? (
        <div className="mt-2">
          <DeltaBadge percent={delta} label={deltaLabel} />
        </div>
      ) : hint ? (
        <p className="text-[13px] text-zinc-500 mt-2">{hint}</p>
      ) : null}
    </Card>
  );
}

export function AdminSectionNavItem({
  label,
  icon: Icon,
  active,
  onClick,
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full h-12 justify-between px-4 rounded-lg text-[15px] font-normal",
        active
          ? "bg-zinc-100 text-zinc-900 font-semibold hover:bg-zinc-100 hover:text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      <span className="flex items-center gap-3 min-w-0">
        {Icon ? (
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      {active ? (
        <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      ) : null}
    </Button>
  );
}

export function AdminTableCard({ title, action, children, footer }) {
  return (
    <Card className="rounded-lg border-zinc-200 shadow-sm overflow-hidden">
      {title || action ? (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
          {title ? (
            <CardTitle className="text-lg font-semibold text-zinc-900">
              {title}
            </CardTitle>
          ) : (
            <span />
          )}
          {action || null}
        </CardHeader>
      ) : null}
      <CardContent className={title || action ? "p-0" : "p-0"}>
        {children}
      </CardContent>
      {footer ? (
        <CardFooter className="justify-between border-t border-zinc-200 py-4">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function AdminNote({ children }) {
  return (
    <p className="text-[13px] text-zinc-500 border border-zinc-200 rounded-lg bg-white px-4 py-3">
      {children}
    </p>
  );
}

export function AdminEmptyState({ icon: Icon, title, message }) {
  return (
    <Card className="rounded-lg border-zinc-200 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        {Icon ? (
          <Icon className="w-10 h-10 text-zinc-300 mb-4" strokeWidth={1.75} />
        ) : null}
        {title ? (
          <p className="text-lg font-semibold text-zinc-800">{title}</p>
        ) : null}
        <p className="text-[13px] text-zinc-500 mt-1">{message}</p>
      </CardContent>
    </Card>
  );
}

export function AdminReportSkeleton({ cards = 4 }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: cards }).map((_, i) => (
          <Card key={i} className="rounded-lg border-zinc-200 shadow-sm p-8">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-32 mt-4" />
            <Skeleton className="h-4 w-28 mt-3" />
          </Card>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
