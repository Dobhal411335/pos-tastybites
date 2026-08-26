"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Loader2, Mail } from "lucide-react";
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
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "THIS_MONTH", label: "This month" },
];

/**
 * Export dialog for Admin Reports — Excel, PDF, or email
 * (same interaction pattern as EmployeeExportDialog / InventoryExportDialog).
 */
export default function AdminExportDialog({
  open,
  onOpenChange,
  exportQuery = "",
  reportTitle = "Admin Report",
  dateFrom = "",
  dateTo = "",
  section = "daily-summary",
  defaultEmail = "",
  disabled = false,
}) {
  const [downloading, setDownloading] = useState(null);
  const [period, setPeriod] = useState("current");
  const [email, setEmail] = useState(defaultEmail || "");
  const [sending, setSending] = useState(false);

  const resetForm = () => {
    setDownloading(null);
    setPeriod("current");
    setEmail(defaultEmail || "");
    setSending(false);
  };

  const handleOpenChange = (next) => {
    if (next) resetForm();
    onOpenChange(next);
  };

  const buildParams = () => {
    const params = new URLSearchParams(exportQuery);
    if (section) params.set("section", section);
    if (period !== "current") {
      params.set("preset", period);
      params.delete("dateFrom");
      params.delete("dateTo");
    }
    return params;
  };

  const handleDownload = async (kind) => {
    setDownloading(kind);
    try {
      const params = buildParams();
      const res = await fetch(`/api/admin/reports/admin/${kind}?${params}`, {
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
      const slug = String(reportTitle || "Report").replace(/[^a-zA-Z0-9]+/g, "-");
      a.download = `Admin-${slug}-${dateFrom || "report"}-to-${
        dateTo || "report"
      }.${kind === "excel" ? "xlsx" : "pdf"}`;
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
    const to = email.trim();
    if (!EMAIL_RE.test(to)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const params = buildParams();
      const body = Object.fromEntries(params.entries());
      body.to = to;

      const res = await fetch("/api/admin/reports/admin/email", {
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
  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label ||
    "Current dates";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export {reportTitle}</DialogTitle>
          <DialogDescription>
            Download or email this report
            {dateFrom && dateTo ? ` for ${dateFrom} to ${dateTo}` : ""}, or
            switch the period below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={setPeriod} disabled={busy}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                    {option.value === "current" && dateFrom && dateTo
                      ? ` (${dateFrom} to ${dateTo})`
                      : ""}
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
                disabled={busy}
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
                disabled={busy}
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
            <p className="text-xs text-zinc-500">
              Emails PDF and Excel for {periodLabel.toLowerCase()} to any
              recipient.
            </p>
            <div className="space-y-2">
              <Label htmlFor="admin-report-email">Recipient email</Label>
              <Input
                id="admin-report-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@restaurant.com"
                disabled={sending || disabled}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={handleSend}
              disabled={busy}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Report
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={sending}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
