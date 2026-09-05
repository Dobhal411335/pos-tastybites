"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useSocket } from "@/components/providers/SocketProvider";
import moment from "moment";
import { joinTableNumbers } from "@/utils/orderDisplay";

const STATUS_STYLES = {
  QUEUED: "bg-amber-100 text-amber-800 border-amber-200",
  PRINTING: "bg-blue-100 text-blue-800 border-blue-200",
  PRINTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const PRINT_TYPE_LABELS = {
  RECEIPT: "Receipt",
  KOT: "KOT",
  BAR_RECEIPT: "Bar Receipt",
};

function employeeLabel(emp) {
  if (!emp) return "—";
  return (
    emp.name ||
    [emp.firstName, emp.lastName].filter(Boolean).join(" ") ||
    "—"
  );
}

function orderLabel(job) {
  return (
    job.metadata?.orderNumber ||
    job.orderId?.orderNumber ||
    "—"
  );
}

export default function PrintJobsPage() {
  const router = useRouter();
  const { socket } = useSocket();

  const [jobs, setJobs] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [targetFilter, setTargetFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  // Action states
  const [busyId, setBusyId] = useState(null);
  const [reprintTarget, setReprintTarget] = useState(null);
  const [reprinting, setReprinting] = useState(false);
  const activeReprintRef = useRef(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("printType", typeFilter);
      if (targetFilter !== "ALL") params.set("printerTarget", targetFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("limit", "25");

      const res = await fetch(`/api/sales/print-jobs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setJobs(json.data || []);
        if (json.pagination) {
          setPagination(json.pagination);
        }
      } else {
        toast.error(json.message || "Failed to load print jobs");
      }
    } catch {
      toast.error("Failed to load print jobs");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, targetFilter, debouncedSearch, page]);

  const fetchPrinters = useCallback(async () => {
    try {
      const res = await fetch("/api/sales/printers");
      const json = await res.json();
      if (json.success) setPrinters(json.data || []);
    } catch {
      // Optional enrichment
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchPrinters();
  }, [fetchPrinters]);

  const printerNameFor = (target, printerId) => {
    if (printerId) {
      const matchById = printers.find((p) => String(p._id) === String(printerId));
      if (matchById?.name) return matchById.name;
    }
    const match = printers.find((p) => p.target === target && p.enabled !== false);
    return match?.name || null;
  };

  // Socket updates
  useEffect(() => {
    if (!socket) return;

    const onNew = () => {
      // Always refresh on new print jobs so user sees incoming tickets
      fetchJobs();
    };

    const onUpdated = (payload) => {
      setJobs((prev) => {
        const id = payload?.printJobId;
        if (!id) return prev;
        const idx = prev.findIndex((j) => String(j._id) === String(id));
        if (idx === -1) {
          fetchJobs();
          return prev;
        }
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          status: payload.status,
          attemptCount: payload.attemptCount,
          errorMessage: payload.errorMessage,
        };
        return next;
      });
    };

    socket.on("NEW_PRINT_JOB", onNew);
    socket.on("PRINT_JOB_UPDATED", onUpdated);
    return () => {
      socket.off("NEW_PRINT_JOB", onNew);
      socket.off("PRINT_JOB_UPDATED", onUpdated);
    };
  }, [socket, fetchJobs]);

  const runAction = async (id, fn, successMsg) => {
    setBusyId(id);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      await fetchJobs();
    } catch (err) {
      toast.error(err.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleRetry = (id) =>
    runAction(
      id,
      async () => {
        const res = await fetch(`/api/sales/print-jobs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "retry" }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to requeue job");
        }
      },
      "Print job requeued"
    );

  const handleConfirmPrintAgain = async () => {
    if (!reprintTarget || reprinting || activeReprintRef.current) return;
    activeReprintRef.current = true;
    setReprinting(true);

    const idempotencyKey = `reprint:${reprintTarget._id}:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await fetch(`/api/sales/print-jobs/${reprintTarget._id}/reprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to reprint");
      }
      toast.success("Print job queued.");
      setReprintTarget(null);
      await fetchJobs();
    } catch (err) {
      toast.error(err.message || "Failed to print again");
    } finally {
      setReprinting(false);
      activeReprintRef.current = false;
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/floor")}
              className="text-zinc-500 hover:text-zinc-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Floor
            </Button>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-orange-500" />
                Print Jobs
              </h1>
              <p className="text-xs text-zinc-500">
                Live print queue for receipts, kitchen orders &amp; bar tickets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchJobs();
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-col sm:flex-row gap-2.5 mt-3 items-stretch sm:items-center justify-between">
          {/* Status chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {["ALL", "QUEUED", "PRINTING", "PRINTED", "FAILED", "CANCELLED"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? "bg-orange-500 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search Order # */}
          <div className="relative min-w-50 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search Order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-zinc-50 border-zinc-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary filters */}
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-7 px-2 text-xs rounded border border-zinc-200 bg-white text-zinc-800"
            >
              <option value="ALL">All Types</option>
              <option value="RECEIPT">Receipt</option>
              <option value="KOT">KOT</option>
              <option value="BAR_RECEIPT">Bar Receipt</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Target:</span>
            <select
              value={targetFilter}
              onChange={(e) => {
                setTargetFilter(e.target.value);
                setPage(1);
              }}
              className="h-7 px-2 text-xs rounded border border-zinc-200 bg-white text-zinc-800"
            >
              <option value="ALL">All Targets</option>
              <option value="RECEIPT">Front / Receipt</option>
              <option value="KITCHEN">Kitchen</option>
              <option value="COUNTER">Counter / Bar</option>
            </select>
          </div>

          <div className="ml-auto text-zinc-400 font-mono text-[11px]">
            {pagination.total > 0 && (
              <span>
                {pagination.total} job{pagination.total === 1 ? "" : "s"} found
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Table / List */}
      <div className="flex-1 overflow-auto p-3 flex flex-col justify-between">
        <div>
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm">
              No print jobs match your filter.
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
              {/* Desktop table header */}
              <div className="hidden lg:grid grid-cols-[1.2fr_0.9fr_1.1fr_0.8fr_0.9fr_0.6fr_0.8fr_1fr_auto] gap-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500 border-b bg-zinc-50">
                <span>Order #</span>
                <span>Type</span>
                <span>Target / Printer</span>
                <span>Created</span>
                <span>Status</span>
                <span>Attempts</span>
                <span>Printed At</span>
                <span>Employee</span>
                <span className="text-right pr-2">Actions</span>
              </div>

              {/* Rows */}
              <ul className="divide-y divide-zinc-100">
                {jobs.map((job) => {
                  const busy = busyId === job._id;
                  const orderNum = orderLabel(job);
                  const isReprintChild = Boolean(job.parentPrintJobId);
                  const printerName = printerNameFor(job.printerTarget, job.printerId);

                  return (
                    <li
                      key={job._id}
                      className="px-3 py-2.5 grid grid-cols-1 lg:grid-cols-[1.2fr_0.9fr_1.1fr_0.8fr_0.9fr_0.6fr_0.8fr_1fr_auto] gap-2 items-center text-sm hover:bg-zinc-50/70 transition-colors"
                    >
                      {/* Order info */}
                      <div>
                        <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                          <span>#{orderNum}</span>
                          {isReprintChild && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4 border-orange-200 text-orange-700 bg-orange-50"
                            >
                              Reprint
                            </Badge>
                          )}
                        </div>
                        {job.metadata?.tableNo && (
                          <div className="text-xs text-zinc-500 font-normal">
                            Table {joinTableNumbers([job.metadata.tableNo])}
                            {job.metadata?.partyName ? ` • ${job.metadata.partyName}` : ""}
                          </div>
                        )}
                      </div>

                      {/* Print Type */}
                      <div className="text-xs font-medium text-zinc-800">
                        {PRINT_TYPE_LABELS[job.printType] || job.printType}
                      </div>

                      {/* Target / Printer */}
                      <div className="text-xs text-zinc-600">
                        <span className="font-medium text-zinc-800">
                          {job.printerTarget === "KITCHEN"
                            ? "Kitchen"
                            : job.printerTarget === "COUNTER"
                              ? "Counter / Bar"
                              : "Front / Receipt"}
                        </span>
                        {printerName && (
                          <span className="block text-[11px] text-zinc-400 truncate">
                            {printerName}
                          </span>
                        )}
                      </div>

                      {/* Created */}
                      <div className="text-xs text-zinc-500">
                        {moment(job.createdAt).format("MMM D, HH:mm")}
                      </div>

                      {/* Status */}
                      <div>
                        <Badge
                          className={`${STATUS_STYLES[job.status] || STATUS_STYLES.QUEUED} text-[10px] font-semibold border`}
                        >
                          {job.status}
                        </Badge>
                        {job.errorMessage && (
                          <span
                            className="block text-[10px] text-red-600 truncate max-w-35"
                            title={job.errorMessage}
                          >
                            {job.errorMessage}
                          </span>
                        )}
                      </div>

                      {/* Attempts */}
                      <div className="text-xs font-mono text-zinc-600">
                        {job.attemptCount || 0}
                      </div>

                      {/* Printed At */}
                      <div className="text-xs text-zinc-500">
                        {job.printedAt ? moment(job.printedAt).format("HH:mm:ss") : "—"}
                      </div>

                      {/* Employee */}
                      <div className="text-xs text-zinc-600 truncate">
                        {employeeLabel(job.requestedBy)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* View Button */}
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-medium"
                        >
                          <Link href={`/sales/print-jobs/${job._id}`}>
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Link>
                        </Button>

                        {/* Retry Button - strictly for FAILED jobs */}
                        {job.status === "FAILED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-red-700 border-red-200 hover:bg-red-50"
                            disabled={busy}
                            onClick={() => handleRetry(job._id)}
                            title="Requeue this failed job"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            )}
                            Retry
                          </Button>
                        )}

                        {/* Print Again Button - creates a NEW PrintJob */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-medium text-orange-700 border-orange-200 hover:bg-orange-50 hover:text-orange-800"
                          disabled={busy || reprinting}
                          onClick={() => setReprintTarget(job)}
                          title="Print this ticket again as a new print job"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1 text-orange-600" />
                          Print Again
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Server Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="bg-white border border-zinc-200 rounded-lg p-2.5 mt-3 flex items-center justify-between text-xs text-zinc-600">
            <div>
              Page <span className="font-semibold text-zinc-900">{pagination.page}</span> of{" "}
              <span className="font-semibold text-zinc-900">{pagination.totalPages}</span>
              {" "}({pagination.total} total)
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Print Again Confirmation Dialog */}
      <AlertDialog
        open={Boolean(reprintTarget)}
        onOpenChange={(open) => !open && !reprinting && setReprintTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-zinc-900">
              <Printer className="w-5 h-5 text-orange-500" />
              Print this ticket again?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-zinc-600 text-sm space-y-2 pt-2">
                <p>
                  A new print job will be queued for this order. The original print job record will remain unchanged for audit and history.
                </p>
                {reprintTarget && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs space-y-1.5 text-zinc-700 mt-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Order:</span>
                      <span className="font-semibold text-zinc-900">#{orderLabel(reprintTarget)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Type:</span>
                      <span className="font-semibold text-zinc-900">
                        {PRINT_TYPE_LABELS[reprintTarget.printType] || reprintTarget.printType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Target:</span>
                      <span className="font-semibold text-zinc-900">{reprintTarget.printerTarget}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Original Job ID:</span>
                      <span className="font-mono text-zinc-500 text-[11px]">{String(reprintTarget._id)}</span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reprinting}>Cancel</AlertDialogCancel>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={reprinting}
              onClick={handleConfirmPrintAgain}
            >
              {reprinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Queueing...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Confirm &amp; Print Again
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
