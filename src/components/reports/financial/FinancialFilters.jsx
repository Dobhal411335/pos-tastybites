"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Filter, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
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
import { employeeLabel } from "./useFinancialReport";

const DATE_PRESETS = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "Week" },
  { value: "THIS_MONTH", label: "Month" },
  { value: "CUSTOM", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "WAIVED", label: "Waived" },
];

const PAYMENT_OPTIONS = [
  { value: "ALL", label: "All methods" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "GIFT_CARD", label: "Gift Card" },
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

export default function FinancialFilters({
  value,
  onChange,
  showPaymentMethod = true,
  showStatus = false,
  showTable = false,
  showGuest = false,
  showSearch = false,
  searchPlaceholder = "Search",
  loading = false,
  onRefresh,
  onClear,
}) {
  const [employees, setEmployees] = useState([]);
  const [searchDraft, setSearchDraft] = useState(value.search || "");
  const [tableDraft, setTableDraft] = useState(value.table || "");
  const [guestDraft, setGuestDraft] = useState(value.guest || "");

  const hasExtraFilters = true;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (value.employeeId && value.employeeId !== "ALL") count += 1;
    if (
      showPaymentMethod &&
      value.paymentMethod &&
      value.paymentMethod !== "ALL"
    ) {
      count += 1;
    }
    if (showStatus && value.status && value.status !== "ALL") count += 1;
    if (showTable && value.table && String(value.table).trim()) count += 1;
    if (showGuest && value.guest && String(value.guest).trim()) count += 1;
    if (showSearch && value.search && String(value.search).trim()) count += 1;
    return count;
  }, [
    showPaymentMethod,
    showStatus,
    showTable,
    showGuest,
    showSearch,
    value.employeeId,
    value.paymentMethod,
    value.status,
    value.table,
    value.guest,
    value.search,
  ]);

  useEffect(() => {
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
  }, []);

  const patch = (next) => {
    onChange((prev) => ({ ...prev, ...next, page: 1 }));
  };

  const handleClear = () => {
    setSearchDraft("");
    setTableDraft("");
    setGuestDraft("");
    if (onClear) onClear();
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

  const applyPopoverFilters = () => {
    patch({
      table: showTable ? tableDraft.trim() : value.table || "",
      guest: showGuest ? guestDraft.trim() : value.guest || "",
    });
  };

  const uiPreset = DATE_PRESETS.some((p) => p.value === value.preset)
    ? value.preset
    : "CUSTOM";

  return (
    <div className="flex flex-col gap-3 min-w-0 w-full">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="flex flex-wrap rounded-md border border-zinc-200 bg-white p-0.5">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePreset(preset.value)}
                className={`rounded px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  uiPreset === preset.value
                    ? "bg-orange-500 text-white"
                    : "text-zinc-600 hover:bg-orange-50/50"
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
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
          {showSearch ? (
            <form
              className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial"
              onSubmit={(e) => {
                e.preventDefault();
                patch({ search: searchDraft.trim() });
              }}
            >
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full sm:w-[220px] bg-white"
              />
              <Button type="submit" variant="outline" size="sm" className="h-9 shrink-0">
                Search
              </Button>
            </form>
          ) : null}

          {hasExtraFilters ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0">
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
                        <SelectItem
                          key={String(emp._id)}
                          value={String(emp._id)}
                        >
                          {employeeLabel(emp)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>

                {showPaymentMethod ? (
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

                {showStatus ? (
                  <FilterField label="Order status">
                    <Select
                      value={value.status || "ALL"}
                      onValueChange={(status) => patch({ status })}
                    >
                      <SelectTrigger className="h-9 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FilterField>
                ) : null}

                {showTable ? (
                  <FilterField label="Table">
                    <Input
                      value={tableDraft}
                      onChange={(e) => setTableDraft(e.target.value)}
                      placeholder="Table"
                      className="h-9 bg-white"
                    />
                  </FilterField>
                ) : null}

                {showGuest ? (
                  <FilterField label="Guest">
                    <Input
                      value={guestDraft}
                      onChange={(e) => setGuestDraft(e.target.value)}
                      placeholder="Name or phone"
                      className="h-9 bg-white"
                    />
                  </FilterField>
                ) : null}

                {showTable || showGuest ? (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-9 bg-orange-500 text-white hover:bg-orange-600"
                    onClick={applyPopoverFilters}
                  >
                    Apply
                  </Button>
                ) : null}
              </PopoverContent>
            </Popover>
          ) : null}

          {onClear ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 shrink-0"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}

          {onRefresh ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 shrink-0"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
