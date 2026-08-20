"use client";

import React, { useState } from "react";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InventoryExportDialog({
  open,
  onOpenChange,
  exportQuery,
  dateFrom,
  dateTo,
  defaultEmail = "",
  disabled = false,
  rowCount = 0,
}) {
  const [downloading, setDownloading] = useState(null);
  const [email, setEmail] = useState(defaultEmail || "");
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEmail(defaultEmail || "");
    setDownloading(null);
    setSending(false);
  }, [open, defaultEmail]);

  const handleDownload = async (kind) => {
    setDownloading(kind);
    try {
      const res = await fetch(`/api/admin/reports/inventory/${kind}?${exportQuery}`, {
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
      a.download = `Inventory-Stock-${dateFrom}-to-${dateTo}.${
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
    const to = email.trim();
    if (!EMAIL_RE.test(to)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const body = Object.fromEntries(new URLSearchParams(exportQuery).entries());
      body.to = to;

      const res = await fetch("/api/admin/reports/inventory/email", {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Inventory Report</DialogTitle>
          <DialogDescription>
            Download or email stock overview and movement data for {dateFrom} to{" "}
            {dateTo}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
                disabled={busy || rowCount === 0}
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
                disabled={busy || rowCount === 0}
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
              Sends PDF and Excel attachments for the current filters ({rowCount}{" "}
              products).
            </p>
            <div className="space-y-2">
              <Label htmlFor="inventory-report-email">Recipient email</Label>
              <Input
                id="inventory-report-email"
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
              disabled={busy || rowCount === 0}
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
