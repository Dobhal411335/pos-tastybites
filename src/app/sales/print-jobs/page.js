"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  UtensilsCrossed,
  Wine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const TYPE_STYLES = {
  RECEIPT: "bg-orange-50 text-orange-700 border-orange-200",
  KOT: "bg-blue-50 text-blue-700 border-blue-200",
  BAR_RECEIPT: "bg-purple-50 text-purple-700 border-purple-200",
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
  const [reprintOnly, setReprintOnly] = useState(false);
  const [serverStats, setServerStats] = useState(null);
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
      if (reprintOnly) params.set("reprint", "true");
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("limit", "25");

      const res = await fetch(`/api/sales/print-jobs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setJobs(json.data || []);
        if (json.stats) {
          setServerStats(json.stats);
        }
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
  }, [statusFilter, typeFilter, targetFilter, reprintOnly, debouncedSearch, page]);

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
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (!cancelled) {
        setLoading(true);
        await fetchJobs();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchJobs]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (!cancelled) {
        await fetchPrinters();
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const handleCancel = (id) =>
    runAction(
      id,
      async () => {
        const res = await fetch(`/api/sales/print-jobs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to cancel job");
        }
      },
      "Print job cancelled"
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

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    targetFilter !== "ALL" ||
    reprintOnly ||
    Boolean(searchQuery.trim());

  const stats = useMemo(() => {
    const s = serverStats;
    const tot = s?.total ?? (pagination.total || jobs.length);
    const receipt = s?.receiptCount ?? jobs.filter((j) => j.printType === "RECEIPT").length;
    const kot = s?.kotCount ?? jobs.filter((j) => j.printType === "KOT").length;
    const bar = s?.barCount ?? jobs.filter((j) => j.printType === "BAR_RECEIPT").length;
    const reprint = s?.reprintCount ?? jobs.filter((j) => Boolean(j.parentPrintJobId || j.metadata?.isReprint || (j.attemptCount || 0) > 1)).length;
    const printed = s?.printedCount ?? jobs.filter((j) => j.status === "PRINTED").length;
    const failed = s?.failedCount ?? jobs.filter((j) => j.status === "FAILED").length;

    const receiptPct = tot > 0 ? Math.round((receipt / tot) * 100) : 0;
    const kotPct = tot > 0 ? Math.round((kot / tot) * 100) : 0;
    const barPct = tot > 0 ? Math.round((bar / tot) * 100) : 0;
    const reprintPct = tot > 0 ? ((reprint / tot) * 100).toFixed(1).replace(/\.0$/, "") : "0";
    const printedPct = tot > 0 ? Math.round((printed / tot) * 100) : 0;
    const failedPct = tot > 0 ? Math.round((failed / tot) * 100) : 0;

    return [
      {
        key: "TOTAL",
        short: "Total Prints",
        label: "Total Prints",
        value: tot.toString(),
        percent: "100%",
        icon: Printer,
        active: statusFilter === "ALL" && typeFilter === "ALL" && !reprintOnly,
        onClick: () => {
          setStatusFilter("ALL");
          setTypeFilter("ALL");
          setTargetFilter("ALL");
          setReprintOnly(false);
          setPage(1);
        },
      },
      {
        key: "RECEIPT",
        short: "Bill Receipt",
        label: "Bill Receipt",
        value: receipt.toString(),
        percent: `${receiptPct}%`,
        icon: Receipt,
        active: typeFilter === "RECEIPT" && !reprintOnly,
        onClick: () => {
          setReprintOnly(false);
          setTypeFilter((prev) => (prev === "RECEIPT" ? "ALL" : "RECEIPT"));
          setPage(1);
        },
      },
      {
        key: "KOT",
        short: "Kitchen (KOT)",
        label: "Kitchen KOT",
        value: kot.toString(),
        percent: `${kotPct}%`,
        icon: UtensilsCrossed,
        active: typeFilter === "KOT" && !reprintOnly,
        onClick: () => {
          setReprintOnly(false);
          setTypeFilter((prev) => (prev === "KOT" ? "ALL" : "KOT"));
          setPage(1);
        },
      },
      {
        key: "BAR_RECEIPT",
        short: "Bar Receipt",
        label: "Bar Receipt",
        value: bar.toString(),
        percent: `${barPct}%`,
        icon: Wine,
        active: typeFilter === "BAR_RECEIPT" && !reprintOnly,
        onClick: () => {
          setReprintOnly(false);
          setTypeFilter((prev) => (prev === "BAR_RECEIPT" ? "ALL" : "BAR_RECEIPT"));
          setPage(1);
        },
      },
      {
        key: "REPRINT",
        short: "Reprints",
        label: "Reprints",
        value: reprint.toString(),
        percent: `${reprintPct}%`,
        icon: RotateCcw,
        active: reprintOnly,
        onClick: () => {
          setTypeFilter("ALL");
          setStatusFilter("ALL");
          setReprintOnly((prev) => !prev);
          setPage(1);
        },
      },
      {
        key: "PRINTED",
        short: "Printed OK",
        label: "Printed",
        value: printed.toString(),
        percent: `${printedPct}%`,
        icon: CheckCircle2,
        active: statusFilter === "PRINTED" && !reprintOnly,
        onClick: () => {
          setReprintOnly(false);
          setStatusFilter((prev) => (prev === "PRINTED" ? "ALL" : "PRINTED"));
          setPage(1);
        },
      },
      {
        key: "FAILED",
        short: "Failed",
        label: "Failed Jobs",
        value: failed.toString(),
        percent: `${failedPct}%`,
        icon: AlertTriangle,
        active: statusFilter === "FAILED" && !reprintOnly,
        onClick: () => {
          setReprintOnly(false);
          setStatusFilter((prev) => (prev === "FAILED" ? "ALL" : "FAILED"));
          setPage(1);
        },
      },
    ];
  }, [serverStats, jobs, pagination.total, statusFilter, typeFilter, reprintOnly]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] bg-zinc-50">
      {/* Header - Unified with Controls & Stats Cards */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 shrink-0 z-10 space-y-3">
        {/* Top Controls Row */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {/* Left: Navigation, Title & Live Total */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/floor")}
              className="text-zinc-600 hover:text-zinc-900 h-8 px-2.5 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Floor
            </Button>
            <div className="h-4 w-px bg-zinc-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-900 flex items-center gap-1.5 whitespace-nowrap">
                <Printer className="w-4.5 h-4.5 text-orange-500" />
                <span>Print Jobs</span>
              </h1>
              {pagination.total > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[11px] font-mono px-1.5 py-0 h-5 bg-zinc-100 text-zinc-600 border border-zinc-200 font-semibold"
                >
                  {pagination.total}
                </Badge>
              )}
            </div>
          </div>

          {/* Right: Search, Filters & Actions all aligned in ONE line */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Order # */}
            <div className="relative w-36 sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search Order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs bg-zinc-50 border-zinc-200 rounded-lg focus-visible:ring-1 focus-visible:ring-orange-500"
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

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setReprintOnly(false);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-32 text-xs bg-white border-zinc-200 font-medium">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="QUEUED" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    Queued
                  </span>
                </SelectItem>
                <SelectItem value="PRINTING" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    Printing
                  </span>
                </SelectItem>
                <SelectItem value="PRINTED" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Printed
                  </span>
                </SelectItem>
                <SelectItem value="FAILED" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    Failed
                  </span>
                </SelectItem>
                <SelectItem value="CANCELLED" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block" />
                    Cancelled
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val);
                setReprintOnly(false);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-30 text-xs bg-white border-zinc-200 font-medium">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Types</SelectItem>
                <SelectItem value="RECEIPT" className="text-xs">Receipt</SelectItem>
                <SelectItem value="KOT" className="text-xs">KOT</SelectItem>
                <SelectItem value="BAR_RECEIPT" className="text-xs">Bar Receipt</SelectItem>
              </SelectContent>
            </Select>

            {/* Target Filter */}
            <Select
              value={targetFilter}
              onValueChange={(val) => {
                setTargetFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-36 text-xs bg-white border-zinc-200 font-medium">
                <SelectValue placeholder="All Targets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Targets</SelectItem>
                <SelectItem value="RECEIPT" className="text-xs">Front / Receipt</SelectItem>
                <SelectItem value="KITCHEN" className="text-xs">Kitchen</SelectItem>
                <SelectItem value="COUNTER" className="text-xs">Counter / Bar</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters if active */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("ALL");
                  setTypeFilter("ALL");
                  setTargetFilter("ALL");
                  setReprintOnly(false);
                  setSearchQuery("");
                  setPage(1);
                }}
                className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchJobs();
              }}
              disabled={loading}
              className="h-8 px-2.5 text-xs text-zinc-700 hover:text-zinc-900 border-zinc-200 font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards Row - mirroring Today Orders KPI layout */}
        <div className="overflow-x-auto scrollbar-none">
          <div className="grid grid-cols-7 gap-2 min-w-205 h-20">
            {stats.map((stat) => (
              <button
                key={stat.key}
                type="button"
                onClick={stat.onClick}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left min-w-0 transition-all ${
                  stat.active
                    ? "border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20 shadow-xs"
                    : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400"
                }`}
                title={`Filter by ${stat.label}`}
              >
                <div className="p-2 bg-orange-500 text-white rounded-lg shrink-0">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-zinc-900 uppercase tracking-wide truncate">
                    {stat.short}
                    {!loading && (
                      <span className="normal-case tracking-normal text-zinc-500 font-semibold ml-1">
                        · {stat.percent}
                      </span>
                    )}
                  </p>
                  <p className="text-lg font-bold text-zinc-900 leading-tight tabular-nums truncate">
                    {loading ? "—" : stat.value}
                  </p>
                </div>
              </button>
            ))}
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
              <Table>
                <TableHeader className="bg-zinc-50 border-b border-zinc-200">
                  <TableRow className="hover:bg-transparent border-b border-zinc-200">
                    <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-45">
                      Order #
                    </TableHead>
                    <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-27.5">
                      Type
                    </TableHead>
                    <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-35">
                      Target / Printer
                    </TableHead>
                    <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-27.5">
                      Created
                    </TableHead>
                    <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-27.5">
                      Status
                    </TableHead>
                    <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-20 text-center">
                      Attempts
                    </TableHead>
                    <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-25">
                      Printed At
                    </TableHead>
                    <TableHead className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-32.5">
                      Employee
                    </TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-600 min-w-47.5 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-zinc-100">
                  {jobs.map((job) => {
                    const busy = busyId === job._id;
                    const orderNum = orderLabel(job);
                    const isReprintChild = Boolean(
                      job.parentPrintJobId ||
                      job.metadata?.isReprint ||
                      (job.attemptCount || 0) > 1
                    );
                    const printerName = printerNameFor(job.printerTarget, job.printerId);

                    const rawTable = job.metadata?.tableNo || job.orderId?.tableNo;
                    const rawParty =
                      job.metadata?.partyName ||
                      job.metadata?.guestName ||
                      job.orderId?.partyName ||
                      job.orderId?.guestName;

                    const guestCount =
                      job.metadata?.guestCount ??
                      job.orderId?.guestCount ??
                      null;

                    const tableLabel = (() => {
                      if (!rawTable) return null;
                      const trimmed = String(rawTable).trim();
                      if (/^tables?\b/i.test(trimmed)) return trimmed;
                      return `Table ${trimmed}`;
                    })();

                    const partyLabel = (() => {
                      if (!rawParty) return null;
                      const p = String(rawParty).trim();
                      if (rawTable) {
                        const t = String(rawTable).trim().toLowerCase();
                        const pLow = p.toLowerCase();
                        if (pLow === t || pLow === `table ${t}` || pLow.startsWith("table")) {
                          return null;
                        }
                      }
                      return p;
                    })();

                    return (
                      <TableRow
                        key={job._id}
                        className="hover:bg-zinc-50/80 transition-colors"
                      >
                        {/* Order # */}
                        <TableCell className="py-3 px-3 align-middle">
                          <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                            <span>#{orderNum}</span>
                            {isReprintChild && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 border-orange-200 text-orange-700 bg-orange-50 font-medium"
                              >
                                Reprint
                              </Badge>
                            )}
                          </div>
                          {(tableLabel || partyLabel || guestCount != null) && (
                            <div className="text-[11px] text-zinc-500 font-normal mt-0.5 leading-snug">
                              {tableLabel && <span>{tableLabel}</span>}
                              {tableLabel && partyLabel && <span> • </span>}
                              {partyLabel && <span>{partyLabel}</span>}
                              {guestCount != null && (
                                <span className="text-zinc-400">
                                  {(tableLabel || partyLabel) ? " · " : ""}{guestCount} {guestCount === 1 ? "guest" : "guests"}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Print Type */}
                        <TableCell className="py-3 px-3 align-middle">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              TYPE_STYLES[job.printType] || "bg-zinc-100 text-zinc-700 border-zinc-200"
                            }`}
                          >
                            {PRINT_TYPE_LABELS[job.printType] || job.printType}
                          </span>
                        </TableCell>

                        {/* Target / Printer */}
                        <TableCell className="py-3 px-3 align-middle">
                          <div className="text-xs">
                            <span className="font-medium text-zinc-800 block">
                              {job.printerTarget === "KITCHEN"
                                ? "Kitchen"
                                : job.printerTarget === "COUNTER"
                                  ? "Counter / Bar"
                                  : "Front / Receipt"}
                            </span>
                            {printerName && (
                              <span className="block text-[11px] text-zinc-400 truncate max-w-40 font-mono">
                                {printerName}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Created */}
                        <TableCell className="py-3 px-3 align-middle text-xs text-zinc-600 whitespace-nowrap font-medium">
                          {moment(job.createdAt).format("MMM D, HH:mm")}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 px-3 align-middle">
                          <Badge
                            className={`${STATUS_STYLES[job.status] || STATUS_STYLES.QUEUED} text-[10px] font-semibold border shadow-none`}
                          >
                            {job.status}
                          </Badge>
                          {job.errorMessage && (
                            <span
                              className="block text-[10px] text-red-600 truncate max-w-32.5 mt-0.5"
                              title={job.errorMessage}
                            >
                              {job.errorMessage}
                            </span>
                          )}
                        </TableCell>

                        {/* Attempts */}
                        <TableCell className="py-3 px-3 align-middle text-center font-mono text-xs text-zinc-600 font-medium">
                          {job.attemptCount || 0}
                        </TableCell>

                        {/* Printed At */}
                        <TableCell className="py-3 px-3 align-middle text-xs text-zinc-600 font-mono whitespace-nowrap">
                          {job.printedAt ? moment(job.printedAt).format("HH:mm:ss") : "—"}
                        </TableCell>

                        {/* Employee */}
                        <TableCell className="py-3 px-3 align-middle text-xs text-zinc-700 font-medium truncate max-w-35">
                          {employeeLabel(job.requestedBy)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 border-zinc-200"
                            >
                              <Link href={`/sales/print-jobs/${job._id}`}>
                                <Eye className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                View
                              </Link>
                            </Button>

                            {job.status === "FAILED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
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

                            {job.status === "QUEUED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs text-zinc-700 border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
                                disabled={busy}
                                onClick={() => handleCancel(job._id)}
                                title="Cancel this queued job so it will not print"
                              >
                                {busy ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                ) : (
                                  <X className="w-3.5 h-3.5 mr-1" />
                                )}
                                Cancel
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold text-orange-700 border-orange-200 bg-orange-50/50 hover:bg-orange-100 hover:text-orange-800"
                              disabled={busy || reprinting}
                              onClick={() => setReprintTarget(job)}
                              title="Print this ticket again as a new print job"
                            >
                              <Printer className="w-3.5 h-3.5 mr-1 text-orange-600" />
                              Print Again
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
