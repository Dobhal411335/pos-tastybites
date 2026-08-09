"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSocket } from "@/components/providers/SocketProvider";
import moment from "moment";

const STATUS_STYLES = {
  QUEUED: "bg-amber-100 text-amber-800",
  PRINTING: "bg-blue-100 text-blue-800",
  PRINTED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-zinc-100 text-zinc-600",
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [busyId, setBusyId] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      const qs = filter !== "ALL" ? `?status=${filter}` : "";
      const res = await fetch(`/api/sales/print-jobs${qs}`);
      const json = await res.json();
      if (json.success) {
        setJobs(json.data || []);
      } else {
        toast.error(json.message || "Failed to load print jobs");
      }
    } catch {
      toast.error("Failed to load print jobs");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!socket) return;

    const onNew = () => fetchJobs();
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

  const handlePrintTest = (id, simulateFailure = false) =>
    runAction(
      id,
      async () => {
        const res = await fetch(`/api/sales/print-jobs/${id}/print-test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ simulateFailure }),
        });
        const json = await res.json();
        if (!json.success && json.data?.result?.success === false) {
          toast.error(json.data?.result?.error || "Simulated failure");
          return;
        }
        if (!json.success) throw new Error(json.message);
        toast.message(
          json.data?.note ||
            "Mock print finished — no physical printer was contacted."
        );
      },
      null
    );

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
        if (!json.success) throw new Error(json.message);
      },
      "Retry started (mock adapter)"
    );

  const handleMarkPrinted = (id) =>
    runAction(
      id,
      async () => {
        const res = await fetch(`/api/sales/print-jobs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_printed" }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
      },
      "Marked printed"
    );

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/sales/floor")}
              className="text-zinc-500"
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
                Queue for receipt &amp; kitchen tickets (mock printer)
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchJobs();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>

        <div className="flex gap-1.5 mt-3 overflow-x-auto">
          {["ALL", "QUEUED", "PRINTING", "PRINTED", "FAILED"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                filter === s
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-sm">
            No print jobs yet. Send an order to kitchen or complete a payment.
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_72px_72px_90px_72px_1fr_auto] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400 border-b bg-zinc-50">
              <span>Order #</span>
              <span>Type</span>
              <span>Target</span>
              <span>Created</span>
              <span>Status</span>
              <span>Employee</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {jobs.map((job) => {
                const busy = busyId === job._id;
                return (
                  <li
                    key={job._id}
                    className="px-3 py-2.5 grid grid-cols-1 md:grid-cols-[1fr_72px_72px_90px_72px_1fr_auto] gap-2 items-center text-sm"
                  >
                    <div className="font-semibold text-zinc-900">
                      #{orderLabel(job)}
                      {job.metadata?.tableNo && (
                        <span className="ml-2 text-xs font-normal text-zinc-500">
                          T{job.metadata.tableNo}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-zinc-700">
                      {job.printType}
                    </div>
                    <div className="text-xs text-zinc-600">
                      {job.printerTarget === "KITCHEN" ? "Kitchen" : "Front"}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {moment(job.createdAt).format("HH:mm")}
                    </div>
                    <div>
                      <Badge
                        className={`${STATUS_STYLES[job.status] || STATUS_STYLES.QUEUED} text-[10px] border-0`}
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-600 truncate">
                      {employeeLabel(job.requestedBy)}
                    </div>
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                      >
                        <Link href={`/sales/print-jobs/${job._id}`}>
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={busy}
                        onClick={() => handlePrintTest(job._id)}
                      >
                        {busy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Printer className="w-3.5 h-3.5 mr-1" />
                            Test
                          </>
                        )}
                      </Button>
                      {(job.status === "FAILED" || job.status === "QUEUED") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          disabled={busy}
                          onClick={() => handleRetry(job._id)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Retry
                        </Button>
                      )}
                      {job.status !== "PRINTED" &&
                        job.status !== "CANCELLED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-emerald-700"
                            disabled={busy}
                            onClick={() => handleMarkPrinted(job._id)}
                          >
                            Mark
                          </Button>
                        )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
