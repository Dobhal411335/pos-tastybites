"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
  Armchair,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSocket } from "@/components/providers/SocketProvider";
import { employeeFetch } from "@/lib/employeeFetch";
import { todayRestaurantISO } from "@/lib/restaurantTime";

const FILTERS = [
  { id: "PENDING", label: "Pending" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "SEATED", label: "Seated" },
  { id: "DONE", label: "Closed" },
  { id: "ALL", label: "All" },
];

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "ACCEPTED") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "SEATED") return "bg-sky-100 text-sky-800 border-sky-200";
  if (s === "DECLINED" || s === "CANCELLED" || s === "NO_SHOW") {
    return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

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
    });
  } catch {
    return iso;
  }
}

function formatPhone(phone, countryCode) {
  const code = String(countryCode || "").trim();
  const digits = String(phone || "").trim();
  if (!digits) return "—";
  return code ? `${code} ${digits}` : digits;
}

export default function SalesReservationsPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const todayISO = useMemo(() => todayRestaurantISO(), []);
  const [tab, setTab] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState(null);
  const [tableDrafts, setTableDrafts] = useState({});
  const [floorTables, setFloorTables] = useState([]);
  const [seatDialogReservation, setSeatDialogReservation] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [seatingBusy, setSeatingBusy] = useState(false);

  const fetchRows = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await employeeFetch("/api/sales/reservations");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load bookings");
      }
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load reservations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchTables = useCallback(async () => {
    try {
      const res = await employeeFetch("/api/sales/reservations?tables=true");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setFloorTables(json.data);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchRows();
    fetchTables();
  }, [fetchRows, fetchTables]);

  useEffect(() => {
    if (!socket) return undefined;
    const onChange = () => fetchRows({ silent: true });
    const onTableChange = () => fetchTables();
    socket.on("reservation:created", onChange);
    socket.on("reservation:updated", onChange);
    socket.on("table:assigned", onTableChange);
    socket.on("table:updated", onTableChange);
    socket.on("table:released", onTableChange);
    return () => {
      socket.off("reservation:created", onChange);
      socket.off("reservation:updated", onChange);
      socket.off("table:assigned", onTableChange);
      socket.off("table:updated", onTableChange);
      socket.off("table:released", onTableChange);
    };
  }, [socket, fetchRows, fetchTables]);

  const counts = useMemo(() => {
    const c = {
      PENDING: 0,
      ACCEPTED: 0,
      SEATED: 0,
      DONE: 0,
      ALL: rows.length,
    };
    for (const r of rows) {
      const s = String(r.status || "").toUpperCase();
      if (s === "PENDING") c.PENDING += 1;
      else if (s === "ACCEPTED") c.ACCEPTED += 1;
      else if (s === "SEATED") c.SEATED += 1;
      else if (["DECLINED", "CANCELLED", "NO_SHOW"].includes(s)) c.DONE += 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (tab === "PENDING") list = list.filter((r) => r.status === "PENDING");
    else if (tab === "ACCEPTED") list = list.filter((r) => r.status === "ACCEPTED");
    else if (tab === "SEATED") list = list.filter((r) => r.status === "SEATED");
    else if (tab === "DONE") {
      list = list.filter((r) =>
        ["DECLINED", "CANCELLED", "NO_SHOW"].includes(r.status)
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        `${r.guestName} ${r.phone} ${r.email || ""} ${r.date || ""} ${r.time} ${r.status} ${r.assignedTableNo || ""} ${r.reasonForVisit || ""} ${r.specialRequest || r.notes || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    return list.sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (b.status === "PENDING" && a.status !== "PENDING") return 1;
      const dateCmp = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCmp !== 0) return dateCmp;
      return String(a.time).localeCompare(String(b.time));
    });
  }, [rows, tab, search]);

  const patchReservation = async (id, action, extra = {}) => {
    setActingId(id);
    try {
      const res = await employeeFetch("/api/sales/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: id, action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Update failed");
      }
      setRows((prev) =>
        prev.map((r) => (r._id === id || r.id === id ? { ...r, ...json.data } : r))
      );
      toast.success(
        action === "accept"
          ? "Accepted — guest emailed"
          : json.message || "Updated"
      );
      await fetchRows({ silent: true });
      await fetchTables();
    } catch (err) {
      toast.error(err.message || "Failed to update booking");
    } finally {
      setActingId(null);
    }
  };

  const openSeatDialog = (reservation) => {
    setSeatDialogReservation(reservation);
    const available = floorTables.filter((t) => !t.isOccupied);
    const match = available.find(
      (t) =>
        (reservation.assignedTableId && t.id === reservation.assignedTableId) ||
        (reservation.assignedTableNo && t.tableNumber === reservation.assignedTableNo)
    );
    if (match) {
      setSelectedTableId(match.id);
    } else {
      const bestFit =
        available.find((t) => Number(t.seats) >= Number(reservation.guests || 1)) ||
        available[0];
      setSelectedTableId(bestFit?.id || "");
    }
  };

  const handleConfirmSeat = async () => {
    if (!seatDialogReservation || !selectedTableId) return;
    const chosenTable = floorTables.find((t) => t.id === selectedTableId);
    setSeatingBusy(true);
    try {
      const res = await employeeFetch("/api/sales/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: seatDialogReservation.id || seatDialogReservation._id,
          action: "seat",
          tableId: chosenTable?.id,
          assignedTableNo: chosenTable?.tableNumber,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to seat guest");
      }
      const updated = json.data;
      toast.success(
        `Guest seated at Table ${chosenTable?.tableNumber}! Floor plan booked for ${seatDialogReservation.guests} seats.`,
      );
      setSeatDialogReservation(null);
      await fetchRows({ silent: true });
      await fetchTables();
    } catch (err) {
      toast.error(err.message || "Could not seat guest");
    } finally {
      setSeatingBusy(false);
    }
  };

  const handleMakeOrder = async (reservation) => {
    if (reservation.tableSessionId) {
      router.push(`/sales/orders/${reservation.tableSessionId}`);
      return;
    }
    // Fallback: check if an active session exists for this table
    if (reservation.assignedTableId || reservation.assignedTableNo) {
      try {
        const res = await employeeFetch("/api/sales/sessions");
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data)) {
          const match = json.data.find((s) => {
            const prim = s.primaryTable?._id || s.primaryTable?.id || s.primaryTable;
            const tableNum = s.primaryTable?.tableNumber || s.tableNumbers;
            return (
              (reservation.assignedTableId && String(prim) === String(reservation.assignedTableId)) ||
              (reservation.assignedTableNo && tableNum === reservation.assignedTableNo)
            );
          });
          if (match && match._id) {
            router.push(`/sales/orders/${match._id}`);
            return;
          }
        }
      } catch {
        /* fallback */
      }
    }
    router.push("/floor");
  };

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
              <h1 className="truncate text-xl font-bold text-zinc-900">
                Table Bookings
              </h1>
              <p className="text-xs text-zinc-500">
                Upcoming · {counts.PENDING} waiting for a decision
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-xl border-zinc-200 px-4"
            onClick={() => fetchRows({ silent: true })}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""} sm:mr-2`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 px-4 py-3 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { label: "Pending", value: counts.PENDING, tone: "text-amber-700 bg-amber-50 border-amber-100" },
            { label: "Accepted", value: counts.ACCEPTED, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
            { label: "Seated", value: counts.SEATED, tone: "text-sky-700 bg-sky-50 border-sky-100" },
            { label: "Closed", value: counts.DONE, tone: "text-zinc-600 bg-zinc-50 border-zinc-200" },
            { label: "Upcoming", value: counts.ALL, tone: "text-orange-700 bg-orange-50 border-orange-100 hidden lg:flex" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`flex flex-col rounded-xl border px-3 py-2 ${stat.tone}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                {stat.label}
              </span>
              <span className="text-xl font-black tabular-nums">{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const count = counts[f.id] ?? 0;
              const active = tab === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTab(f.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-50 text-zinc-600 px-3.5 py-2 text-md font-bold transition ${
                    active
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-2 border border-black py-0.5 text-[10px] tabular-nums ${
                      active ? "bg-red-500 text-white" : "bg-red-500 text-white"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, table…"
              className="h-9 rounded-xl border-zinc-200 pl-9 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-zinc-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading bookings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="font-semibold text-zinc-800">No bookings in this filter</p>
            <p className="mt-1 text-sm text-zinc-500">
              New verified online requests land under Pending.
            </p>
          </div>
        ) : (
          <ul className="mx-auto grid max-w-5xl gap-3">
            {filtered.map((r) => {
              const id = r._id || r.id;
              const busy = actingId === id;
              const isFuture = String(r.date || "") > todayISO;
              return (
                <li
                  key={id}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-stretch">
                    <div className="flex shrink-0 flex-row items-center gap-3 lg:w-32 lg:flex-col lg:items-start lg:justify-center lg:border-r lg:border-zinc-100 lg:pr-4">
                      <div className="rounded-xl bg-orange-50 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">
                          {formatDateLabel(r.date)}
                        </p>
                        <p className="text-lg font-black tabular-nums text-orange-800">
                          {formatTimeLabel(r.time)}
                        </p>
                      </div>
                      <Badge
                        className={`border text-[10px] font-bold uppercase ${statusBadge(r.status)}`}
                      >
                        {r.status?.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <h2 className="text-lg font-bold text-zinc-900">
                        {r.guestName}
                      </h2>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-zinc-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-zinc-400" />
                          {r.guests} guest{r.guests === 1 ? "" : "s"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <Phone className="h-3.5 w-3.5 text-zinc-400" />
                          {formatPhone(r.phone, r.countryCode)}
                        </span>
                        {r.email ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-zinc-400" />
                            {r.email}
                          </span>
                        ) : null}
                        {r.assignedTableNo ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-sky-700">
                            <Clock3 className="h-3.5 w-3.5" />
                            Table {r.assignedTableNo}
                          </span>
                        ) : null}
                      </div>
                      {r.reasonForVisit ? (
                        <p className="text-sm text-zinc-700">
                          <span className="font-semibold text-zinc-900">Reason:</span>{" "}
                          {r.reasonForVisit}
                        </p>
                      ) : null}
                      {r.specialRequest || r.notes ? (
                        <p className="text-sm text-zinc-600">
                          <span className="font-semibold text-zinc-800">Special request:</span>{" "}
                          {r.specialRequest || r.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex w-full flex-col gap-2 lg:w-56">
                      {r.status === "PENDING" ? (
                        <>
                            <Button
                              disabled={busy}
                              onClick={() =>
                                patchReservation(id, "accept", {
                                  assignedTableNo: tableDrafts[id] || undefined,
                                })
                              }
                              className="h-15 bg-emerald-600 text-md font-bold text-white hover:bg-emerald-700 shadow-sm"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="mr-1 h-5 w-5" /> Accept & email
                                </>
                              )}
                            </Button>
                      
                          <Button
                            disabled={busy}
                            variant={isFuture ? "default" : "outline"}
                            onClick={() => patchReservation(id, "decline")}
                            className={
                              isFuture
                                ? "h-15 bg-red-600 font-bold text-md text-white hover:bg-red-700 shadow-sm"
                                : "h-15 border-zinc-300 font-bold text-md"
                            }
                          >
                            <X className="mr-1 h-5 w-5" /> Decline
                          </Button>
                        </>
                      ) : null}

                      {r.status === "ACCEPTED" ? (
                        <>
                          <Button
                            disabled={busy}
                            onClick={() => openSeatDialog(r)}
                            className="h-15 bg-sky-600 text-md font-bold text-white hover:bg-sky-700 shadow-sm"
                          >
                            <Armchair className="mr-1.5 h-4 w-4" /> Seat Now
                          </Button>
                          <Button
                            disabled={busy}
                            variant="outline"
                            onClick={() => patchReservation(id, "no-show")}
                            className="h-15 border-zinc-300 font-bold"
                          >
                            No-show
                          </Button>
                        </>
                      ) : null}

                      {r.status === "SEATED" ? (
                        <>
                          <Button
                            onClick={() => handleMakeOrder(r)}
                            className="h-15 bg-orange-600 font-bold text-white hover:bg-orange-700 shadow-sm"
                          >
                            <ShoppingBag className="mr-1.5 h-4 w-4" /> Make Order
                          </Button>
                          <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-3 py-5 text-xs font-semibold text-sky-800">
                            <span className="flex items-center gap-1.5">
                              <Armchair className="h-4 w-4 text-sky-600" />
                              Table {r.assignedTableNo || "—"}
                            </span>
                            <span className="text-[11px] font-bold text-sky-700">
                              {r.guests} seats
                            </span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Dialog for selecting table and seating the guest */}
      <Dialog
        open={Boolean(seatDialogReservation)}
        onOpenChange={(open) => {
          if (!open) {
            setSeatDialogReservation(null);
            setSelectedTableId("");
          }
        }}
      >
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900">
              <Armchair className="h-5 w-5 text-sky-600" />
              Seat Guest at Table
            </DialogTitle>
          </DialogHeader>

          {seatDialogReservation && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">
                    {seatDialogReservation.guestName}
                  </span>
                  <Badge className="bg-sky-100 text-sky-800 border-sky-200 font-bold">
                    {seatDialogReservation.guests} {seatDialogReservation.guests === 1 ? "Guest" : "Guests"}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-600">
                  <span>{formatDateLabel(seatDialogReservation.date)}</span>
                  <span>·</span>
                  <span>{formatTimeLabel(seatDialogReservation.time)}</span>
                  {seatDialogReservation.phone ? (
                    <>
                      <span>·</span>
                      <span className="tabular-nums">{seatDialogReservation.phone}</span>
                    </>
                  ) : null}
                </div>
                {seatDialogReservation.specialRequest || seatDialogReservation.reasonForVisit ? (
                  <p className="mt-2 text-xs italic text-zinc-600 border-t border-sky-100/80 pt-1.5">
                    Note: {seatDialogReservation.specialRequest || seatDialogReservation.reasonForVisit}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Available Floor Tables
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                    {floorTables.filter((t) => !t.isOccupied).length} Available
                  </span>
                </div>

                {floorTables.filter((t) => !t.isOccupied).length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center space-y-1">
                    <p className="text-xs font-bold text-amber-900">
                      No tables currently available on floor.
                    </p>
                    <p className="text-[11px] text-amber-700">
                      All floor tables are occupied with active dining sessions. Free up a table on Floor to seat this party.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {floorTables
                      .filter((t) => !t.isOccupied)
                      .map((t) => {
                        const isSelected = selectedTableId === t.id;
                        const fitsCapacity =
                          Number(t.seats) >= Number(seatDialogReservation.guests || 1);
                        const isPreassigned =
                          seatDialogReservation.assignedTableNo === t.tableNumber ||
                          seatDialogReservation.assignedTableId === t.id;

                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTableId(t.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                              isSelected
                                ? "border-sky-600 bg-sky-50/70 shadow-sm"
                                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? "border-sky-600" : "border-zinc-300"
                                }`}
                              >
                                {isSelected ? (
                                  <div className="h-2 w-2 rounded-full bg-sky-600" />
                                ) : null}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-zinc-900 text-sm">
                                    Table {t.tableNumber}
                                  </span>
                                  {isPreassigned ? (
                                    <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px] px-1.5 py-0 font-bold">
                                      Pre-assigned
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-xs text-zinc-500">
                                  {t.floorName || "Main Floor"}
                                  {t.section ? ` · ${t.section}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {fitsCapacity ? (
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5">
                                  {t.seats} seats · Fits
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
                                  {t.seats} seats
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 pt-1">
                  Assigning will book this table on the floor plan, set dining capacity to{" "}
                  <strong className="text-zinc-800">{seatDialogReservation.guests} seats</strong>, and create an active session ready for orders.
                </p>
              </div>

              <DialogFooter className="flex gap-2 sm:justify-end pt-3">
                <Button
                  variant="outline"
                  onClick={() => setSeatDialogReservation(null)}
                  disabled={seatingBusy}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmSeat}
                  disabled={seatingBusy || !selectedTableId}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm"
                >
                  {seatingBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Confirm &amp; Seat
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
