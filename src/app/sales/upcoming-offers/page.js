"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Gift,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { employeeFetch } from "@/lib/employeeFetch";
import { useSocket } from "@/components/providers/SocketProvider";
import { getOfferDetailLines } from "@/utils/offerDetails";

function formatTimeLabel(time) {
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time || "—";
  const h = Number(m[1]);
  const min = m[2];
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${period}`;
}

function splitDateParts(iso) {
  if (!iso) return { weekday: "—", monthDay: "—", year: "" };
  try {
    const d = new Date(`${iso}T12:00:00`);
    return {
      weekday: d.toLocaleDateString("en-CA", { weekday: "short" }),
      monthDay: d.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      }),
      year: d.toLocaleDateString("en-CA", { year: "numeric" }),
    };
  } catch {
    return { weekday: "—", monthDay: iso, year: "" };
  }
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  if (s === "CONFIRMED") {
    return "bg-sky-50 text-sky-800 ring-sky-200";
  }
  if (s === "COMPLETED") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }
  return "bg-stone-100 text-stone-700 ring-stone-200";
}

export default function UpcomingOffersPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRows = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await employeeFetch("/api/sales/upcoming-offers");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load upcoming offers");
      }
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load upcoming offers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (!socket) return undefined;
    const onChange = () => fetchRows({ silent: true });
    socket.on("order:created", onChange);
    socket.on("order:updated", onChange);
    return () => {
      socket.off("order:created", onChange);
      socket.off("order:updated", onChange);
    };
  }, [socket, fetchRows]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F7F7F5]">
      <div className="shrink-0 border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push("/floor")}
              className="h-10 shrink-0 rounded-xl border-0 bg-red-500 px-3 text-white hover:bg-red-600"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Floor
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-extrabold tracking-tight text-stone-900">
                  Upcoming Offers
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-orange-700 ring-1 ring-orange-200">
                  <Gift className="h-3 w-3" />
                  {rows.length} scheduled
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-stone-500">
                Future-dated online offer bookings · move to Today when the day
                arrives
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-xl border-stone-200 bg-white px-4 shadow-sm"
            onClick={() => fetchRows({ silent: true })}
            disabled={refreshing || loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""} sm:mr-2`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-stone-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading upcoming offers…
          </div>
        ) : rows.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <CalendarDays className="h-7 w-7" />
            </div>
            <p className="text-base font-extrabold text-stone-900">
              No upcoming offer bookings
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
              Future-dated online offers appear here until their day arrives,
              then they move into Today&apos;s Online orders.
            </p>
          </div>
        ) : (
          <ul className="mx-auto grid max-w-3xl gap-4">
            {rows.map((order) => {
              const id = order._id || order.id;
              const offerItems = (order.items || []).filter(
                (item) =>
                  item.isOffer ||
                  item.inclusions?.length ||
                  item.choices?.length,
              );
              const lines = offerItems.length
                ? offerItems
                : order.items || [];
              const dateParts = splitDateParts(order.offerFulfillmentDate);
              const status = String(order.status || "PENDING").toUpperCase();

              return (
                <li
                  key={id}
                  className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Schedule rail */}
                    <div className="flex shrink-0 items-center gap-3 border-b border-stone-100 bg-gradient-to-br from-orange-50 to-amber-50/40 px-4 py-4 sm:w-[7.5rem] sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:border-b-0 sm:border-r sm:px-3">
                      <div className="text-center">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700/80">
                          {dateParts.weekday}
                        </p>
                        <p className="mt-0.5 text-lg font-black leading-none text-stone-900">
                          {dateParts.monthDay}
                        </p>
                        {dateParts.year ? (
                          <p className="mt-1 text-[11px] font-semibold text-stone-500">
                            {dateParts.year}
                          </p>
                        ) : null}
                      </div>
                      <div className="hidden h-px w-10 bg-orange-200/80 sm:block" />
                      <div className="flex items-center gap-1.5 rounded-xl bg-white/80 px-2.5 py-1.5 ring-1 ring-orange-100 sm:flex-col sm:gap-0.5 sm:px-2 sm:py-2">
                        <Clock3 className="h-3.5 w-3.5 text-orange-600 sm:mb-0.5" />
                        <p className="text-sm font-black tabular-nums text-stone-900">
                          {formatTimeLabel(order.pickup?.time)}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                          Pickup
                        </p>
                      </div>
                    </div>

                    {/* Main */}
                    <div className="min-w-0 flex-1 p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <h2 className="text-lg font-black tracking-tight text-stone-900">
                              #{order.orderNumber}
                            </h2>
                            <span className="text-[15px] font-semibold text-stone-700">
                              {order.partyName || "Guest"}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[13px] text-stone-600">
                            {order.contactNumber ? (
                              <span className="inline-flex items-center gap-1.5 tabular-nums">
                                <Phone className="h-3.5 w-3.5 text-stone-400" />
                                {order.contactNumber}
                              </span>
                            ) : null}
                            {order.guestEmail ? (
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                                <span className="truncate">
                                  {order.guestEmail}
                                </span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${statusTone(status)}`}
                          >
                            {status}
                          </span>
                          <p className="text-lg font-black tabular-nums text-stone-900">
                            ${Number(order.totalAmount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {lines.map((item, idx) => {
                          const details = getOfferDetailLines(item);
                          return (
                            <div
                              key={`${id}-item-${idx}`}
                              className="rounded-xl bg-stone-50 px-3.5 py-3 ring-1 ring-stone-100"
                            >
                              <div className="flex items-start gap-2">
                                <Gift className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-extrabold text-stone-900">
                                    {item.qty}× {item.name}
                                  </p>
                                  {details.length ? (
                                    <div className="mt-2 space-y-2">
                                      {details.map((line) => (
                                        <div key={`${idx}-${line.label}`}>
                                          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                                            {line.label}
                                          </p>
                                          <ul className="mt-1 space-y-0.5">
                                            {(
                                              line.values || [line.value]
                                            ).map((value) => (
                                              <li
                                                key={`${idx}-${line.label}-${value}`}
                                                className="flex gap-2 text-[13px] leading-snug text-stone-600"
                                              >
                                                <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-stone-300" />
                                                <span>{value}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                  {item.notes ? (
                                    <p className="mt-2 text-xs font-medium italic text-amber-800">
                                      Remark: {item.notes}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {order.specialNote ? (
                        <div className="mt-3 flex gap-2.5 rounded-xl bg-amber-50/90 px-3.5 py-2.5 ring-1 ring-amber-100">
                          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          <p className="text-[13px] leading-relaxed text-amber-950">
                            <span className="font-extrabold">
                              Special instructions
                            </span>
                            <span className="text-amber-900/90">
                              {" "}
                              · {order.specialNote}
                            </span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
