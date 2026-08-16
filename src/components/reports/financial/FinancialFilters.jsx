"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeLabel } from "./useFinancialReport";

const PRESETS = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "LAST_WEEK", label: "Last Week" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "CUSTOM", label: "Custom Range" },
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

function Field({ label, children }) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <Label className="text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function FinancialFilters({
  value,
  onChange,
  showPaymentMethod = true,
  showTable = false,
  showGuest = false,
  showSearch = false,
  searchPlaceholder = "Search",
}) {
  const [employees, setEmployees] = useState([]);
  const [tableInput, setTableInput] = useState(value.table || "");
  const [guestInput, setGuestInput] = useState(value.guest || "");
  const [searchInput, setSearchInput] = useState(value.search || "");

  useEffect(() => {
    setTableInput(value.table || "");
    setGuestInput(value.guest || "");
    setSearchInput(value.search || "");
  }, [value.table, value.guest, value.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange((prev) => {
        if (
          tableInput === (prev.table || "") &&
          guestInput === (prev.guest || "") &&
          searchInput === (prev.search || "")
        ) {
          return prev;
        }
        return {
          ...prev,
          table: tableInput,
          guest: guestInput,
          search: searchInput,
          page: 1,
        };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [tableInput, guestInput, searchInput, onChange]);

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

  return (
    <div className="border border-zinc-200 rounded-lg bg-white p-3">
      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Date range">
          <Select
            value={value.preset}
            onValueChange={(preset) => {
              if (preset === "CUSTOM") {
                const today = format(new Date(), "yyyy-MM-dd");
                patch({
                  preset,
                  dateFrom: value.dateFrom || today,
                  dateTo: value.dateTo || today,
                });
              } else {
                patch({ preset });
              }
            }}
          >
            <SelectTrigger className="h-9 w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {value.preset === "CUSTOM" ? (
          <>
            <Field label="From">
              <DatePicker
                value={ymdToDate(value.dateFrom)}
                onChange={(d) => patch({ dateFrom: dateToYmd(d) })}
                className="h-9 w-[170px]"
              />
            </Field>
            <Field label="To">
              <DatePicker
                value={ymdToDate(value.dateTo)}
                onChange={(d) => patch({ dateTo: dateToYmd(d) })}
                className="h-9 w-[170px]"
              />
            </Field>
          </>
        ) : null}

        <Field label="Employee">
          <Select
            value={value.employeeId || "ALL"}
            onValueChange={(employeeId) => patch({ employeeId })}
          >
            <SelectTrigger className="h-9 w-[180px] bg-white">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={String(emp._id)} value={String(emp._id)}>
                  {employeeLabel(emp)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Order status">
          <Select
            value={value.status || "ALL"}
            onValueChange={(status) => patch({ status })}
          >
            <SelectTrigger className="h-9 w-[150px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {showPaymentMethod ? (
          <Field label="Payment method">
            <Select
              value={value.paymentMethod || "ALL"}
              onValueChange={(paymentMethod) => patch({ paymentMethod })}
            >
              <SelectTrigger className="h-9 w-[150px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        {showTable ? (
          <Field label="Table">
            <Input
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              placeholder="Table"
              className="h-9 w-[110px] bg-white"
            />
          </Field>
        ) : null}

        {showGuest ? (
          <Field label="Guest">
            <Input
              value={guestInput}
              onChange={(e) => setGuestInput(e.target.value)}
              placeholder="Name or phone"
              className="h-9 w-[160px] bg-white"
            />
          </Field>
        ) : null}

        {showSearch ? (
          <Field label="Search">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-[180px] bg-white"
            />
          </Field>
        ) : null}
      </div>
    </div>
  );
}
