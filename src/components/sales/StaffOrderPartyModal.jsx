"use client";

import React from "react";
import { Loader2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function StaffOrderPartyModal({
  open,
  onClose,
  employees = [],
  selectedStaffId,
  staffOrderReason,
  onReasonChange,
  onConfirm,
  isSubmitting = false,
}) {
  if (!open) return null;

  const selectedEmployee = employees.find(
    (emp) => String(emp.id || emp._id) === String(selectedStaffId),
  );
  const selectedName = selectedEmployee?.name || "";
  const discount = Number(selectedEmployee?.staffDiscount) || 0;
  const displayValue = [
    selectedName,
    selectedEmployee?.role,
    discount > 0 ? `${discount}% off` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Staff Order</h2>
            <p className="text-sm font-semibold text-zinc-500 mt-0.5">
              Confirm staff name and add a special note if needed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Staff member
            </label>
            <Input
              readOnly
              value={displayValue || "—"}
              className="h-12 border-zinc-200 rounded-lg text-sm font-semibold bg-zinc-50 text-zinc-900 cursor-default focus-visible:ring-0"
            />
            {selectedName && discount > 0 ? (
              <p className="text-xs font-bold text-emerald-700">
                Staff discount: {discount}% off will apply automatically
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Special note
              <span className="text-zinc-400 font-semibold normal-case ml-1">
                (optional)
              </span>
            </label>
            <Textarea
              placeholder="e.g. End of shift meal, allergy note…"
              value={staffOrderReason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="min-h-[80px] border-zinc-200 rounded-lg text-sm font-medium resize-none"
            />
          </div>
        </div>

        <div className="p-5 border-t border-zinc-100 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl font-bold border-zinc-200 shadow-none bg-red-500 text-white hover:bg-red-600"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting || !selectedStaffId}
            className="flex-2 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-none flex items-center justify-center"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Confirm & Send"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
