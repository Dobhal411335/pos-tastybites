"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EodReportPreview from "@/components/eod/EodReportPreview";
import EodEmailDialog from "@/components/eod/EodEmailDialog";

const money = (n) =>
  `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Shared End-of-Day report UI for Sales and Admin.
 * @param {{ fetchFn?: typeof fetch, showHistory?: boolean, title?: string }} props
 */
export default function EodReportPage({
  fetchFn = fetch,
  showHistory = true,
  title = "End-of-Day Report",
}) {
  const [businessDate, setBusinessDate] = useState(todayLocalISO());
  const [report, setReport] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [defaultEmail, setDefaultEmail] = useState("");
  const [actualDeposit, setActualDeposit] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [preferLive, setPreferLive] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const loadReport = useCallback(async () => {
    if (!businessDate) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        date: businessDate,
        preferSaved: preferLive ? "0" : "1",
      });
      const res = await fetchFn(`/api/eod?${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load report");
      }
      setReport(data.data.report);
      setSaved(Boolean(data.data.saved));
      const email = data.data.report?.meta?.restaurantEmail || "";
      if (email) setDefaultEmail(email);
      const dep = data.data.report?.cashDeposit?.actualDeposit;
      setActualDeposit(dep != null && dep !== "" ? String(dep) : "");
    } catch (err) {
      toast.error(err.message || "Failed to load End-of-Day report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [businessDate, fetchFn, preferLive]);

  const loadHistory = useCallback(async () => {
    if (!showHistory) return;
    setHistoryLoading(true);
    try {
      const res = await fetchFn("/api/eod/history", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setHistory(data.data.history || []);
      }
    } catch {
      /* ignore */
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchFn, showHistory]);

  useEffect(() => {
    loadReport();
  }, [loadReport, reloadToken]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDownload = async (kind) => {
    setDownloading(kind);
    try {
      const qs = new URLSearchParams({
        date: businessDate,
        preferSaved: preferLive ? "0" : "1",
      });
      const res = await fetchFn(`/api/eod/${kind}?${qs}`, {
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
      a.download = `End-of-Day-${businessDate}.${kind === "excel" ? "xlsx" : "pdf"}`;
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchFn("/api/eod/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: businessDate,
          actualDeposit:
            actualDeposit === "" ? null : Number(actualDeposit),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save report");
      }
      setReport(data.data.report);
      setSaved(true);
      setPreferLive(false);
      if (!data.data.reconciliation?.ok) {
        toast.warning(
          "Report saved — totals require attention before relying on them."
        );
      } else {
        toast.success("End-of-Day report saved");
      }
      loadHistory();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const summary = report?.summary || {};
  const recon = report?.reconciliation;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            View, export, or email the End-of-Day report for any business day.
            Independent of Close Restaurant.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saved ? (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              Saved snapshot
            </Badge>
          ) : (
            <Badge variant="outline">Live data</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end flex-wrap">
            <div className="space-y-1.5">
              <Label htmlFor="eod-date">Business Day</Label>
              <Input
                id="eod-date"
                type="date"
                value={businessDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setBusinessDate(next);
                  setPreferLive(next === todayLocalISO());
                }}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eod-deposit">Actual Deposit (optional)</Label>
              <Input
                id="eod-deposit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={actualDeposit}
                onChange={(e) => setActualDeposit(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreferLive(true);
                  setReloadToken((t) => t + 1);
                }}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Refresh live
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || loading}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Save Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("excel")}
                disabled={!!downloading || loading || !report}
              >
                {downloading === "excel" ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                )}
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("pdf")}
                disabled={!!downloading || loading || !report}
              >
                {downloading === "pdf" ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1.5" />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmailOpen(true)}
                disabled={loading || !report}
              >
                <Mail className="h-4 w-4 mr-1.5" />
                Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {recon && !recon.ok && (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              Report totals require attention before relying on them.
            </p>
            {(recon.messages || []).map((m, i) => (
              <p key={i} className="mt-1 text-amber-800">
                {m}
              </p>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {[
              ["Net Sales", money(summary.netSales)],
              ["Orders", summary.orders ?? 0],
              ["Taxes", money(summary.taxes)],
              ["Tips", money(summary.tips)],
              ["Cash", money(summary.cash)],
              ["Card", money(summary.card)],
              ["Gift Card", money(summary.giftCard)],
              ["Refunds", money(summary.refunds)],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardHeader className="py-3 px-4 pb-1">
                  <CardTitle className="text-xs font-medium text-stone-500">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="text-lg font-semibold tabular-nums text-stone-900">
                    {value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {report.meta?.title || "Full Report"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EodReportPreview report={report} />
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-stone-500 text-sm">No report data for this date.</p>
      )}

      {showHistory && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Saved Reports</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadHistory}
              disabled={historyLoading}
            >
              {historyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-stone-500">No saved reports yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Day</TableHead>
                      <TableHead>Net Sales</TableHead>
                      <TableHead>Payments</TableHead>
                      <TableHead>Saved By</TableHead>
                      <TableHead>Saved At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.businessDate}
                        </TableCell>
                        <TableCell>
                          {row.netSales != null ? money(row.netSales) : "—"}
                        </TableCell>
                        <TableCell>
                          {row.totalPayment != null
                            ? money(row.totalPayment)
                            : "—"}
                        </TableCell>
                        <TableCell>{row.generatedByName || "—"}</TableCell>
                        <TableCell>
                          {row.generatedAt
                            ? new Date(row.generatedAt).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPreferLive(false);
                              setBusinessDate(row.businessDate);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBusinessDate(row.businessDate);
                              setPreferLive(false);
                              setTimeout(() => handleDownload("excel"), 100);
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <EodEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        businessDate={businessDate}
        defaultEmail={defaultEmail}
        fetchFn={fetchFn}
      />
    </div>
  );
}
