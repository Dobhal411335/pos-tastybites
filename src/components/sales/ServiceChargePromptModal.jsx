"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatServiceTaxRate } from "@/lib/orders/serviceCharge";

export default function ServiceChargePromptModal({
  open,
  serviceTax,
  amount = 0,
  onYes,
  onNo,
  onClose,
}) {
  if (!open || !serviceTax) return null;

  const name = serviceTax.name || "Server Charge";
  const rate = formatServiceTaxRate(serviceTax);
  const displayAmount = (Number(amount) || 0).toFixed(2);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              Add {name}?
            </h2>
            <p className="text-sm font-semibold text-zinc-500 mt-1">
              This charge is optional. Choose Yes to add it to this check, or No
              to skip it.
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm font-semibold text-zinc-500">
              <span>Name</span>
              <span className="text-zinc-900">{name}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-zinc-500">
              <span>Rate</span>
              <span className="text-zinc-900">{rate}</span>
            </div>
            <div className="flex justify-between items-end pt-2 border-t border-zinc-200">
              <span className="text-sm font-bold text-zinc-900">Amount</span>
              <span className="text-2xl font-black text-zinc-900 leading-none">
                ${displayAmount}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNo?.()}
            className="flex-1 h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 shadow-none"
          >
            No
          </Button>
          <Button
            type="button"
            onClick={() => onYes?.()}
            className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-none"
          >
            Yes
          </Button>
        </div>
      </div>
    </div>
  );
}
