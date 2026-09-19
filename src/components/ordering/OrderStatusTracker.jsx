"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "PENDING", label: "Order Received" },
  { key: "CONFIRMED", label: "Preparing" },
  { key: "READY", label: "Ready for Pickup" },
];

function stepIndex(status, paymentStatus) {
  const s = String(status || "").toUpperCase();
  if (s === "CANCELLED" || s === "WAIVED") return -1;
  if (s === "COMPLETED" || s === "PAID" || paymentStatus === "PAID") return 2;
  if (s === "CONFIRMED") return 1;
  return 0; // PENDING
}

export default function OrderStatusTracker({ status, paymentStatus }) {
  const current = stepIndex(status, paymentStatus);
  const cancelled =
    String(status).toUpperCase() === "CANCELLED" ||
    String(status).toUpperCase() === "WAIVED";

  if (cancelled) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 font-semibold">
        This order was {String(status).toLowerCase()}.
      </div>
    );
  }

  return (
    <ol className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-0">
      {STEPS.map((step, index) => {
        const done = current > index;
        const active = current === index;
        return (
          <li key={step.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold",
                  done || active
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-zinc-200 text-zinc-400"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={cn(
                    "w-0.5 flex-1 min-h-8 my-1",
                    done ? "bg-primary" : "bg-zinc-200"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-6", index === STEPS.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-bold",
                  active || done ? "text-zinc-900" : "text-zinc-400"
                )}
              >
                {step.label}
              </p>
              {active && (
                <p className="text-xs text-zinc-500 mt-1">Current status</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
