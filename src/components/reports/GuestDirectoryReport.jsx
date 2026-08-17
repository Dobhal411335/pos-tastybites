"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Loader2,
  Mail,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  Users,
  Wallet,
  Repeat,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GuestDirectoryTable from "@/components/reports/guests/GuestDirectoryTable";
import GuestProfileSheet from "@/components/reports/guests/GuestProfileSheet";
import {
  formatDate,
  formatPhone,
  guestType,
  money,
  startOfDay,
  toYmd,
} from "@/components/reports/guests/guestFormat";

const EMPTY_FILTERS = {
  email: "",
  phone: "",
  type: "ALL",
  minOrders: "",
  minSpend: "",
};

function KpiCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col justify-between h-28 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-orange-500/5 to-transparent rounded-full" />
      <div className="flex justify-between items-start z-10">
        <p className="text-sm text-zinc-500">{label}</p>
        <Icon className="h-5 w-5 text-zinc-400" />
      </div>
      <h2 className="text-2xl font-semibold text-zinc-900 tabular-nums z-10 tracking-tight">
        {value}
      </h2>
    </div>
  );
}

function matchesGuestFilters(guest, filters) {
  if (filters.email) {
    const email = String(guest.email || "").toLowerCase();
    if (!email.includes(filters.email.toLowerCase())) return false;
  }
  if (filters.phone) {
    const digits = filters.phone.replace(/\D/g, "");
    if (digits && !String(guest.phone || "").includes(digits)) return false;
  }
  if (filters.type !== "ALL" && guestType(guest) !== filters.type) return false;
  if (filters.minOrders && guest.orders < Number(filters.minOrders)) return false;
  if (filters.minSpend && guest.totalSpent < Number(filters.minSpend)) return false;
  return true;
}

function exportGuestCsv(guests) {
  const headers = [
    "Guest",
    "Email",
    "Phone",
    "Orders",
    "Total Spent",
    "Avg Order",
    "Last Visit",
    "Type",
  ];
  const lines = guests.map((guest) =>
    [
      guest.name,
      guest.email || "",
      formatPhone(guest.phone, guest.countryCode),
      guest.orders,
      guest.totalSpent,
      guest.aov,
      guest.lastVisit ? formatDate(guest.lastVisit) : "",
      guestType(guest),
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "guest-directory.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function GuestDirectoryReport() {
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("revenue");
  const [showWalkIns, setShowWalkIns] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  const [selectedGuestKey, setSelectedGuestKey] = useState(null);
  const [guestDetail, setGuestDetail] = useState(null);
  const [guestDetailLoading, setGuestDetailLoading] = useState(false);

  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const dateFilterReady = Boolean(dateFrom && dateTo);
  const dateFromParam = dateFilterReady ? toYmd(dateFrom) : "";
  const dateToParam = dateFilterReady ? toYmd(dateTo) : "";

  useEffect(() => {
    const controller = new AbortController();

    async function loadGuests() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ sort, orderStatus: "ALL" });
        if (dateFromParam && dateToParam) {
          params.set("dateFrom", dateFromParam);
          params.set("dateTo", dateToParam);
        }
        if (search) params.set("search", search);
        const res = await fetch(`/api/admin/reports/guests?${params}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Failed to load report");
        setReport(json.data);
      } catch (error) {
        if (error.name === "AbortError") return;
        toast.error(error.message || "Failed to load guest directory");
        setReport(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadGuests();
    return () => controller.abort();
  }, [dateFromParam, dateToParam, search, sort, reloadToken]);

  const clearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setSearchInput("");
    setSearch("");
    setSort("revenue");
    setShowWalkIns(false);
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const guests = useMemo(() => report?.guests || [], [report]);
  const unidentified = useMemo(
    () => report?.unidentified || { count: 0, guests: [] },
    [report]
  );

  const visibleGuests = useMemo(
    () => guests.filter((guest) => matchesGuestFilters(guest, appliedFilters)),
    [guests, appliedFilters]
  );

  const visibleUnidentified = useMemo(() => {
    if (appliedFilters.type !== "ALL" && appliedFilters.type !== "walk-in") {
      return { count: 0, guests: [], orders: 0, totalSpent: 0, lastVisit: null };
    }
    const walkInFilters = { ...appliedFilters, type: "ALL" };
    const walkInGuests = (unidentified.guests || []).filter((guest) =>
      matchesGuestFilters(guest, walkInFilters)
    );
    return {
      ...unidentified,
      guests: walkInGuests,
      count: walkInGuests.length,
      orders: walkInGuests.reduce((sum, guest) => sum + guest.orders, 0),
      totalSpent: walkInGuests.reduce((sum, guest) => sum + guest.totalSpent, 0),
    };
  }, [unidentified, appliedFilters]);

  const hasGuests =
    (appliedFilters.type === "walk-in" ? 0 : visibleGuests.length) > 0 ||
    (visibleUnidentified.count || 0) > 0;

  const openGuest = async (guestKey) => {
    setSelectedGuestKey(guestKey);
    setOrderDetail(null);
    const local =
      guests.find((guest) => guest.guestKey === guestKey) ||
      unidentified.guests?.find((guest) => guest.guestKey === guestKey) ||
      null;
    setGuestDetail(local ? { guest: local, history: [], charts: null, mostOrderedItems: [] } : null);
    setGuestDetailLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reports/guests?guestKey=${encodeURIComponent(guestKey)}`,
        { credentials: "include", cache: "no-store" }
      );
      const json = await res.json();
      if (json.success) {
        setGuestDetail({
          guest: json.data.guests?.[0] || local,
          history: json.data.history || [],
          charts: json.data.charts || null,
          mostOrderedItems: json.data.mostOrderedItems || [],
        });
      }
    } catch {
      // Keep the list snapshot already shown.
    } finally {
      setGuestDetailLoading(false);
    }
  };

  const openOrder = async (orderId) => {
    setOrderDetail(null);
    setOrderDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Order not found");
      setOrderDetail(json.data);
    } catch (error) {
      toast.error(error.message || "Failed to load order");
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const closeProfile = (open) => {
    if (open) return;
    setSelectedGuestKey(null);
    setGuestDetail(null);
    setOrderDetail(null);
    setOrderDetailLoading(false);
  };

  const kpis = useMemo(() => {
    const meta = report?.meta || {};
    return [
      { label: "Total Guests", value: meta.identifiedGuests ?? 0, icon: Users },
      { label: "Total Orders", value: meta.totalOrders ?? 0, icon: Receipt },
      { label: "Guest Revenue", value: money(meta.totalRevenue), icon: Wallet },
      { label: "Avg. Guest Spend", value: money(meta.avgGuestSpend), icon: Activity },
      {
        label: "Returning Guests",
        value: `${meta.returningPercent ?? 0}%`,
        icon: Repeat,
      },
    ];
  }, [report]);

  const dateLabel =
    dateFrom && dateTo
      ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
      : "All time";

  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            Guest Directory
          </h1>
          <p className="text-sm text-zinc-500">Guest & Customer Analytics</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 shadow-sm px-2 py-1.5 rounded-lg">
            <CalendarDays className="h-4 w-4 text-zinc-500 ml-1" />
            <DatePicker
              value={dateFrom}
              onChange={(value) => setDateFrom(value ? startOfDay(value) : null)}
              placeholder="From"
              className="h-8 w-32 border-0 shadow-none px-1 text-sm"
            />
            <span className="text-zinc-400 text-xs">–</span>
            <DatePicker
              value={dateTo}
              onChange={(value) => setDateTo(value ? startOfDay(value) : null)}
              placeholder="To"
              className="h-8 w-32 border-0 shadow-none px-1 text-sm"
            />
          </div>
          <div className="flex items-center bg-white border border-zinc-200 shadow-sm px-2 py-1.5 rounded-lg">
            <Search className="h-4 w-4 text-zinc-400 ml-1 mr-2" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search guests..."
              className="h-8 w-44 border-0 shadow-none px-0 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 bg-white"
            onClick={() => exportGuestCsv(visibleGuests)}
            disabled={visibleGuests.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-10 p-0 bg-white"
            onClick={() => setReloadToken((value) => value + 1)}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
        ))}
      </div>

      {report?.meta?.truncated ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Showing guests from the most recent {report.meta.scannedOrders?.toLocaleString()} orders.
          Older guests may be missing.
        </p>
      ) : null}

      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-2 flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-zinc-100 px-2 py-1.5 rounded-lg flex-1 min-w-[150px]">
          <Mail className="h-4 w-4 text-zinc-400 mr-2" />
          <Input
            value={draftFilters.email}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="Email"
            className="h-7 border-0 shadow-none bg-transparent px-0 text-sm"
          />
        </div>
        <div className="flex items-center bg-zinc-100 px-2 py-1.5 rounded-lg flex-1 min-w-[150px]">
          <Phone className="h-4 w-4 text-zinc-400 mr-2" />
          <Input
            value={draftFilters.phone}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, phone: event.target.value }))
            }
            placeholder="Phone"
            className="h-7 border-0 shadow-none bg-transparent px-0 text-sm"
          />
        </div>
        <Select
          value={draftFilters.type}
          onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, type: value }))}
        >
          <SelectTrigger className="h-9 w-36 bg-zinc-100 border-0 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="returning">Returning</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="walk-in">Walk-in</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min="0"
          value={draftFilters.minOrders}
          onChange={(event) =>
            setDraftFilters((prev) => ({ ...prev, minOrders: event.target.value }))
          }
          placeholder="Min Orders"
          className="h-9 w-28 bg-zinc-100 border-0 text-sm"
        />
        <Input
          type="number"
          min="0"
          value={draftFilters.minSpend}
          onChange={(event) =>
            setDraftFilters((prev) => ({ ...prev, minSpend: event.target.value }))
          }
          placeholder="Min Spend"
          className="h-9 w-28 bg-zinc-100 border-0 text-sm"
        />
        <Button
          type="button"
          className="h-8 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold uppercase"
          onClick={() => setAppliedFilters(draftFilters)}
        >
          Apply Filters
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-8 text-[11px] font-semibold uppercase"
          onClick={clearFilters}
        >
          Clear
        </Button>
      </div>

      {(dateFrom && !dateTo) || (!dateFrom && dateTo) ? (
        <p className="text-[11px] text-zinc-500 -mt-3">
          Pick both dates to filter by activity. The list still shows all guests until then.
        </p>
      ) : (
        <p className="text-[11px] text-zinc-400 -mt-3">{dateLabel}</p>
      )}

      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-xl h-64 flex items-center justify-center text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading guests…
        </div>
      ) : !hasGuests ? (
        <div className="bg-white border border-zinc-200 rounded-xl h-48 flex items-center justify-center text-sm text-zinc-500">
          No guests found{dateFilterReady ? " for this period" : ""}.
        </div>
      ) : (
        <GuestDirectoryTable
          guests={appliedFilters.type === "walk-in" ? [] : visibleGuests}
          unidentified={visibleUnidentified}
          showWalkIns={showWalkIns || Boolean(search) || appliedFilters.type === "walk-in"}
          onToggleWalkIns={() => setShowWalkIns((open) => !open)}
          onSelect={openGuest}
          selectedGuestKey={selectedGuestKey}
        />
      )}

      <GuestProfileSheet
        open={Boolean(selectedGuestKey)}
        onOpenChange={closeProfile}
        guest={guestDetail?.guest}
        history={guestDetail?.history || []}
        charts={guestDetail?.charts}
        mostOrderedItems={guestDetail?.mostOrderedItems || []}
        loading={guestDetailLoading}
        orderDetail={orderDetail}
        orderLoading={orderDetailLoading}
        onSelectOrder={openOrder}
        onBackToGuest={() => {
          setOrderDetail(null);
          setOrderDetailLoading(false);
        }}
      />
    </div>
  );
}
