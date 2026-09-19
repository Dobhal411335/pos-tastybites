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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/components/providers/SocketProvider";
import { employeeFetch } from "@/lib/employeeFetch";

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

export default function SalesReservationsPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const [tab, setTab] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState(null);
  const [tableDrafts, setTableDrafts] = useState({});

  const fetchRows = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await employeeFetch("/api/sales/reservations?today=true");
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

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (!socket) return undefined;
    const onChange = () => fetchRows({ silent: true });
    socket.on("reservation:created", onChange);
    socket.on("reservation:updated", onChange);
    return () => {
      socket.off("reservation:created", onChange);
      socket.off("reservation:updated", onChange);
    };
  }, [socket, fetchRows]);

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
        `${r.guestName} ${r.phone} ${r.email || ""} ${r.time} ${r.status} ${r.assignedTableNo || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    return list.sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (b.status === "PENDING" && a.status !== "PENDING") return 1;
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
    } catch (err) {
      toast.error(err.message || "Failed to update booking");
    } finally {
      setActingId(null);
    }
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
                Today · {counts.PENDING} waiting for a decision
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
            { label: "Today total", value: counts.ALL, tone: "text-orange-700 bg-orange-50 border-orange-100 hidden lg:flex" },
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
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active ? "bg-white/20 text-white" : "bg-white text-zinc-500"
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
              return (
                <li
                  key={id}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-stretch">
                    <div className="flex shrink-0 flex-row items-center gap-3 lg:w-28 lg:flex-col lg:items-start lg:justify-center lg:border-r lg:border-zinc-100 lg:pr-4">
                      <div className="rounded-xl bg-orange-50 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">
                          Arrival
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
                          {r.phone}
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
                      <p className="text-[11px] text-zinc-400">
                        Table # is a staff note only — it does not lock a floor table.
                        Mark Seated when guests arrive, then seat them on Floor.
                      </p>
                    </div>

                    <div className="flex w-full flex-col gap-2 lg:w-56">
                      {r.status === "PENDING" ? (
                        <>
                          <Input
                            placeholder="Table note (optional)"
                            value={tableDrafts[id] || ""}
                            onChange={(e) =>
                              setTableDrafts((prev) => ({
                                ...prev,
                                [id]: e.target.value,
                              }))
                            }
                            className="h-9 rounded-lg text-sm"
                          />
                          <Button
                            disabled={busy}
                            onClick={() =>
                              patchReservation(id, "accept", {
                                assignedTableNo: tableDrafts[id] || undefined,
                              })
                            }
                            className="h-10 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="mr-1 h-4 w-4" /> Accept & email
                              </>
                            )}
                          </Button>
                          <Button
                            disabled={busy}
                            variant="outline"
                            onClick={() => patchReservation(id, "decline")}
                            className="h-10 border-zinc-300 font-bold"
                          >
                            <X className="mr-1 h-4 w-4" /> Decline
                          </Button>
                        </>
                      ) : null}

                      {r.status === "ACCEPTED" ? (
                        <>
                          <Input
                            placeholder="Table note"
                            value={tableDrafts[id] || r.assignedTableNo || ""}
                            onChange={(e) =>
                              setTableDrafts((prev) => ({
                                ...prev,
                                [id]: e.target.value,
                              }))
                            }
                            className="h-9 rounded-lg text-sm"
                          />
                          <Button
                            disabled={busy}
                            onClick={() =>
                              patchReservation(id, "seat", {
                                assignedTableNo:
                                  tableDrafts[id] || r.assignedTableNo || undefined,
                              })
                            }
                            className="h-10 bg-sky-600 font-bold text-white hover:bg-sky-700"
                          >
                            Guest seated
                          </Button>
                          <Button
                            disabled={busy}
                            variant="outline"
                            onClick={() => patchReservation(id, "no-show")}
                            className="h-10 border-zinc-300 font-bold"
                          >
                            No-show
                          </Button>
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
    </div>
  );
}
