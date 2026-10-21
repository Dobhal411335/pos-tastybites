"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
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
import { cn } from "@/lib/utils";

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
    const cleanIso = String(iso).includes("T")
      ? String(iso).split("T")[0]
      : String(iso);
    const d = new Date(`${cleanIso}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      return { weekday: "—", monthDay: String(iso), year: "" };
    }
    return {
      weekday: d.toLocaleDateString("en-CA", { weekday: "short" }),
      monthDay: d.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      }),
      year: d.toLocaleDateString("en-CA", { year: "numeric" }),
    };
  } catch {
    return { weekday: "—", monthDay: String(iso), year: "" };
  }
}

function getOrderDate(order) {
  const raw = order?.offerFulfillmentDate || order?.pickup?.date;
  if (!raw) return "";
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return raw.trim();
  }
  try {
    const clean = String(raw).includes("T")
      ? String(raw).split("T")[0]
      : String(raw);
    const d = new Date(`${clean}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fallback
  }
  return String(raw || "");
}

function getOrderPickupTime(order) {
  const time = order?.pickup?.time;
  if (!time) return "99:99";
  const m = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    return `${m[1].padStart(2, "0")}:${m[2]}`;
  }
  return String(time);
}

function sortUpcomingOffers(list) {
  return [...list].sort((a, b) => {
    const dateA = getOrderDate(a);
    const dateB = getOrderDate(b);

    if (dateA !== dateB) {
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    }

    const timeA = getOrderPickupTime(a);
    const timeB = getOrderPickupTime(b);
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }

    return String(a?.orderNumber || "").localeCompare(
      String(b?.orderNumber || ""),
      undefined,
      { numeric: true },
    );
  });
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

function getItemPriceDisplay(item, orderTotal, isSingleItem) {
  const qty = Math.max(1, Number(item?.qty) || 1);
  const rawPrice =
    item?.price != null && item?.price !== "" ? Number(item.price) : null;

  if (rawPrice != null && !Number.isNaN(rawPrice)) {
    const lineTotal = rawPrice * qty;
    return {
      lineTotal: `$${lineTotal.toFixed(2)}`,
      unitPrice: qty > 1 ? `$${rawPrice.toFixed(2)}` : null,
    };
  }

  if (
    isSingleItem &&
    orderTotal != null &&
    !Number.isNaN(Number(orderTotal))
  ) {
    const total = Number(orderTotal);
    const unit = total / qty;
    return {
      lineTotal: `$${total.toFixed(2)}`,
      unitPrice: qty > 1 ? `$${unit.toFixed(2)}` : null,
    };
  }

  return null;
}

function OfferItemAccordion({ item, orderTotal, isSingleItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const details = getOfferDetailLines(item);
  const priceInfo = getItemPriceDisplay(item, orderTotal, isSingleItem);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-stone-50/70 transition-colors hover:border-stone-300">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-stone-100/70"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Gift className="h-4 w-4 shrink-0 text-orange-500" />
          <p className="truncate text-sm font-extrabold text-stone-900">
            {item.qty}× {item.name}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {priceInfo ? (
            <div className="flex items-baseline gap-1 text-right">
              {priceInfo.unitPrice ? (
                <span className="hidden text-[11px] font-semibold text-stone-400 sm:inline">
                  ({priceInfo.unitPrice} each)
                </span>
              ) : null}
              <span className="text-sm font-black tabular-nums text-stone-900">
                {priceInfo.lineTotal}
              </span>
            </div>
          ) : null}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200",
              isOpen && "rotate-180 text-orange-600",
            )}
          />
        </div>
      </button>

      {/* Animated content panel using CSS grid-rows trick */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "border-t border-stone-200/70 bg-white/70 px-3.5 py-3 transition-opacity duration-300",
              isOpen ? "opacity-100" : "opacity-0",
            )}
          >
            {details.length ? (
              <div className="space-y-2.5">
                {details.map((line, lIdx) => (
                  <div key={`${line.label}-${lIdx}`}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-stone-800">
                      {line.label}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {(line.values || [line.value]).map((value, vIdx) => (
                        <li
                          key={`${line.label}-${vIdx}`}
                          className="flex gap-2 text-[13px] leading-snug text-stone-600"
                        >
                          <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-stone-800" />
                          <span>{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : !item.notes ? (
              <p className="text-xs italic text-stone-400">
                No additional choices or inclusions specified.
              </p>
            ) : null}

            {item.notes ? (
              <p
                className={`${
                  details.length ? "mt-2.5 border-t border-stone-100 pt-2" : ""
                } text-xs font-medium italic text-amber-800`}
              >
                Remark: {item.notes}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpcomingOffersPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sortedRows = useMemo(() => sortUpcomingOffers(rows), [rows]);

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
                  {sortedRows.length} scheduled
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
        ) : sortedRows.length === 0 ? (
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
            {sortedRows.map((order) => {
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
              const dateParts = splitDateParts(
                order.offerFulfillmentDate || order.pickup?.date,
              );
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
                        {lines.map((item, idx) => (
                          <OfferItemAccordion
                            key={`${id}-item-${idx}`}
                            item={item}
                            orderTotal={order.totalAmount}
                            isSingleItem={lines.length === 1}
                          />
                        ))}
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
