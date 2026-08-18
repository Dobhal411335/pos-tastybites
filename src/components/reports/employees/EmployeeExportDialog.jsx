"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PERIOD_OPTIONS = [
  { value: "current", label: "Current dates" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "all_time", label: "All time" },
];

/**
 * Export dialog for Employee & Staff reports — Excel, PDF, or email.
 */
export default function EmployeeExportDialog({
  open,
  onOpenChange,
  exportQuery,
  dateFrom,
  dateTo,
  defaultEmail = "",
  disabled = false,
  rowCount = 0,
  employees = [],
}) {
  const [downloading, setDownloading] = useState(null);
  const [email, setEmail] = useState(defaultEmail || "");
  const [sending, setSending] = useState(false);
  const [scope, setScope] = useState("all");
  const [employeeId, setEmployeeId] = useState("");
  const [period, setPeriod] = useState("current");

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.id === employeeId) || null,
    [employees, employeeId]
  );

  React.useEffect(() => {
    if (!open) return;
    setEmail(defaultEmail || "");
    setScope("all");
    setEmployeeId("");
    setPeriod("current");
    setDownloading(null);
    setSending(false);
  }, [open, defaultEmail]);

  const buildQuery = () => {
    const params = new URLSearchParams(exportQuery);
    params.set("period", period);
    if (scope === "one" && employeeId) {
      params.set("employeeId", employeeId);
      params.delete("staffTab");
      params.delete("search");
    }
    return params;
  };

  const handleDownload = async (kind) => {
    if (scope === "one" && !employeeId) {
      toast.error("Select an employee first");
      return;
    }
    if (period === "all_time" && scope !== "one") {
      toast.error("All time is available for a single employee");
      return;
    }
    setDownloading(kind);
    try {
      const params = buildQuery();
      const res = await fetch(`/api/admin/reports/employees/${kind}?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to download ${kind}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = selectedEmployee?.name
        ? String(selectedEmployee.name).replace(/[^a-zA-Z0-9]+/g, "-")
        : "Staff";
      a.download = `Employee-Report-${slug}-${dateFrom}-to-${dateTo}.${
        kind === "excel" ? "xlsx" : "pdf"
      }`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${kind === "excel" ? "Excel" : "PDF"} downloaded`);
    } catch (err) {
      toast.error(err.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  const handleSend = async () => {
    if (scope === "one" && !employeeId) {
      toast.error("Select an employee first");
      return;
    }
    if (period === "all_time" && scope !== "one") {
      toast.error("All time is available for a single employee");
      return;
    }
    const to = email.trim();
    if (!EMAIL_RE.test(to)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const params = buildQuery();
      const body = Object.fromEntries(params.entries());
      body.to = to;

      const res = await fetch("/api/admin/reports/employees/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send email");
      }
      toast.success(`Report sent to ${to}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const busy = !!downloading || sending || disabled;
  const canExport =
    scope === "one" ? Boolean(employeeId) : rowCount > 0;
  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label || "Current dates";
  const recipientHint =
    scope === "one" && selectedEmployee
      ? selectedEmployee.email
        ? `Sends ${selectedEmployee.name}'s ${periodLabel.toLowerCase()} totals.`
        : `${selectedEmployee.name} has no email on file — enter one below.`
      : `Emails the ${scope === "one" ? "selected employee" : "full staff"} report.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Employee Report</DialogTitle>
          <DialogDescription>
            Download or email performance for {dateFrom} to {dateTo}, or switch the period below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Report for
            </p>
            <div className="flex bg-zinc-100 border border-zinc-200 rounded-lg p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`flex-1 h-8 text-xs ${
                  scope === "all"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
                onClick={() => {
                  setScope("all");
                  if (period === "all_time") setPeriod("current");
                  if (!defaultEmail) setEmail("");
                }}
                disabled={busy}
              >
                All staff
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`flex-1 h-8 text-xs ${
                  scope === "one"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
                onClick={() => setScope("one")}
                disabled={busy}
              >
                One employee
              </Button>
            </div>
          </div>

          {scope === "one" ? (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={employeeId || undefined}
                onValueChange={(value) => {
                  setEmployeeId(value);
                  const next = employees.find((emp) => emp.id === value);
                  if (next?.email) setEmail(next.email);
                }}
                disabled={busy}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                      {emp.role ? ` · ${emp.role}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Period</Label>
            <Select
              value={period}
              onValueChange={setPeriod}
              disabled={busy}
            >
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.value === "all_time" && scope !== "one"}
                  >
                    {option.label}
                    {option.value === "current" ? ` (${dateFrom} to ${dateTo})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Download
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 min-w-[120px] bg-white"
                onClick={() => handleDownload("excel")}
                disabled={busy || !canExport}
              >
                {downloading === "excel" ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                )}
                Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 min-w-[120px] bg-white"
                onClick={() => handleDownload("pdf")}
                disabled={busy || !canExport}
              >
                {downloading === "pdf" ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1.5" />
                )}
                PDF
              </Button>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Send by email
            </p>
            <p className="text-xs text-zinc-500">{recipientHint}</p>
            <div className="space-y-2">
              <Label htmlFor="employee-report-email">Recipient email</Label>
              <Input
                id="employee-report-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  scope === "one"
                    ? "employee@restaurant.com"
                    : "owner@restaurant.com"
                }
                disabled={sending || disabled}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={handleSend}
              disabled={busy || !canExport}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {scope === "one" ? "Send to employee" : "Send Report"}
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
