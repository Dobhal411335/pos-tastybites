"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import OrderDetailBody from "@/components/reports/OrderDetailBody";
import { employeeInitials } from "../employeeFormat";

function OrderDetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function EmployeeSheetHeaderCard({ employee, subtitle }) {
  if (!employee) return null;
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-11 w-11 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-semibold">
        {employeeInitials(employee.name || "")}
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold text-zinc-900 truncate">{employee.name}</p>
        <p className="text-xs text-zinc-500">
          {employee.role || "Staff"}
          {employee.employeeCode ? ` · ${employee.employeeCode}` : ""}
        </p>
        {subtitle ? <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function SheetKpiGrid({ items = [] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {item.label}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">{item.value}</p>
          {item.hint ? <p className="text-[10px] text-zinc-400 mt-0.5">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function SheetSection({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

/**
 * Shared right sheet chrome for focused employee detail panels.
 */
export default function EmployeeSheetShell({
  open,
  onOpenChange,
  title,
  description,
  loading = false,
  employee = null,
  orderDetail = null,
  orderLoading = false,
  onBackFromOrder = null,
  children,
}) {
  const showingOrder = Boolean(orderDetail) || orderLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl custom-scrollbar p-0 flex flex-col gap-0 overflow-hidden"
      >
        <SheetHeader className="bg-zinc-50 px-4 py-3 pr-12 border-b border-zinc-200 text-left space-y-0">
          {showingOrder ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 -ml-2 bg-orange-500 text-white"
                onClick={onBackFromOrder}
              >
                <ArrowLeft className="h-4 w-4 mr-1 text-white" />
                Back
              </Button>
              <div>
                <SheetTitle className="text-base">
                  Order #{orderDetail?.orderNumber || "Order"}
                </SheetTitle>
                <SheetDescription className="text-xs text-zinc-500">Order details</SheetDescription>
              </div>
            </div>
          ) : (
            <>
              <SheetTitle className="text-base">{title}</SheetTitle>
              <SheetDescription className="text-xs text-zinc-500">
                {description || employee?.name || "Employee details"}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {showingOrder ? (
            orderLoading ? (
              <OrderDetailSkeleton />
            ) : orderDetail ? (
              <OrderDetailBody order={orderDetail} />
            ) : null
          ) : loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            children
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
