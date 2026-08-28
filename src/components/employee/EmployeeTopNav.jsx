"use client";

import React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Grid2X2,
  ShoppingBag,
  Printer,
  BellRing,
  Home,
  Loader2,
  FileBarChart2,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import DateTimeDisplay from "@/components/common/DateTimeDisplay";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/common/NotificationBell";
import { employeeFetch } from "@/lib/employeeFetch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRIMARY_NAV = [
  { label: "Floor", href: "/floor", icon: Grid2X2 },
  { label: "Orders", href: "/sales/today", icon: ShoppingBag },
];

const MENU_LINKS = [
  {
    label: "EOD",
    href: "/sales/reports/end-of-day",
    icon: FileBarChart2,
  },
  {
    label: "Print Jobs",
    href: "/sales/print-jobs",
    icon: Printer,
  },
  {
    label: "Notifications",
    href: "/sales/notifications",
    icon: BellRing,
  },
];

const TABLE_STATUS = [
  { label: "Available", className: "bg-white border border-zinc-500" },
  { label: "Serving", className: "bg-sky-400 border border-sky-500" },
  { label: "Payment", className: "bg-emerald-500 border border-emerald-600" },
  { label: "Ordering", className: "bg-orange-500 border border-orange-600" },
  { label: "Combined", className: "bg-violet-500 border border-violet-600" },
  { label: "Booked", className: "bg-red-500 border border-red-600" },
];

const ORDER_LINKS = [
  { label: "Walking Direct Order", href: "/sales/orders/walk-in" },
  { label: "Staff Order", href: "/sales/orders/staff" },
  { label: "Online Order", href: "/sales/today" },
];

const quickActionClass =
  "flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-white text-stone-800 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-3px_-3px_10px_rgba(255,255,255,0.9)] ring-1 ring-stone-100/80 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[8px_8px_18px_rgba(0,0,0,0.1)]";

function navActive(pathname, href) {
  if (href === "/floor") {
    return pathname === "/floor" || pathname?.startsWith("/sales/orders");
  }
  return pathname === href || pathname?.startsWith(href + "/");
}

export default function EmployeeTopNav({
  onMenuToggle,
  employeeName = "Employee",
  employeeRole = "Server",
}) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [closeBlockedOpen, setCloseBlockedOpen] = React.useState(false);
  const [closeBlockers, setCloseBlockers] = React.useState(null);
  const [checkingClose, setCheckingClose] = React.useState(false);
  const [closingRestaurant, setClosingRestaurant] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const showCloseBlockers = (blockers) => {
    setCloseBlockers(blockers || null);
    setConfirmCloseOpen(false);
    setCloseBlockedOpen(true);
  };

  const handleLogout = async () => {
    if (loggingOut || closingRestaurant) return;
    setLoggingOut(true);
    setMenuOpen(false);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/employee/auth/logout", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        toast.success("Logged out successfully.");
      }
    } catch {
      toast.message("Signing out…");
    } finally {
      window.location.assign("/sales/login");
    }
  };

  const handleDayCloseClick = async () => {
    if (loggingOut || closingRestaurant || checkingClose) return;
    setMenuOpen(false);
    setCheckingClose(true);
    try {
      const res = await employeeFetch("/api/employees/close-restaurant");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Could not verify restaurant status.");
        return;
      }
      const blockers = data.data;
      if (blockers && !blockers.canClose) {
        showCloseBlockers(blockers);
        return;
      }
      setCloseBlockers(null);
      setConfirmCloseOpen(true);
    } catch {
      toast.error("Could not verify restaurant status.");
    } finally {
      setCheckingClose(false);
    }
  };

  const handleCloseRestaurant = async () => {
    if (closingRestaurant || loggingOut || checkingClose) return;
    setConfirmCloseOpen(false);
    setClosingRestaurant(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await employeeFetch("/api/employees/close-restaurant", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        toast.success("Restaurant closed. All employees logged out.");
        window.location.assign("/sales/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 || data.code === "CLOSE_BLOCKED") {
        setClosingRestaurant(false);
        showCloseBlockers(data.data);
        toast.error(data.message || "Clear pending orders and booked tables first.");
        return;
      }
      toast.error(data.message || "Failed to close restaurant.");
      setClosingRestaurant(false);
    } catch {
      toast.error("Failed to close restaurant.");
      setClosingRestaurant(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#F7F7F7]/95 backdrop-blur supports-backdrop-filter:bg-[#F7F7F7]/90">
      <div className="flex lg:h-14 xl:h-15 items-center gap-3 px-3 sm:px-5">
        {/* LEFT — brand */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <Link
            href="/floor"
            className="flex items-center gap-2.5 min-w-0"
          >
            <Image
              src="/BannerImage.png"
              alt="Tasty Bites"
              width={130}
              height={44}
              className="object-contain xl:h-10 w-auto"
              priority
            />
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-700 hover:bg-orange-100 uppercase tracking-wider lg:text-[12px] xl:text-[10px] px-2 py-0.5 h-6 hidden sm:inline-flex"
            >
              Sales POS
            </Badge>
          </Link>
        </div>

        {/* CENTER — Floor + Orders only */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-1.5 min-w-0">
          {PRIMARY_NAV.map((item) => {
            const active = navActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-stone-600 hover:bg-stone-200/80 hover:text-stone-900"
                }`}
              >
                <Icon className="xl:h-5 lg:h-4 md:h-3 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* RIGHT — time, bell, profile dropdown */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 ml-auto shrink-0">
          <div className="hidden lg:block">
            <DateTimeDisplay compact />
          </div>

          <NotificationBell viewAllHref="/sales/notifications" />

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-stone-800 bg-white px-2 py-2 hover:bg-stone-50 transition-colors max-w-48 outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <div className="relative shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-orange-600 text-white text-sm font-bold">
                    {employeeName?.charAt(0)?.toUpperCase() || "E"}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="hidden sm:block leading-tight text-left min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">
                    {employeeName || "Employee"}
                  </p>
                  <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide truncate">
                    {employeeRole}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={12}
              className="w-[min(400px,calc(100vw-1.5rem))] space-y-3 rounded-[24px] border border-stone-200/60 bg-[#EFEFEF] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.12)]"
            >
              <div>
                <h3 className="mb-2 px-1 font-serif text-[16px] text-stone-900">
                  Table Status
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
                  {TABLE_STATUS.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.className}`}
                      />
                      <span className="whitespace-nowrap text-[11px] font-medium text-stone-800">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] bg-white px-4 pb-4 pt-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                <h3 className="mb-4 text-[18px] font-semibold tracking-tight text-stone-900">
                  Quick links
                </h3>

                <div className="grid grid-cols-3 gap-x-3 gap-y-4">
                  {MENU_LINKS.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="group flex flex-col items-center text-center"
                      >
                        <div className={quickActionClass}>
                          <Icon className="h-6 w-6 stroke-[1.7]" />
                        </div>
                        <span className="mt-2.5 text-[13px] font-medium leading-tight text-stone-800">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}

                  <button
                    type="button"
                    disabled={loggingOut || closingRestaurant || checkingClose}
                    onClick={handleDayCloseClick}
                    className="group flex flex-col items-center text-center disabled:opacity-50"
                  >
                    <div className={quickActionClass}>
                      {checkingClose ? (
                        <Loader2 className="h-6 w-6 animate-spin text-stone-800" />
                      ) : (
                        <Home className="h-6 w-6 stroke-[1.7] text-stone-800" />
                      )}
                    </div>
                    <span className="mt-2.5 text-[13px] font-medium leading-tight text-stone-800">
                      Day Close
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={loggingOut || closingRestaurant}
                    onClick={handleLogout}
                    className="group flex flex-col items-center text-center disabled:opacity-50"
                  >
                    <div className={quickActionClass}>
                      {loggingOut ? (
                        <Loader2 className="h-6 w-6 animate-spin text-stone-800" />
                      ) : (
                        <LogOut className="h-6 w-6 stroke-[1.7] text-stone-800" />
                      )}
                    </div>
                    <span className="mt-2.5 text-[13px] font-medium leading-tight text-stone-800">
                      Logout
                    </span>
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {ORDER_LINKS.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block py-3.5 text-center font-serif text-[17px] text-stone-900 transition-colors hover:bg-stone-50 ${
                      index > 0 ? "border-t border-stone-200" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile / small tablet primary nav */}
      <nav className="md:hidden flex items-center gap-1.5 overflow-x-auto px-3 pb-2.5 no-scrollbar">
        {PRIMARY_NAV.map((item) => {
          const active = navActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-orange-500 text-white"
                  : "bg-stone-200/70 text-stone-600"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <AlertDialog open={closeBlockedOpen} onOpenChange={setCloseBlockedOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Cannot close restaurant
            </AlertDialogTitle>
            <AlertDialogDescription>
              Settle every pending order and release every booked table before
              day close.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[50vh] space-y-3 overflow-y-auto">
            {closeBlockers?.pendingOrderCount > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <p className="text-sm font-semibold text-amber-950">
                  {closeBlockers.pendingOrderCount} pending order
                  {closeBlockers.pendingOrderCount === 1 ? "" : "s"}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(closeBlockers.pendingOrders || []).map((order) => (
                    <li
                      key={order.id}
                      className="text-[13px] text-amber-900"
                    >
                      #{order.orderNumber}
                      {order.tableNo ? ` · ${order.tableNo}` : ""}
                      {order.status ? ` · ${order.status}` : ""}
                    </li>
                  ))}
                </ul>
                {closeBlockers.pendingOrderCount >
                (closeBlockers.pendingOrders || []).length ? (
                  <p className="mt-1.5 text-xs text-amber-800">
                    +
                    {closeBlockers.pendingOrderCount -
                      closeBlockers.pendingOrders.length}{" "}
                    more on the Orders page
                  </p>
                ) : null}
              </div>
            ) : null}

            {closeBlockers?.bookedTableCount > 0 ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                <p className="text-sm font-semibold text-rose-950">
                  {closeBlockers.bookedTableCount} booked table
                  {closeBlockers.bookedTableCount === 1 ? "" : "s"}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(closeBlockers.bookedTables || []).map((table) => (
                    <li
                      key={table.sessionId}
                      className="text-[13px] text-rose-900"
                    >
                      Table {table.tableNumber}
                      {table.employeeName
                        ? ` · ${table.employeeName}`
                        : ""}
                      {table.guestCount
                        ? ` · ${table.guestCount} guests`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {closeBlockers?.pendingOrderCount > 0 ? (
              <Button asChild variant="outline">
                <Link
                  href="/sales/today"
                  onClick={() => setCloseBlockedOpen(false)}
                >
                  Go to Orders
                </Link>
              </Button>
            ) : null}
            {closeBlockers?.bookedTableCount > 0 ? (
              <Button
                asChild
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Link
                  href="/floor"
                  onClick={() => setCloseBlockedOpen(false)}
                >
                  Go to Floor
                </Link>
              </Button>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close restaurant?</AlertDialogTitle>
            <AlertDialogDescription>
              All pending orders are settled and all tables are free. Close the
              restaurant and log out all employees? Staff can clock back in later
              from the same registered device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingRestaurant}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCloseRestaurant();
              }}
              disabled={closingRestaurant}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Close Restaurant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {typeof document !== "undefined" &&
        (checkingClose || closingRestaurant) &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-zinc-950/80 px-10 py-8 shadow-2xl ring-1 ring-white/10">
              <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
              <div className="text-center">
                <p className="text-base font-bold text-white">
                  {closingRestaurant
                    ? "Closing restaurant"
                    : "Checking restaurant"}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-300">
                  {closingRestaurant
                    ? "Logging out all employees…"
                    : "Checking orders and tables…"}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
