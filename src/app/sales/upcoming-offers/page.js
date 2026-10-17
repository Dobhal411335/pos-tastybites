"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Gift,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function formatDateLabel(iso) {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "CONFIRMED") return "bg-sky-100 text-sky-800 border-sky-200";
  if (s === "COMPLETED") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-50">
      <div className="shrink-0 border-b border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => router.push("/floor")}
              className="h-10 shrink-0 border bg-red-500 px-2 text-white hover:bg-red-600"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Floor
            </Button>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 truncate text-xl font-bold text-zinc-900">
                <Gift className="h-5 w-5 text-violet-600" />
                Upcoming Offers
              </h1>
              <p className="text-xs text-zinc-500">
                Online offer bookings for a future day · {rows.length} scheduled
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-xl border-zinc-200 px-4"
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

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-zinc-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading upcoming offers…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="font-semibold text-zinc-800">No upcoming offer bookings</p>
            <p className="mt-1 text-sm text-zinc-500">
              Future-dated online offers appear here until their day arrives,
              then they move into Today&apos;s Online orders.
            </p>
          </div>
        ) : (
          <ul className="mx-auto grid max-w-5xl gap-3">
            {rows.map((order) => {
              const id = order._id || order.id;
              const offerItems = (order.items || []).filter(
                (item) => item.isOffer || item.inclusions?.length || item.choices?.length,
              );
              const lines = offerItems.length
                ? offerItems
                : order.items || [];
              return (
                <li
                  key={id}
                  className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-stretch">
                    <div className="flex shrink-0 flex-row items-center gap-3 lg:w-36 lg:flex-col lg:items-start lg:justify-center lg:border-r lg:border-zinc-100 lg:pr-4">
                      <div className="rounded-xl bg-violet-50 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                          {formatDateLabel(order.offerFulfillmentDate)}
                        </p>
                        <p className="text-lg font-black tabular-nums text-violet-800">
                          {formatTimeLabel(order.pickup?.time)}
                        </p>
                      </div>
                      <Badge
                        className={`border text-[10px] font-bold uppercase ${statusBadge(order.status)}`}
                      >
                        {order.status}
                      </Badge>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-zinc-900">
                          #{order.orderNumber}
                        </h2>
                        <span className="text-sm font-semibold text-zinc-700">
                          {order.partyName || "Guest"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-zinc-600">
                        {order.contactNumber ? (
                          <span className="inline-flex items-center gap-1.5 tabular-nums">
                            <Phone className="h-3.5 w-3.5 text-zinc-400" />
                            {order.contactNumber}
                          </span>
                        ) : null}
                        {order.guestEmail ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-zinc-400" />
                            {order.guestEmail}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5 font-semibold text-violet-700">
                          <Users className="h-3.5 w-3.5" />
                          ${Number(order.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {lines.map((item, idx) => {
                          const details = getOfferDetailLines(item);
                          return (
                            <div
                              key={`${id}-item-${idx}`}
                              className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2"
                            >
                              <p className="text-sm font-bold text-zinc-900">
                                {item.qty}× {item.name}
                              </p>
                              {details.length ? (
                                <div className="mt-1.5 space-y-1.5">
                                  {details.map((line) => (
                                    <div
                                      key={`${idx}-${line.label}`}
                                      className="text-xs text-zinc-600"
                                    >
                                      <p className="font-semibold text-zinc-800">
                                        {line.label}
                                      </p>
                                      <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                                        {(line.values || [line.value]).map((value) => (
                                          <li key={`${idx}-${line.label}-${value}`}>
                                            {value}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              {item.notes ? (
                                <p className="mt-1.5 text-xs font-medium italic text-amber-800">
                                  Remark: {item.notes}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      {order.specialNote ? (
                        <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
                          <span className="font-bold">Special instructions:</span>{" "}
                          {order.specialNote}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex w-full flex-col gap-2 lg:w-44">
                      <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                          Fulfillment day
                        </p>
                        <p className="text-sm font-black text-violet-900">
                          {formatDateLabel(order.offerFulfillmentDate)}
                        </p>
                      </div>
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
