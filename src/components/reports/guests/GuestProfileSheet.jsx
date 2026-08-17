"use client";

import { ArrowLeft, Loader2, Mail, Phone, Calendar } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import OrderDetailBody from "@/components/reports/OrderDetailBody";
import { PALETTE } from "@/utils/paletteeColor";
import {
  dash,
  formatDate,
  formatDateTime,
  formatPhone,
  guestInitials,
  guestType,
  money,
  STATUS_BADGE,
} from "./guestFormat";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-md px-2 py-1 text-xs shadow-sm">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold text-zinc-900">{money(payload[0].value)}</p>
    </div>
  );
}

function TypeBadge({ type }) {
  if (type === "returning") {
    return (
      <span className="bg-orange-50 text-orange-700 font-semibold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md w-max">
        Returning Guest
      </span>
    );
  }
  if (type === "walk-in") {
    return (
      <span className="bg-zinc-100 text-zinc-600 font-semibold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md w-max">
        Walk-in
      </span>
    );
  }
  return (
    <span className="bg-blue-50 text-blue-700 font-semibold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md w-max">
      New Guest
    </span>
  );
}

function GuestProfileBody({
  guest,
  history,
  charts,
  mostOrderedItems,
  onSelectOrder,
}) {
  const type = guestType(guest);
  const series = charts?.revenueOverTime || [];
  const showChart = series.length >= 2 && series.some((row) => Number(row.revenue) > 0);
  const recent = history.slice(0, 6);
  const items = mostOrderedItems || [];

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-lg font-semibold shrink-0">
          {guestInitials(guest.name)}
        </div>
        <div className="flex flex-col min-w-0">
          <h3 className="text-xl font-semibold text-zinc-900 truncate">{guest.name}</h3>
          <div className="mt-1">
            <TypeBadge type={type} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 bg-zinc-50 p-3 rounded-xl text-sm">
        <div className="flex items-center gap-2 text-zinc-500">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="text-zinc-900 truncate">{dash(guest.email)}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <Phone className="h-4 w-4 shrink-0" />
          <span className="text-zinc-900">{formatPhone(guest.phone, guest.countryCode)}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="text-zinc-900">First visit: {formatDate(guest.firstVisit)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-50 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Lifetime Value
          </span>
          <span className="text-lg font-semibold text-orange-600 mt-1 tabular-nums">
            {money(guest.totalSpent)}
          </span>
        </div>
        <div className="bg-zinc-50 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Total Orders
          </span>
          <span className="text-lg font-semibold text-zinc-900 mt-1 tabular-nums">
            {guest.orders}
          </span>
        </div>
        <div className="bg-zinc-50 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Avg Order
          </span>
          <span className="text-lg font-semibold text-zinc-900 mt-1 tabular-nums">
            {money(guest.aov)}
          </span>
        </div>
        <div className="bg-zinc-50 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Last Visit
          </span>
          <span className="text-sm font-semibold text-zinc-900 mt-1">
            {formatDate(guest.lastVisit)}
          </span>
        </div>
      </div>

      {showChart ? (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Spending over time
          </span>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} hide />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={32} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={PALETTE.accent}
                  fill="#FFEDD5"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Most ordered items
          </span>
          <div className="rounded-xl overflow-hidden border border-zinc-100">
            {items.map((item) => (
              <div
                key={item.name}
                className="px-3 py-2 flex items-center justify-between bg-white border-b border-zinc-100 last:border-b-0"
              >
                <span className="text-sm text-zinc-800 truncate pr-2">{item.name}</span>
                <span className="text-xs font-semibold tabular-nums text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                  {item.qty}x
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Recent orders
        </span>
        {recent.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center">No orders for this guest.</p>
        ) : (
          <div className="rounded-xl overflow-hidden border border-zinc-100">
            {recent.map((row) => (
              <button
                key={row.orderId}
                type="button"
                onClick={() => onSelectOrder(row.orderId)}
                className="w-full px-3 py-2.5 flex flex-col gap-1 bg-white border-b border-zinc-100 last:border-b-0 text-left hover:bg-orange-50/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-900">{row.orderNumber}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      STATUS_BADGE[row.status] || "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-xs">
                    {formatDateTime(row.createdAt)}
                    {row.tableNo && row.tableNo !== "—" ? ` • Table ${row.tableNo}` : ""}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-zinc-900">
                    {money(row.totalAmount)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuestProfileSheet({
  open,
  onOpenChange,
  guest,
  history,
  charts,
  mostOrderedItems,
  loading,
  orderDetail,
  orderLoading,
  onSelectOrder,
  onBackToGuest,
}) {
  const showingOrder = Boolean(orderDetail) || orderLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] custom-scrollbar p-0 flex flex-col gap-0 overflow-hidden"
      >
        <SheetHeader className="bg-zinc-50 px-4 py-3 pr-12 border-b border-zinc-200 text-left space-y-0">
          {showingOrder ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 -ml-2"
                onClick={onBackToGuest}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <SheetTitle className="text-base">
                  {orderDetail?.orderNumber || "Order"}
                </SheetTitle>
                <SheetDescription>Order details</SheetDescription>
              </div>
            </div>
          ) : (
            <>
              <SheetTitle className="text-base">Guest Profile</SheetTitle>
              <SheetDescription className="sr-only">
                Guest contact, spend, and purchase history
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <div
          key={showingOrder ? "order" : guest?.guestKey || "guest"}
          className="flex-1 overflow-y-auto px-4 py-4 sheet-body-in"
        >
          {showingOrder ? (
            orderLoading ? (
              <div className="py-10 flex justify-center text-sm text-zinc-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading order…
              </div>
            ) : orderDetail ? (
              <OrderDetailBody order={orderDetail} />
            ) : null
          ) : loading && !guest ? (
            <div className="py-10 flex justify-center text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading guest…
            </div>
          ) : guest ? (
            <GuestProfileBody
              guest={guest}
              history={history}
              charts={charts}
              mostOrderedItems={mostOrderedItems}
              onSelectOrder={onSelectOrder}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
