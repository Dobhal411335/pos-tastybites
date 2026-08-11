"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Grid2X2, ShoppingBag, Printer, BellRing, Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DateTimeDisplay from "@/components/common/DateTimeDisplay";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
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

const NAV_ITEMS = [
  { label: "Floor", href: "/sales/floor", icon: Grid2X2 },
  { label: "Orders", href: "/sales/today", icon: ShoppingBag },
  { label: "Print Jobs", href: "/sales/print-jobs", icon: Printer },
  { label: "Notifications", href: "/sales/notifications", icon: BellRing },
];

function navActive(pathname, href) {
  if (href === "/sales/floor") {
    return pathname === "/sales/floor" || pathname?.startsWith("/sales/orders");
  }
  return pathname === href || pathname?.startsWith(href + "/");
}

export default function EmployeeTopNav({ onMenuToggle, employeeName = "Employee", employeeRole = "Server" }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [closingRestaurant, setClosingRestaurant] = React.useState(false);

  const handleLogout = async () => {
    if (loggingOut || closingRestaurant) return;
    setLoggingOut(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await employeeFetch("/api/employee/auth/logout", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        toast.success("Logged out successfully.");
      }
    } catch {
      toast.message("Signing out…");
    } finally {
      // Hard navigate so production always clears client state even if cookies/API glitch
      window.location.assign("/login");
    }
  };

  const handleCloseRestaurant = async () => {
    if (closingRestaurant || loggingOut) return;
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
        window.location.assign("/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
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
          {/* <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button> */}

          <Link href="/sales/floor" className="flex items-center gap-2.5 min-w-0">
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

        {/* CENTER — primary nav */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-1.5 min-w-0">
          {NAV_ITEMS.map((item) => {
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

        {/* RIGHT — time, bell, profile */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 ml-auto shrink-0">
          <div className="hidden lg:block">
            <DateTimeDisplay compact />
          </div>

          <NotificationBell viewAllHref="/sales/notifications" />

              <button
                type="button"
                className="flex items-center gap-2.5 rounded-xl border border-stone-500 bg-white px-2.5 py-1.5 hover:bg-stone-50 transition-colors max-w-[200px]"
              >
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-orange-600 text-white text-sm font-bold">
                    {employeeName?.charAt(0)?.toUpperCase() || "E"}
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="hidden sm:block leading-tight text-left min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">
                    {employeeName || "Employee"}
                  </p>
                  <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wide truncate">
                    {employeeRole}
                  </p>
                </div>
              </button>
          <Button
            variant="ghost"
            onClick={() => setConfirmCloseOpen(true)}
            disabled={loggingOut || closingRestaurant}
            className="relative z-50 h-10 px-2.5 sm:px-3 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white border border-zinc-950 shadow-none disabled:opacity-70"
            title="Close Restaurant"
          >
            <Store className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline text-xs font-bold">Close Restaurant</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={loggingOut || closingRestaurant}
            className="relative z-50 h-10 w-10 bg-red-600 text-white hover:bg-red-700 hover:text-white border border-red-800 shadow-none disabled:opacity-70"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile / small tablet primary nav */}
      <nav className="md:hidden flex items-center gap-1.5 overflow-x-auto px-3 pb-2.5 no-scrollbar">
        {NAV_ITEMS.map((item) => {
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

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close restaurant?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close the restaurant and log out all employees?
              Staff can clock back in later from the same registered device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingRestaurant}>Cancel</AlertDialogCancel>
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

      {closingRestaurant ? (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-black/60">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm font-semibold text-white">Logging out all employees…</p>
        </div>
      ) : null}
    </header>
  );
}
