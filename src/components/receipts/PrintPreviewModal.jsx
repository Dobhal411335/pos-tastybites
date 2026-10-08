"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import CustomerReceipt from "./CustomerReceipt";
import KitchenOrderTicket from "./KitchenOrderTicket";
import BarReceipt from "./BarReceipt";

const PREVIEW_TITLES = {
  customer: "Customer Receipt Preview",
  kot: "Kitchen Order Ticket (KOT)",
  bar: "Bar Receipt",
};

const PrintPreviewModal = ({
  isOpen,
  onClose,
  printType, // 'customer' | 'kot' | 'bar'
  order,
  kotItems = [],
  taxBreakdown = [],
  restaurantDetails = null,
  restaurantName = null,
  serverName,
  guestCount,
  specialNote,
  jobMetadata = null,
  /** Optional slips: [{ id, label, order?, jobMetadata?, jobId?, kotItems? }] */
  slips = null,
}) => {
  const [reprinting, setReprinting] = useState(false);
  const [isReprint, setIsReprint] = useState(Boolean(order?.isReprint));
  const [activeSlip, setActiveSlip] = useState(0);

  const slipList = useMemo(() => {
    if (Array.isArray(slips) && slips.length > 0) return slips;
    return null;
  }, [slips]);

  useEffect(() => {
    setIsReprint(Boolean(order?.isReprint));
  }, [order?._id, order?.isReprint, printType]);

  useEffect(() => {
    if (isOpen) setActiveSlip(0);
  }, [isOpen, order?._id, slipList?.length, printType]);

  // Lock body scroll while open (same idea as Dialog, without Radix dismiss races)
  useEffect(() => {
    if (!isOpen || !order) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const currentSlip =
    slipList && slipList[activeSlip] ? slipList[activeSlip] : null;
  const previewOrder = currentSlip?.order || order;
  const previewMeta = currentSlip?.jobMetadata || jobMetadata || null;

  const resolvedRestaurantName =
    restaurantName ||
    restaurantDetails?.name ||
    previewOrder?.restaurantName ||
    order?.restaurantName ||
    "TASTY BITES";

  const slipKotItems = Array.isArray(currentSlip?.kotItems)
    ? currentSlip.kotItems
    : null;
  const resolvedKotItems =
    slipKotItems && slipKotItems.length > 0
      ? slipKotItems
      : kotItems && kotItems.length > 0
        ? kotItems
        : Array.isArray(previewOrder?.items)
          ? previewOrder.items
          : Array.isArray(order?.items)
            ? order.items
            : [];

  const resolvedTaxBreakdown =
    taxBreakdown && taxBreakdown.length > 0
      ? taxBreakdown
      : previewOrder?.taxBreakdown || order?.taxBreakdown || [];

  const resolvedGuestCount =
    guestCount ?? previewOrder?.guestCount ?? order?.guestCount;

  const resolvedSpecialNote =
    specialNote || previewOrder?.specialNote || order?.specialNote;

  const resolvedServerName =
    serverName || previewOrder?.processedByName || order?.processedByName;

  const handleClose = () => {
    if (reprinting) return;
    onClose?.();
  };

  const postReprint = async (body) => {
    const res = await fetch("/api/sales/print-jobs/reprint-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Failed to send print job");
    }
    return json;
  };

  const handleReprint = async () => {
    const orderId = order?._id || order?.id;
    if (!orderId && !currentSlip?.jobId) {
      toast.error("No saved order found to reprint.");
      return;
    }

    setReprinting(true);
    try {
      if (currentSlip?.jobId) {
        await postReprint({
          jobId: String(currentSlip.jobId),
          printType,
        });
      } else if (slipList && slipList.length > 1) {
        // Reprint every seat/group slip when browsing multi-bill preview
        let ok = 0;
        for (const slip of slipList) {
          if (slip.jobId) {
            await postReprint({ jobId: String(slip.jobId), printType });
            ok += 1;
          }
        }
        if (ok === 0) {
          await postReprint({
            orderId: String(orderId),
            printType,
            kotItems: resolvedKotItems,
            guestCount: resolvedGuestCount,
            serverName: resolvedServerName,
            specialNote: resolvedSpecialNote,
            restaurantName: resolvedRestaurantName,
          });
        }
      } else {
        await postReprint({
          orderId: String(orderId),
          printType,
          kotItems: resolvedKotItems,
          guestCount: resolvedGuestCount,
          serverName: resolvedServerName,
          specialNote: resolvedSpecialNote,
          restaurantName: resolvedRestaurantName,
        });
      }
      setIsReprint(true);
      toast.success(
        printType === "customer"
          ? slipList && slipList.length > 1 && !currentSlip?.jobId
            ? "Seat receipts queued to printer!"
            : "Receipt queued to printer!"
          : printType === "bar"
            ? "Bar ticket queued to printer!"
            : "KOT queued to printer!",
      );
    } catch (err) {
      toast.error(err.message || "Failed to reprint ticket");
    } finally {
      setReprinting(false);
    }
  };

  const reprintButtonLabel = (() => {
    if (reprinting) return "Sending to Printer...";
    if (printType === "customer") {
      if (slipList && slipList.length > 1 && !currentSlip?.jobId) {
        return "Reprint all slips";
      }
      return "Reprint Receipt";
    }
    if (printType === "bar") {
      return currentSlip?.jobId ? "Reprint this Bar ticket" : "Reprint Bar Ticket";
    }
    return currentSlip?.jobId ? "Reprint this KOT" : "Reprint KOT";
  })();

  const title = (() => {
    if (slipList && slipList.length > 0) {
      if (printType === "customer") {
        return slipList.length > 1 ? "Seat bill preview" : PREVIEW_TITLES.customer;
      }
      if (printType === "kot") return "KOT history";
      if (printType === "bar") return "Bar ticket history";
    }
    return PREVIEW_TITLES[printType] || "Print Preview";
  })();

  // Plain overlay (not Radix Dialog) so closing the payment modal / residual
  // pointer events cannot auto-dismiss the bill preview.
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-zinc-100 rounded-lg w-full max-w-md max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-white shrink-0 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900">
            <Printer className="w-5 h-5 text-orange-500" />
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={reprinting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {slipList && slipList.length > 1 ? (
          <div className="shrink-0 border-b border-zinc-200 bg-white px-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {slipList.map((slip, idx) => (
                <button
                  key={slip.id || idx}
                  type="button"
                  onClick={() => setActiveSlip(idx)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                    activeSlip === idx
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {slip.label || `Slip ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start bg-zinc-100">
          <div
            className="shadow-lg bg-white rounded-sm overflow-hidden"
            style={{ width: "80mm" }}
          >
            {printType === "customer" && (
              <CustomerReceipt
                order={previewOrder}
                taxBreakdown={
                  previewOrder?.taxBreakdown || resolvedTaxBreakdown
                }
                restaurantDetails={
                  restaurantDetails || { name: resolvedRestaurantName }
                }
                serverName={resolvedServerName}
                guestCount={resolvedGuestCount}
                isReprint={isReprint}
                jobMetadata={previewMeta}
              />
            )}
            {printType === "kot" && (
              <KitchenOrderTicket
                order={previewOrder}
                kotItems={resolvedKotItems}
                restaurantName={resolvedRestaurantName}
                serverName={resolvedServerName}
                guestCount={resolvedGuestCount}
                specialNote={resolvedSpecialNote}
                isReprint={isReprint}
              />
            )}
            {printType === "bar" && (
              <BarReceipt
                order={previewOrder}
                barItems={resolvedKotItems}
                restaurantName={resolvedRestaurantName}
                serverName={resolvedServerName}
                guestCount={resolvedGuestCount}
                specialNote={resolvedSpecialNote}
                isReprint={isReprint}
              />
            )}
          </div>
        </div>

        <div className="p-4 bg-white border-t shrink-0 flex justify-between w-full gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={reprinting}
            className="flex-1"
          >
            Close
          </Button>
          <Button
            onClick={handleReprint}
            disabled={reprinting}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-none font-bold gap-2"
          >
            {reprinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            {reprintButtonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;
