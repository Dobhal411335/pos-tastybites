"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeLabel } from "./useAdminReport";

const PRESETS = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "LAST_WEEK", label: "Last Week" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "CUSTOM", label: "Custom Range" },
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

function Field({ label, children }) {
  return (
    <div className="space-y-2 min-w-[140px]">
      <Label className="text-[13px] font-semibold text-zinc-800">{label}</Label>
      {children}
    </div>
  );
}

export default function AdminReportFilters({ value, onChange, section }) {
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

  if (!showDate && !showEmployee && !showPayment) return null;

  const patch = (next) => {
    onChange((prev) => ({ ...prev, ...next, page: 1 }));
  };

  const eventOptions = showActivityEvent ? ACTIVITY_EVENTS : AUDIT_EVENTS;

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {showDate ? (
        <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2">
          <CalendarDays className="h-[18px] w-[18px] text-zinc-500 shrink-0" />
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
            <SelectTrigger className="h-8 w-[160px] border-0 bg-transparent shadow-none px-0 font-semibold text-[13px] text-zinc-900 focus:ring-0">
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
        </div>
      ) : null}

      {showDate && value.preset === "CUSTOM" ? (
        <>
          <Field label="From">
            <DatePicker
              value={ymdToDate(value.dateFrom)}
              onChange={(d) => patch({ dateFrom: dateToYmd(d) })}
              className="h-11 w-[170px]"
            />
          </Field>
          <Field label="To">
            <DatePicker
              value={ymdToDate(value.dateTo)}
              onChange={(d) => patch({ dateTo: dateToYmd(d) })}
              className="h-11 w-[170px]"
            />
          </Field>
        </>
      ) : null}

      {showEmployee ? (
        <Field label="Employee">
          <Select
            value={value.employeeId || "ALL"}
            onValueChange={(employeeId) => patch({ employeeId })}
          >
            <SelectTrigger className="h-11 w-[180px] bg-white">
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
      ) : null}

      {showPayment ? (
        <Field label="Payment method">
          <Select
            value={value.paymentMethod || "ALL"}
            onValueChange={(paymentMethod) => patch({ paymentMethod })}
          >
            <SelectTrigger className="h-11 w-[150px] bg-white">
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

      {showActivityEvent || showAuditEvent ? (
        <Field label="Event type">
          <Select
            value={value.eventType || "ALL"}
            onValueChange={(eventType) => patch({ eventType })}
          >
            <SelectTrigger className="h-11 w-[210px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {showKotStatus ? (
        <Field label="KOT status">
          <Select
            value={value.kotStatus || "ALL"}
            onValueChange={(kotStatus) => patch({ kotStatus })}
          >
            <SelectTrigger className="h-11 w-[150px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KOT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
    </div>
  );
}
