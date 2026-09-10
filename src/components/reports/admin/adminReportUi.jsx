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
  "text-[13px] font-semibold uppercase tracking-wide text-orange-800/80 bg-orange-50";
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
      : "bg-orange-50 text-orange-700";

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
  const styles =
    tone === "danger"
      ? {
          card: "border-red-200 bg-gradient-to-br from-red-50 to-white",
          icon: "bg-red-500 text-white",
          value: "text-red-700",
          label: "text-red-700/80",
        }
      : tone === "success"
        ? {
            card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
            icon: "bg-emerald-600 text-white",
            value: "text-emerald-700",
            label: "text-emerald-700/80",
          }
        : {
            card: "border-orange-200 bg-gradient-to-br from-orange-50 to-white",
            icon: "bg-orange-500 text-white",
            value: "text-zinc-900",
            label: "text-orange-700/80",
          };

  return (
    <Card
      className={cn(
        "rounded-xl border shadow-sm p-5 sm:p-6 relative overflow-hidden",
        styles.card
      )}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-orange-400/20 to-transparent pointer-events-none" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[12px] font-bold uppercase tracking-wide",
            styles.label
          )}
        >
          {label}
        </p>
        {Icon ? (
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
              styles.icon
            )}
          >
            <Icon className="w-5 h-5" strokeWidth={1.75} />
          </div>
        ) : null}
      </div>
      <p
        className={cn(
          "relative z-10 text-3xl sm:text-4xl font-bold tabular-nums tracking-tight mt-3",
          styles.value
        )}
      >
        {value}
      </p>
      {delta != null ? (
        <div className="relative z-10 mt-2">
          <DeltaBadge percent={delta} label={deltaLabel} />
        </div>
      ) : hint ? (
        <p className="relative z-10 text-[13px] text-zinc-500 mt-2">{hint}</p>
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
          ? "bg-orange-50 text-orange-900 font-semibold hover:bg-orange-50 hover:text-orange-900"
          : "text-zinc-600 hover:bg-orange-50/60 hover:text-zinc-900"
      )}
    >
      <span className="flex items-center gap-3 min-w-0">
        {Icon ? (
          <Icon
            className={cn(
              "h-5 w-5 shrink-0",
              active ? "text-orange-600" : "text-zinc-500"
            )}
            strokeWidth={1.75}
          />
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      {active ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-orange-500" strokeWidth={1.75} />
      ) : null}
    </Button>
  );
}

export function AdminTableCard({ title, action, children, footer }) {
  return (
    <Card className="rounded-xl border border-orange-100/90 bg-white shadow-sm overflow-hidden ring-1 ring-orange-100/50">
      {title || action ? (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 sm:p-6 pb-4 border-b border-orange-100/80 bg-gradient-to-r from-orange-50/80 to-white">
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
      <CardContent className="p-0">{children}</CardContent>
      {footer ? (
        <CardFooter className="justify-between border-t border-orange-100 bg-orange-50/30 py-4">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function AdminNote({ children }) {
  return (
    <p className="text-[13px] text-orange-900/80 border border-orange-200 rounded-xl bg-gradient-to-r from-orange-50 to-white px-4 py-3">
      {children}
    </p>
  );
}

export function AdminEmptyState({ icon: Icon, title, message }) {
  return (
    <Card className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50/60 to-white shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        {Icon ? (
          <div className="mb-4 w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <Icon className="w-7 h-7" strokeWidth={1.75} />
          </div>
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
          <Card
            key={i}
            className="rounded-xl border border-orange-100 shadow-sm p-6 bg-gradient-to-br from-orange-50/40 to-white"
          >
            <Skeleton className="h-4 w-24 bg-orange-100" />
            <Skeleton className="h-10 w-32 mt-4 bg-orange-100" />
            <Skeleton className="h-4 w-28 mt-3 bg-orange-100" />
          </Card>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl bg-orange-50" />
    </div>
  );
}
