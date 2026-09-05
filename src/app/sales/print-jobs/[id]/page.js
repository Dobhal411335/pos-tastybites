"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  Printer,
  RotateCcw,
  Server,
  Usb,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import CustomerReceipt from "@/components/receipts/CustomerReceipt";
import KitchenOrderTicket from "@/components/receipts/KitchenOrderTicket";
import BarReceipt from "@/components/receipts/BarReceipt";
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
  RECEIPT: "Customer Receipt",
  KOT: "Kitchen Order Ticket (KOT)",
  BAR_RECEIPT: "Bar / Counter Receipt",
};

function printerTargetLabel(target) {
  if (target === "KITCHEN") return "Kitchen";
  if (target === "COUNTER") return "Counter / Bar";
  return "Front / Receipt";
}

function employeeLabel(emp) {
  if (!emp) return "—";
  return (
    emp.name ||
    [emp.firstName, emp.lastName].filter(Boolean).join(" ") ||
    "—"
  );
}

export default function PrintJobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { socket } = useSocket();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Print Again confirmation modal
  const [showReprintConfirm, setShowReprintConfirm] = useState(false);
  const [reprinting, setReprinting] = useState(false);
  const activeReprintRef = useRef(false);

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

  // Socket updates
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

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Requeue FAILED print job
  const handleRetry = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/sales/print-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Retry failed");
      }
      toast.success("Print job requeued.");
      await fetchJob();
    } catch (err) {
      toast.error(err.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  // Print Again (creates a new PrintJob)
  const handleConfirmPrintAgain = async () => {
    if (!data?.job || reprinting || activeReprintRef.current) return;
    activeReprintRef.current = true;
    setReprinting(true);

    const idempotencyKey = `reprint:${data.job._id}:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await fetch(`/api/sales/print-jobs/${id}/reprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to print again");
      }
      toast.success("Print job queued.");
      setShowReprintConfirm(false);

      const newJobId = json.data?.job?._id;
      if (newJobId) {
        router.push(`/sales/print-jobs/${newJobId}`);
      } else {
        await fetchJob();
      }
    } catch (err) {
      toast.error(err.message || "Failed to print again");
    } finally {
      setReprinting(false);
      activeReprintRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data?.job) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <p className="text-sm">Print job not found.</p>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/sales/print-jobs")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Print Jobs
          </Button>
        </div>
      </div>
    );
  }

  const { job, order, restaurant, guestCount, serverName, kotItems } = data;
  const isKot = job.printType === "KOT";
  const isBar = job.printType === "BAR_RECEIPT";
  const ticketItems =
    kotItems?.length
      ? kotItems
      : job.metadata?.barItems || job.metadata?.kotItems || [];

  const isReprint = Boolean(job.parentPrintJobId || (job.attemptCount || 0) > 1 || job.metadata?.isReprint);
  const orderNumber = job.metadata?.orderNumber || order?.orderNumber || "—";
  const printer = job.printerId;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-zinc-50 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-zinc-900 -ml-2"
              onClick={() => router.push("/sales/print-jobs")}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Print Jobs
            </Button>
            <div className="h-4 w-px bg-zinc-300" />
            <span className="text-xs text-zinc-500">
              Job <span className="font-mono text-zinc-800">#{String(job._id).slice(-6)}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className={`${STATUS_STYLES[job.status] || STATUS_STYLES.QUEUED} text-xs font-semibold border`}
            >
              {job.status}
            </Badge>

            {isReprint && (
              <Badge
                variant="outline"
                className="text-xs border-orange-200 text-orange-700 bg-orange-50 font-medium"
              >
                Reprint
              </Badge>
            )}
          </div>
        </div>

        {/* Reprint Parent Notice */}
        {job.parentPrintJobId && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-600 shrink-0" />
              <span>
                This print job is a reprint of original job{" "}
                <span className="font-mono font-semibold">
                  #{typeof job.parentPrintJobId === "object" ? String(job.parentPrintJobId._id).slice(-6) : String(job.parentPrintJobId).slice(-6)}
                </span>
                .
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs bg-white text-orange-700 border-orange-300">
              <Link href={`/sales/print-jobs/${typeof job.parentPrintJobId === "object" ? job.parentPrintJobId._id : job.parentPrintJobId}`}>
                View Original
                <ExternalLink className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Details & Actions & Order Summary */}
          <div className="lg:col-span-6 space-y-4">
            {/* Job Information Card */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h2 className="font-semibold text-zinc-900 text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4 text-orange-500" />
                  Print Job Information
                </h2>
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(job._id), "Job ID")}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1 font-mono"
                  title="Copy full Job ID"
                >
                  <Copy className="w-3 h-3" />
                  {String(job._id).slice(-8)}
                </button>
              </div>

              <dl className="text-xs space-y-2.5 text-zinc-600">
                <div className="flex justify-between items-center">
                  <dt className="text-zinc-500">Order Number</dt>
                  <dd className="font-semibold text-zinc-900">#{orderNumber}</dd>
                </div>

                <div className="flex justify-between items-center">
                  <dt className="text-zinc-500">Print Type</dt>
                  <dd className="font-medium text-zinc-800">
                    {PRINT_TYPE_LABELS[job.printType] || job.printType}
                  </dd>
                </div>

                <div className="flex justify-between items-center">
                  <dt className="text-zinc-500">Target Station</dt>
                  <dd className="font-medium text-zinc-800">
                    {printerTargetLabel(job.printerTarget)}
                  </dd>
                </div>

                <div className="flex justify-between items-center">
                  <dt className="text-zinc-500">Configured Printer</dt>
                  <dd className="font-medium text-zinc-900 text-right">
                    {printer?.name ? (
                      <div>
                        <span>{printer.name}</span>
                        {printer.location && (
                          <span className="text-[11px] text-zinc-400 block font-normal">
                            ({printer.location})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-400">Target Default</span>
                    )}
                  </dd>
                </div>

                {printer?.connectionType && (
                  <div className="flex justify-between items-center">
                    <dt className="text-zinc-500 flex items-center gap-1">
                      {printer.connectionType === "USB" ? (
                        <Usb className="w-3.5 h-3.5 text-zinc-400" />
                      ) : (
                        <Wifi className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                      Connection
                    </dt>
                    <dd className="font-mono text-[11px] text-zinc-700">
                      {printer.connectionType}
                      {printer.systemPrinterName && ` (${printer.systemPrinterName})`}
                      {printer.host && ` (${printer.host}:${printer.port || 9100})`}
                    </dd>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <dt className="text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Created At
                  </dt>
                  <dd className="text-zinc-700">
                    {moment(job.createdAt).format("MMM D, YYYY [at] HH:mm:ss")}
                  </dd>
                </div>

                {job.startedAt && (
                  <div className="flex justify-between items-center">
                    <dt className="text-zinc-500">Started At</dt>
                    <dd className="text-zinc-700">
                      {moment(job.startedAt).format("HH:mm:ss")}
                    </dd>
                  </div>
                )}

                {job.printedAt && (
                  <div className="flex justify-between items-center">
                    <dt className="text-zinc-500">Printed At</dt>
                    <dd className="font-medium text-emerald-700">
                      {moment(job.printedAt).format("MMM D, HH:mm:ss")}
                    </dd>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <dt className="text-zinc-500">Print Attempts</dt>
                  <dd className="font-mono font-medium text-zinc-900">
                    {job.attemptCount || 0}
                  </dd>
                </div>

                <div className="flex justify-between items-center">
                  <dt className="text-zinc-500">Requested By</dt>
                  <dd className="text-zinc-800">
                    {employeeLabel(job.requestedBy) || serverName || "—"}
                  </dd>
                </div>

                {job.metadata?.tableNo && (
                  <div className="flex justify-between items-center">
                    <dt className="text-zinc-500">Table</dt>
                    <dd className="text-zinc-800">
                      Table {joinTableNumbers([job.metadata.tableNo])}
                      {job.metadata?.floorName && ` (${job.metadata.floorName})`}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Error Callout if Failed */}
              {job.errorMessage && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Print Error:</span>
                    <span>{job.errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium"
                  disabled={busy || reprinting}
                  onClick={() => setShowReprintConfirm(true)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Again
                </Button>

                {job.status === "FAILED" && (
                  <Button
                    variant="outline"
                    className="text-red-700 border-red-200 hover:bg-red-50"
                    disabled={busy || reprinting}
                    onClick={handleRetry}
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Retry
                  </Button>
                )}
              </div>
            </div>

            {/* Related Order Summary Card */}
            {order && (
              <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                  <h3 className="font-semibold text-zinc-900 text-sm">
                    Order Summary (#{order.orderNumber})
                  </h3>
                  <Badge variant="outline" className="text-[10px] text-zinc-600">
                    {order.paymentStatus || order.status || "Completed"}
                  </Badge>
                </div>

                {/* Items summary */}
                <div className="space-y-2 text-xs">
                  {order.items && order.items.length > 0 ? (
                    <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto pr-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-1.5 flex justify-between items-start gap-2">
                          <div>
                            <span className="font-medium text-zinc-800">
                              {item.qty}x {item.name}
                            </span>
                            {item.size && item.size !== "Standard" && (
                              <span className="text-zinc-500 ml-1">({item.size})</span>
                            )}
                            {item.preparationStyle && (
                              <span className="text-zinc-500 block text-[11px]">
                                Style: {item.preparationStyle}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-zinc-700">
                            ${((item.price || 0) * (item.qty || 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : ticketItems.length > 0 ? (
                    <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto pr-1">
                      {ticketItems.map((item, idx) => (
                        <div key={idx} className="py-1.5 flex justify-between items-start gap-2">
                          <span className="font-medium text-zinc-800">
                            {item.qty || 1}x {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-zinc-400 italic">No item list stored.</div>
                  )}
                </div>

                {/* Financial breakdown */}
                {order.totalAmount != null && (
                  <div className="border-t border-zinc-100 pt-2 text-xs space-y-1 text-zinc-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${(order.subTotal || 0).toFixed(2)}</span>
                    </div>
                    {order.discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount {order.discountCode ? `(${order.discountCode})` : ""}</span>
                        <span>-${order.discountTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {order.taxTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Tax / HST</span>
                        <span>${order.taxTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {order.tipAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Tip</span>
                        <span>${order.tipAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-zinc-900 border-t border-zinc-200 pt-1 text-sm">
                      <span>Total</span>
                      <span>${(order.totalAmount || 0).toFixed(2)}</span>
                    </div>
                    {order.paymentMethod && (
                      <div className="flex justify-between text-[11px] text-zinc-500 pt-0.5">
                        <span>Payment Method</span>
                        <span>{order.paymentMethod}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Print Preview */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-md space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-zinc-400" />
                  Print Preview
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  80mm Thermal
                </span>
              </div>

              {/* Thermal Receipt Sheet */}
              <div className="bg-white border border-zinc-300 rounded-sm shadow-md overflow-hidden p-1 flex justify-center">
                <div style={{ width: "80mm" }} className="bg-white">
                  {isKot ? (
                    <KitchenOrderTicket
                      order={order || { orderNumber: job.metadata?.orderNumber }}
                      kotItems={ticketItems}
                      restaurantName={
                        job.metadata?.restaurantName || restaurant?.name
                      }
                      serverName={serverName || job.metadata?.serverName}
                      guestCount={guestCount ?? job.metadata?.guestCount}
                      specialNote={job.metadata?.specialNote}
                      isReprint={isReprint}
                    />
                  ) : isBar ? (
                    <BarReceipt
                      order={
                        order || {
                          orderNumber: job.metadata?.orderNumber,
                          tableNo: job.metadata?.tableNo,
                          guestName: job.metadata?.guestName,
                          partyName: job.metadata?.partyName,
                        }
                      }
                      barItems={ticketItems}
                      restaurantName={
                        job.metadata?.restaurantName || restaurant?.name
                      }
                      serverName={serverName || job.metadata?.serverName}
                      guestCount={guestCount ?? job.metadata?.guestCount}
                      specialNote={job.metadata?.specialNote}
                      isReprint={isReprint}
                    />
                  ) : (
                    <CustomerReceipt
                      order={order}
                      restaurantDetails={restaurant}
                      serverName={serverName || job.metadata?.serverName}
                      guestCount={guestCount ?? job.metadata?.guestCount}
                      isReprint={isReprint}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Again Confirmation Dialog */}
      <AlertDialog
        open={showReprintConfirm}
        onOpenChange={(open) => !open && !reprinting && setShowReprintConfirm(false)}
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
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs space-y-1.5 text-zinc-700 mt-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Order:</span>
                    <span className="font-semibold text-zinc-900">#{orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Type:</span>
                    <span className="font-semibold text-zinc-900">
                      {PRINT_TYPE_LABELS[job.printType] || job.printType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Target Station:</span>
                    <span className="font-semibold text-zinc-900">
                      {printerTargetLabel(job.printerTarget)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Original Job ID:</span>
                    <span className="font-mono text-zinc-500 text-[11px]">{String(job._id)}</span>
                  </div>
                </div>
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
