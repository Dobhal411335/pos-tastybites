"use client";

import { useEffect, useState } from "react";
import { Download, Filter, RefreshCw, X } from "lucide-react";
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
import {
  DATE_PRESETS,
  PAYMENT_OPTIONS,
  STATUS_OPTIONS,
} from "./useEmployeeReportQuery";

export default function EmployeeReportToolbar({
  title,
  description,
  filters,
  onPresetChange,
  onFiltersChange,
  onClear,
  onRefresh,
  onExport,
  loading,
  filterOptions = {},
  showEmployee = true,
  showRole = true,
  showShift = false,
  showStatus = true,
  showPayment = true,
  showSearch = false,
  searchPlaceholder = "Search…",
}) {
  const [fetchedEmployees, setFetchedEmployees] = useState([]);
  const [fetchedShifts, setFetchedShifts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [empRes, shiftRes] = await Promise.all([
          fetch("/api/employees", { credentials: "include", cache: "no-store" }),
          fetch("/api/employees/shifts?action=templates", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        const empJson = await empRes.json();
        const shiftJson = await shiftRes.json();
        if (cancelled) return;
        if (empJson.success) {
          setFetchedEmployees(
            (empJson.data || []).map((emp) => ({
              id: String(emp._id),
              name: [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim() || emp.email,
              role: emp.role || "Staff",
            }))
          );
        }
        if (shiftJson.success) {
          setFetchedShifts(
            (shiftJson.data || []).map((shift) => ({
              id: String(shift._id),
              name: shift.name,
            }))
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const employees =
    filterOptions.employees?.length > 0 ? filterOptions.employees : fetchedEmployees;
  const roles = [...new Set(employees.map((e) => e.role).filter(Boolean))].sort();
  const shifts =
    filterOptions.shifts?.length > 0 ? filterOptions.shifts : fetchedShifts;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-orange-600">
            Employee & Staff Reports
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm font-medium text-zinc-600">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-zinc-200 bg-white p-0.5">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => onPresetChange(preset.value)}
                className={`rounded px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  filters.preset === preset.value
                    ? "bg-orange-500 text-white"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {filters.preset === "custom" ? (
            <DateRangePicker
              date={{ from: filters.dateFrom, to: filters.dateTo }}
              onDateChange={(range) =>
                onFiltersChange({
                  dateFrom: range?.from || filters.dateFrom,
                  dateTo: range?.to || range?.from || filters.dateTo,
                  page: 1,
                })
              }
            />
          ) : null}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-3 bg-white p-4">
              {showEmployee ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Employee
                  </p>
                  <Select
                    value={filters.employeeId || "ALL"}
                    onValueChange={(value) =>
                      onFiltersChange({ employeeId: value, page: 1 })
                    }
                  >
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="All employees" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      <SelectItem value="ALL">All employees</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {showRole ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Role
                  </p>
                  <Select
                    value={filters.role || "ALL"}
                    onValueChange={(value) =>
                      onFiltersChange({ role: value, page: 1 })
                    }
                  >
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      <SelectItem value="ALL">All roles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {showShift ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Shift
                  </p>
                  <Select
                    value={filters.shiftId || "ALL"}
                    onValueChange={(value) =>
                      onFiltersChange({ shiftId: value, page: 1 })
                    }
                  >
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="All shifts" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      <SelectItem value="ALL">All shifts</SelectItem>
                      {shifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {showStatus ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Order status
                  </p>
                  <Select
                    value={filters.orderStatus || "ALL"}
                    onValueChange={(value) =>
                      onFiltersChange({ orderStatus: value, page: 1 })
                    }
                  >
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {showPayment ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Payment method
                  </p>
                  <Select
                    value={filters.paymentMethod || "ALL"}
                    onValueChange={(value) =>
                      onFiltersChange({ paymentMethod: value, page: 1 })
                    }
                  >
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {PAYMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {showSearch ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Search
                  </p>
                  <Input
                    value={filters.search || ""}
                    onChange={(e) =>
                      onFiltersChange({ search: e.target.value, page: 1 })
                    }
                    placeholder={searchPlaceholder}
                    className="h-9"
                  />
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {onExport ? (
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-orange-500 text-white hover:bg-orange-600"
              onClick={onExport}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
