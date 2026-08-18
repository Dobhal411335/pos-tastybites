"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDate,
  formatPhone,
  guestInitials,
  guestType,
  money,
} from "./guestFormat";

function TypeBadge({ type }) {
  if (type === "returning") {
    return (
      <span className="bg-orange-500 text-white font-semibold text-[10px] uppercase tracking-wide px-2 py-1.5 rounded-md">
        Returning Guest
      </span>
    );
  }
  if (type === "walk-in") {
    return (
      <span className="bg-orange-500 text-white font-semibold text-[10px] uppercase tracking-wide px-2 py-1.5 rounded-md">
        Walk-in Guest
      </span>
    );
  }
  return (
    <span className="bg-blue-400 text-white font-semibold text-[10px] uppercase tracking-wide px-2 py-1.5 rounded-md">
      New Guest
    </span>
  );
}

function Avatar({ name }) {
  return (
    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px] font-semibold shrink-0">
      {guestInitials(name)}
    </div>
  );
}
function GuestRow({ guest, selected, onSelect }) {
  const type = guestType(guest);
  return (
    <button
      type="button"
      onClick={() => onSelect(guest.guestKey)}
      className={`w-full flex items-center px-4 py-3 gap-3 text-left hover:cursor-pointer transition-colors relative ${
        selected
          ? "bg-orange-50/70"
          : "hover:bg-zinc-50"
      }`}
    >
      {selected ? (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
      ) : null}
      <div className="flex-[2] min-w-0 flex items-center gap-2.5">
        <Avatar name={guest.name} />
        <span className="text-sm font-medium text-zinc-900 truncate">{guest.name}</span>
      </div>
      <div className="flex-[2] min-w-0 flex flex-col">
        <span className="text-sm text-zinc-800 truncate">{guest.email || "—"}</span>
        <span className="text-[11px] text-zinc-500 truncate">
          {formatPhone(guest.phone, guest.countryCode)}
        </span>
      </div>
      <div className="flex-1 min-w-0 text-sm tabular-nums text-zinc-900 text-right">
        {guest.orders}
      </div>
      <div className="flex-1 min-w-0 text-sm tabular-nums text-zinc-900 text-right font-medium">
        {money(guest.totalSpent)}
      </div>
      <div className="flex-1 min-w-0 text-sm tabular-nums text-zinc-900 text-right">
        {money(guest.aov)}
      </div>
      <div className="flex-[1.5] min-w-0 text-sm text-zinc-700 text-center">
        {formatDate(guest.lastVisit)}
      </div>
      <div className="flex-1 min-w-0 flex justify-center">
        <TypeBadge type={type} />
      </div>
      <div className="w-8 flex justify-end text-zinc-900">
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

function TableHeaderRow() {
  return (
    <div className="flex items-center bg-zinc-50 px-4 py-2.5 gap-3">
      <div className="flex-[2] min-w-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Guest
      </div>
      <div className="flex-[2] min-w-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Contact
      </div>
      <div className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 text-right">
        Orders
      </div>
      <div className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 text-right">
        Total Spent
      </div>
      <div className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 text-right">
        Avg Order
      </div>
      <div className="flex-[1.5] text-center min-w-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Last Visit
      </div>
      <div className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 text-center">
        Type
      </div>
      <div className="w-8" />
    </div>
  );
}

function GuestRowSkeleton() {
  return (
    <div className="w-full flex items-center px-4 py-3 gap-3 border-t border-zinc-100">
      <div className="flex-[2] min-w-0 flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-full bg-zinc-200 shrink-0" />
        <Skeleton className="h-4 w-28 bg-zinc-200" />
      </div>
      <div className="flex-[2] min-w-0 flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-36 bg-zinc-200" />
        <Skeleton className="h-3 w-24 bg-zinc-200" />
      </div>
      <div className="flex-1 min-w-0 flex justify-end">
        <Skeleton className="h-4 w-8 bg-zinc-200" />
      </div>
      <div className="flex-1 min-w-0 flex justify-end">
        <Skeleton className="h-4 w-14 bg-zinc-200" />
      </div>
      <div className="flex-1 min-w-0 flex justify-end">
        <Skeleton className="h-4 w-12 bg-zinc-200" />
      </div>
      <div className="flex-[1.5] min-w-0">
        <Skeleton className="h-4 w-20 bg-zinc-200" />
      </div>
      <div className="flex-1 min-w-0 flex justify-center">
        <Skeleton className="h-5 w-16 rounded-md bg-zinc-200" />
      </div>
      <div className="w-8 flex justify-end">
        <Skeleton className="h-4 w-4 bg-zinc-200" />
      </div>
    </div>
  );
}

export default function GuestDirectoryTable({
  guests,
  unidentified,
  showWalkIns,
  onToggleWalkIns,
  onSelect,
  selectedGuestKey,
  loading = false,
}) {
  const walkInCount = unidentified?.count || 0;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <TableHeaderRow />
        {Array.from({ length: 8 }).map((_, index) => (
          <GuestRowSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <TableHeaderRow />
      {guests.map((guest) => (
        <div key={guest.guestKey} className="border-t border-zinc-100">
          <GuestRow
            guest={guest}
            selected={selectedGuestKey === guest.guestKey}
            onSelect={onSelect}
          />
        </div>
      ))}

      {walkInCount > 0 ? (
        <button
          type="button"
          className="w-full flex items-center px-4 py-3 gap-3 text-left bg-zinc-50 hover:bg-zinc-100 border-t border-zinc-100"
          onClick={onToggleWalkIns}
        >
          <div className="flex-[2] min-w-0 flex items-center gap-2 text-sm font-medium text-zinc-700">
            {showWalkIns ? (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            )}
            Walk-in / unidentified
            <Badge
              variant="outline"
              className="text-[10px] font-normal text-zinc-500 border-zinc-200"
            >
              {walkInCount}
            </Badge>
          </div>
          <div className="flex-[2] min-w-0 text-sm text-zinc-400">—</div>
          <div className="flex-1 min-w-0 text-sm tabular-nums text-zinc-500 text-right">
            {unidentified.orders}
          </div>
          <div className="flex-1 min-w-0 text-sm tabular-nums text-zinc-500 text-right">
            {money(unidentified.totalSpent)}
          </div>
          <div className="flex-1 min-w-0 text-sm text-zinc-400 text-right">—</div>
          <div className="flex-[1.5] min-w-0 text-sm text-zinc-500">
            {formatDate(unidentified.lastVisit)}
          </div>
          <div className="flex-1 min-w-0 flex justify-center">
            <TypeBadge type="walk-in" />
          </div>
          <div className="w-8" />
        </button>
      ) : null}

      {showWalkIns
        ? (unidentified?.guests || []).map((guest) => (
            <div key={guest.guestKey} className="border-t border-zinc-100">
              <GuestRow
                guest={guest}
                selected={selectedGuestKey === guest.guestKey}
                onSelect={onSelect}
              />
            </div>
          ))
        : null}

      {guests.length === 0 && walkInCount === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-zinc-500 border-t border-zinc-100">
          No guests found.
        </div>
      ) : null}
    </div>
  );
}
