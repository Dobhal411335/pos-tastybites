"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Filter, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeLabel } from "./useAdminReport";

const DATE_PRESETS = [
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "Week" },
  { value: "THIS_MONTH", label: "Month" },
  { value: "CUSTOM", label: "Custom" },
];

const PAYMENT_OPTIONS = [
  { value: "ALL", label: "All methods" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "GIFT_CARD", label: "Gift Card" },
];

const ACTIVITY_EVENTS = [
  { value: "ALL", label: "All actions" },
  { value: "TABLE_ASSIGNED", label: "Table assigned" },
  { value: "TABLE_RELEASED", label: "Table released" },
  { value: "TABLE_TRANSFERRED", label: "Table transferred" },
  { value: "GUEST_COUNT_CHANGED", label: "Guest count changed" },
  { value: "TABLE_RECONFIGURED", label: "Table reconfigured" },
  { value: "ORDER_CREATED", label: "Order created" },
  { value: "ORDER_UPDATED", label: "Order updated" },
  { value: "ORDER_CANCELLED", label: "Order cancelled / waived" },
  { value: "PAYMENT_COMPLETED", label: "Payment completed" },
  { value: "ADMIN_OVERRIDE", label: "Admin override" },
];

const AUDIT_EVENTS = [
  { value: "ALL", label: "All events" },
  { value: "ORDER_CANCELLED", label: "Order cancelled / waived" },
  { value: "DISCOUNT_APPLIED", label: "Discount applied" },
  { value: "GIFT_CARD_USED", label: "Gift card used" },
];

const KOT_STATUSES = [
  { value: "ALL", label: "All statuses" },
  { value: "QUEUED", label: "Queued" },
  { value: "PRINTING", label: "Printing" },
  { value: "PRINTED", label: "Printed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function ymdToDate(ymd) {
  if (!ymd) return undefined;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function dateToYmd(date) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function FilterField({ label, children }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function AdminReportFilters({
  value,
  onChange,
  section,
  loading = false,
  canExport = false,
  onRefresh,
  onClear,
  onExport,
}) {
  const [employees, setEmployees] = useState([]);
  const showDate = section !== "eod" && section !== "expenses";
  const showEmployee =
    section === "revenue" ||
    section === "daily-summary" ||
    section === "audit" ||
    section === "kitchen";
  const showPayment = section === "revenue" || section === "daily-summary";
  const showActivityEvent = section === "activity";
  const showAuditEvent = section === "audit";
  const showKotStatus = section === "kitchen";

  const hasExtraFilters =
    showEmployee ||
    showPayment ||
    showActivityEvent ||
    showAuditEvent ||
    showKotStatus;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (showEmployee && value.employeeId && value.employeeId !== "ALL") count += 1;
    if (showPayment && value.paymentMethod && value.paymentMethod !== "ALL") {
      count += 1;
    }
    if (
      (showActivityEvent || showAuditEvent) &&
      value.eventType &&
      value.eventType !== "ALL"
    ) {
      count += 1;
    }
    if (showKotStatus && value.kotStatus && value.kotStatus !== "ALL") count += 1;
    return count;
  }, [
    showEmployee,
    showPayment,
    showActivityEvent,
    showAuditEvent,
    showKotStatus,
    value.employeeId,
    value.paymentMethod,
    value.eventType,
    value.kotStatus,
  ]);

  useEffect(() => {
    if (!showEmployee) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/employees", { credentials: "include" });
        const json = await res.json();
        if (!cancelled && json.success) {
          setEmployees(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showEmployee]);

  const patch = (next) => {
    onChange((prev) => ({ ...prev, ...next, page: 1 }));
  };

  const handlePreset = (preset) => {
    if (preset === "CUSTOM") {
      const today = format(new Date(), "yyyy-MM-dd");
      patch({
        preset,
        dateFrom: value.dateFrom || today,
        dateTo: value.dateTo || today,
      });
      return;
    }
    patch({ preset, dateFrom: "", dateTo: "" });
  };

  const uiPreset = DATE_PRESETS.some((p) => p.value === value.preset)
    ? value.preset
    : "CUSTOM";

  const eventOptions = showActivityEvent ? ACTIVITY_EVENTS : AUDIT_EVENTS;

  if (!showDate && !hasExtraFilters && !canExport && !onRefresh) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showDate ? (
        <>
          <div className="flex rounded-md border border-zinc-200 bg-white p-0.5">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePreset(preset.value)}
                className={`rounded px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  uiPreset === preset.value
                    ? "bg-orange-500 text-white"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {uiPreset === "CUSTOM" ? (
            <DateRangePicker
              dateFrom={ymdToDate(value.dateFrom)}
              dateTo={ymdToDate(value.dateTo)}
              onChange={({ from, to }) =>
                patch({
                  preset: "CUSTOM",
                  dateFrom: dateToYmd(from),
                  dateTo: dateToYmd(to || from),
                })
              }
              className="h-9"
            />
          ) : null}
        </>
      ) : null}

      {hasExtraFilters ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3 bg-white p-4">
            {showEmployee ? (
              <FilterField label="Employee">
                <Select
                  value={value.employeeId || "ALL"}
                  onValueChange={(employeeId) => patch({ employeeId })}
                >
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60">
                    <SelectItem value="ALL">All employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={String(emp._id)} value={String(emp._id)}>
                        {employeeLabel(emp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {showPayment ? (
              <FilterField label="Payment method">
                <Select
                  value={value.paymentMethod || "ALL"}
                  onValueChange={(paymentMethod) => patch({ paymentMethod })}
                >
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {PAYMENT_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {showActivityEvent || showAuditEvent ? (
              <FilterField label="Event type">
                <Select
                  value={value.eventType || "ALL"}
                  onValueChange={(eventType) => patch({ eventType })}
                >
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {eventOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {showKotStatus ? (
              <FilterField label="KOT status">
                <Select
                  value={value.kotStatus || "ALL"}
                  onValueChange={(kotStatus) => patch({ kotStatus })}
                >
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {KOT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}
          </PopoverContent>
        </Popover>
      ) : null}

      {onClear ? (
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      ) : null}

      {onRefresh ? (
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      ) : null}

      {canExport && onExport ? (
        <Button
          size="sm"
          className="h-9 gap-1.5 bg-orange-500 text-white hover:bg-orange-600"
          onClick={onExport}
          disabled={loading}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      ) : null}
    </div>
  );
}
