"use client";

import React, { useEffect, useState } from "react";
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
}) => {
  const [reprinting, setReprinting] = useState(false);
  const [isReprint, setIsReprint] = useState(Boolean(order?.isReprint));

  useEffect(() => {
    setIsReprint(Boolean(order?.isReprint));
  }, [order?._id, order?.isReprint, printType]);

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

  const resolvedRestaurantName =
    restaurantName ||
    restaurantDetails?.name ||
    order?.restaurantName ||
    "TASTY BITES";

  const resolvedKotItems =
    kotItems && kotItems.length > 0
      ? kotItems
      : Array.isArray(order?.items)
        ? order.items
        : [];

  const resolvedTaxBreakdown =
    taxBreakdown && taxBreakdown.length > 0
      ? taxBreakdown
      : order?.taxBreakdown || [];

  const resolvedGuestCount = guestCount ?? order?.guestCount;

  const resolvedSpecialNote = specialNote || order?.specialNote;

  const resolvedServerName = serverName || order?.processedByName;

  const handleClose = () => {
    if (reprinting) return;
    onClose?.();
  };

  const handleReprint = async () => {
    const orderId = order?._id || order?.id;
    if (!orderId) {
      toast.error("No saved order found to reprint.");
      return;
    }

    setReprinting(true);
    try {
      const res = await fetch("/api/sales/print-jobs/reprint-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: String(orderId),
          printType,
          kotItems: resolvedKotItems,
          guestCount: resolvedGuestCount,
          serverName: resolvedServerName,
          specialNote: resolvedSpecialNote,
          restaurantName: resolvedRestaurantName,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to send print job");
      }
      setIsReprint(true);
      toast.success(
        printType === "customer"
          ? "Receipt queued to printer!"
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
    if (printType === "customer") return "Reprint Receipt";
    if (printType === "bar") return "Reprint Bar Ticket";
    return "Reprint KOT";
  })();

  // Plain overlay (not Radix Dialog) so closing the payment modal / residual
  // pointer events cannot auto-dismiss the bill preview.
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={PREVIEW_TITLES[printType] || "Print Preview"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-zinc-100 rounded-lg w-full max-w-md max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-white shrink-0 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900">
            <Printer className="w-5 h-5 text-orange-500" />
            {PREVIEW_TITLES[printType] || "Print Preview"}
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

        <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start bg-zinc-100">
          <div
            className="shadow-lg bg-white rounded-sm overflow-hidden"
            style={{ width: "80mm" }}
          >
            {printType === "customer" && (
              <CustomerReceipt
                order={order}
                taxBreakdown={resolvedTaxBreakdown}
                restaurantDetails={
                  restaurantDetails || { name: resolvedRestaurantName }
                }
                serverName={resolvedServerName}
                guestCount={resolvedGuestCount}
                isReprint={isReprint}
              />
            )}
            {printType === "kot" && (
              <KitchenOrderTicket
                order={order}
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
                order={order}
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
