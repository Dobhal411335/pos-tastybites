"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Printer,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSocket } from "@/components/providers/SocketProvider";
import CustomerReceipt from "@/components/receipts/CustomerReceipt";
import KitchenOrderTicket from "@/components/receipts/KitchenOrderTicket";
import moment from "moment";

const STATUS_STYLES = {
  QUEUED: "bg-amber-100 text-amber-800",
  PRINTING: "bg-blue-100 text-blue-800",
  PRINTED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-zinc-100 text-zinc-600",
};

export default function PrintJobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales/print-jobs/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || "Failed to load print job");
      }
    } catch {
      toast.error("Failed to load print job");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    if (!socket) return;
    const onUpdated = (payload) => {
      if (String(payload?.printJobId) === String(id)) {
        fetchJob();
      }
    };
    socket.on("PRINT_JOB_UPDATED", onUpdated);
    return () => socket.off("PRINT_JOB_UPDATED", onUpdated);
  }, [socket, id, fetchJob]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      await fetchJob();
    } catch (err) {
      toast.error(err.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const handlePrintTest = (simulateFailure = false) =>
    run(async () => {
      const res = await fetch(`/api/sales/print-jobs/${id}/print-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulateFailure }),
      });
      const json = await res.json();
      if (json.data?.result?.success === false) {
        toast.error(json.data.result.error || "Simulated failure");
        return;
      }
      if (!json.success) throw new Error(json.message);
      toast.message(
        json.data?.note ||
          "Mock print finished — no physical printer was contacted."
      );
    });

  const handleMarkPrinted = () =>
    run(async () => {
      const res = await fetch(`/api/sales/print-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_printed" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    }, "Marked as printed");

  const handleRetry = () =>
    run(async () => {
      const res = await fetch(`/api/sales/print-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    }, "Retry completed (mock)");

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data?.job) {
    return (
      <div className="p-6 text-center text-zinc-500">
        Print job not found.
        <div className="mt-3">
          <Button variant="outline" onClick={() => router.push("/sales/print-jobs")}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const { job, order, restaurant, guestCount, serverName, kotItems } = data;
  const isKot = job.printType === "KOT";

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 max-w-5xl mx-auto">
      <div className="lg:w-[280px] shrink-0 space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-500 -ml-2"
          onClick={() => router.push("/sales/print-jobs")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Print Jobs
        </Button>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-zinc-900">Print Job</h1>
            <Badge
              className={`${STATUS_STYLES[job.status] || ""} border-0 text-[10px]`}
            >
              {job.status}
            </Badge>
          </div>

          <dl className="text-xs space-y-2 text-zinc-600">
            <div className="flex justify-between gap-2">
              <dt>Type</dt>
              <dd className="font-semibold text-zinc-900">{job.printType}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Target</dt>
              <dd className="font-semibold text-zinc-900">
                {job.printerTarget === "KITCHEN" ? "Kitchen" : "Receipt Front"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Order #</dt>
              <dd className="font-semibold text-zinc-900">
                {job.metadata?.orderNumber || order?.orderNumber || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Created</dt>
              <dd>{moment(job.createdAt).format("MMM D, HH:mm:ss")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Attempts</dt>
              <dd className="font-semibold">{job.attemptCount || 0}</dd>
            </div>
            {job.errorMessage && (
              <div className="flex gap-1.5 text-red-600 bg-red-50 rounded-lg p-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{job.errorMessage}</span>
              </div>
            )}
          </dl>

          <p className="text-[10px] text-zinc-400 leading-snug">
            Print Test uses MockPrinterAdapter. No physical Star printer is
            contacted.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={busy}
              onClick={() => handlePrintTest(false)}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              Print Test
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={handleMarkPrinted}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark Printed
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={handleRetry}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button
              variant="ghost"
              className="text-red-600"
              disabled={busy}
              onClick={() => handlePrintTest(true)}
            >
              Simulate Failure
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex justify-center">
        <div
          className="bg-white shadow-md border border-zinc-200 rounded-sm overflow-hidden"
          style={{ width: "80mm" }}
        >
          {isKot ? (
            <KitchenOrderTicket
              order={order || { orderNumber: job.metadata?.orderNumber }}
              kotItems={kotItems.length ? kotItems : job.metadata?.kotItems || []}
              restaurantName={
                job.metadata?.restaurantName || restaurant?.name
              }
              serverName={serverName || job.metadata?.serverName}
              guestCount={guestCount ?? job.metadata?.guestCount}
              specialNote={job.metadata?.specialNote}
            />
          ) : (
            <CustomerReceipt
              order={order}
              restaurantDetails={restaurant}
              serverName={serverName || job.metadata?.serverName}
              guestCount={guestCount ?? job.metadata?.guestCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}
