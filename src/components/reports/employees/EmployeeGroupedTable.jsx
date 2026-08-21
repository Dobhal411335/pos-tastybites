"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatHoursLabel, money } from "./employeeFormat";

function splitName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: "—", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Hierarchical employee performance table:
 * TOTAL row + expandable employee rows with metric breakdown.
 */
export default function EmployeeGroupedTable({
  rows = [],
  loading = false,
  onOpenEmployee,
}) {
  const [expanded, setExpanded] = useState(() => new Set());

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.orders += Number(row.orders) || 0;
        acc.sales += Number(row.sales) || 0;
        acc.tips += Number(row.tips) || 0;
        acc.serviceCharges += Number(row.serviceCharges) || 0;
        acc.hours += Number(row.hours) || 0;
        acc.estimatedPay += Number(row.estimatedPay) || 0;
        acc.cancellations += Number(row.cancellations) || 0;
        return acc;
      },
      {
        orders: 0,
        sales: 0,
        tips: 0,
        serviceCharges: 0,
        hours: 0,
        estimatedPay: 0,
        cancellations: 0,
      }
    );
  }, [rows]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#FCE4D6] hover:bg-[#FCE4D6]">
            <TableHead className="border-r border-zinc-300/80 text-zinc-800 font-bold">
              Group
            </TableHead>
            <TableHead className="border-r border-zinc-300/80 text-right text-zinc-800 font-bold">
              Orders (#)
            </TableHead>
            <TableHead className="border-r border-zinc-300/80 text-right text-zinc-800 font-bold">
              Net Sales ($)
            </TableHead>
            <TableHead className="border-r border-zinc-300/80 text-right text-zinc-800 font-bold">
              Tips ($)
            </TableHead>
            <TableHead className="border-r border-zinc-300/80 text-right text-zinc-800 font-bold">
              Svc Charges ($)
            </TableHead>
            <TableHead className="text-right text-zinc-800 font-bold">Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-zinc-100 font-semibold hover:bg-zinc-100">
            <TableCell className="border-r border-zinc-200">TOTAL</TableCell>
            <TableCell className="border-r border-zinc-200 text-right tabular-nums">
              {totals.orders}
            </TableCell>
            <TableCell className="border-r border-zinc-200 text-right tabular-nums">
              {money(totals.sales)}
            </TableCell>
            <TableCell className="border-r border-zinc-200 text-right tabular-nums">
              {money(totals.tips)}
            </TableCell>
            <TableCell className="border-r border-zinc-200 text-right tabular-nums">
              {money(totals.serviceCharges)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatHoursLabel(totals.hours)}
            </TableCell>
          </TableRow>

          {rows.map((row) => {
            const open = expanded.has(row.employeeId);
            const { firstName, lastName } = splitName(row.name);
            return (
              <FragmentRows
                key={row.employeeId}
                row={row}
                open={open}
                firstName={firstName}
                lastName={lastName}
                onToggle={() => toggle(row.employeeId)}
                onOpenEmployee={onOpenEmployee}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function FragmentRows({
  row,
  open,
  firstName,
  lastName,
  onToggle,
  onOpenEmployee,
}) {
  const breakdown = [
    { label: "Sales", value: money(row.sales) },
    {
      label: "Tips",
      value: `${money(row.tips)}${
        row.receiveOwnTips
          ? " (earned)"
          : Number(row.tipPercent) > 0
            ? ` (${row.tipPercent}%)`
            : ""
      }`,
    },
    { label: "Gratuity", value: "—" },
    { label: "Service Charges", value: money(row.serviceCharges) },
    { label: "Regular Hours", value: formatHoursLabel(row.regularHours) },
    { label: "Overtime Hours", value: formatHoursLabel(row.overtimeHours) },
    { label: "Est. Pay", value: money(row.estimatedPay) },
    { label: "Cancellations", value: String(row.cancellations || 0) },
  ];

  return (
    <>
      <TableRow className="hover:bg-orange-50/30 border-b border-zinc-100">
        <TableCell className="border-r border-zinc-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="p-0.5 rounded hover:bg-zinc-100 text-zinc-600"
              aria-label={open ? "Collapse" : "Expand"}
            >
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              className="text-left hover:cursor-pointer"
              onClick={() => onOpenEmployee?.(row.employeeId, row)}
            >
              <p className="text-sm font-semibold text-zinc-900 hover:text-orange-600">
                {row.name}
              </p>
              <p className="text-[11px] text-zinc-500">
                {[row.employeeCode, row.role, firstName && lastName ? `${firstName} ${lastName}` : null]
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(" · ")}
              </p>
            </button>
          </div>
        </TableCell>
        <TableCell className="border-r border-zinc-100 text-right tabular-nums text-sm">
          {row.orders || 0}
        </TableCell>
        <TableCell className="border-r border-zinc-100 text-right tabular-nums text-sm">
          {money(row.sales)}
        </TableCell>
        <TableCell className="border-r border-zinc-100 text-right tabular-nums text-sm">
          {money(row.tips)}
        </TableCell>
        <TableCell className="border-r border-zinc-100 text-right tabular-nums text-sm">
          {money(row.serviceCharges)}
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm">
          {formatHoursLabel(row.hours)}
        </TableCell>
      </TableRow>
      {open
        ? breakdown.map((item) => (
            <TableRow key={`${row.employeeId}-${item.label}`} className="bg-zinc-50/80">
              <TableCell
                colSpan={5}
                className="border-r border-zinc-100 pl-12 text-xs text-zinc-600"
              >
                {item.label}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs font-medium text-zinc-800">
                {item.value}
              </TableCell>
            </TableRow>
          ))
        : null}
    </>
  );
}

/**
 * Payroll-style earnings table (peach header, bordered grid).
 */
export function EmployeePayrollTable({ rows = [], onOpenEmployee }) {
  return (
    <div className="rounded-lg border border-zinc-300 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#FCE4D6] hover:bg-[#FCE4D6]">
            {[
              "Employee ID",
              "Employee",
              "Position",
              "Hourly Rate",
              "Hours Worked",
              "Total Earnings",
            ].map((label, i, arr) => (
              <TableHead
                key={label}
                className={`text-center font-bold text-zinc-800 ${
                  i < arr.length - 1 ? "border-r border-zinc-300" : ""
                }`}
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.employeeId}
              className="cursor-pointer hover:bg-orange-50/40"
              onClick={() => onOpenEmployee?.(row.employeeId, row)}
            >
              <TableCell className="border border-zinc-200 text-center tabular-nums text-sm">
                {row.employeeCode || "—"}
              </TableCell>
              <TableCell className="border border-zinc-200 text-center text-sm font-medium">
                {row.name || "—"}
              </TableCell>
              <TableCell className="border border-zinc-200 text-center text-sm">
                {row.role || "Staff"}
              </TableCell>
              <TableCell className="border border-zinc-200 text-center tabular-nums text-sm">
                {money(row.hourlyRate)}
              </TableCell>
              <TableCell className="border border-zinc-200 text-center tabular-nums text-sm">
                {Number(row.hours || 0).toFixed(2)}
              </TableCell>
              <TableCell className="border border-zinc-200 text-center tabular-nums text-sm font-semibold">
                {money(row.estimatedPay)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PosSummaryCards({ overview, loading }) {
  if (loading) {
    return (
      <section className="rounded-xl border border-orange-200 bg-gradient-to-br from-[#FFF7ED] via-white to-white p-4 shadow-sm ring-1 ring-orange-100/80">
        <div className="mb-3 border-b border-orange-100 pb-2.5">
          <h2 className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
            Overview highlights
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            Key sales, labor, and order totals for this period
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-orange-50/60 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-orange-200 bg-gradient-to-br from-[#FFF7ED] via-white to-white p-4 shadow-sm ring-1 ring-orange-100/80">
      <div className="mb-3 border-b border-orange-100 pb-2.5">
        <h2 className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
          Overview highlights
        </h2>
        <p className="mt-0.5 text-sm text-zinc-600">
          Key sales, labor, and order totals for this period
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-orange-100/90 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-zinc-900 mb-3">Net Sales</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Sales Total</span>
              <span className="font-bold tabular-nums">{money(overview.totalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Tips</span>
              <span className="font-bold tabular-nums">
                {money(overview.distributedTips ?? overview.totalTips)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Gratuities</span>
              <span className="font-bold tabular-nums text-zinc-400">$0.00</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-orange-100/90 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-zinc-900 mb-3">Labor & Hours</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Working Hours</span>
              <span className="font-bold tabular-nums">
                {formatHoursLabel(overview.totalHours)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Est. Labor Cost</span>
              <span className="font-bold tabular-nums">
                {overview.laborConfigured ? money(overview.estimatedPay) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Clocked In</span>
              <span className="font-bold tabular-nums">{overview.clockedIn || 0}</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-orange-100/90 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-zinc-900 mb-3">Orders</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Completed</span>
              <span className="font-bold tabular-nums">
                {overview.completedOrders || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Service Charges</span>
              <span className="font-bold tabular-nums">
                {money(overview.serviceCharges)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Cancellations</span>
              <span className="font-bold tabular-nums">{overview.cancelCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
