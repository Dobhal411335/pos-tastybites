"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Grid2X2, ShoppingBag, Printer, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DateTimeDisplay from "@/components/common/DateTimeDisplay";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import NotificationBell from "@/components/common/NotificationBell";
import { employeeFetch } from "@/lib/employeeFetch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const res = await employeeFetch("/api/employee/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Logged out successfully.");
        router.replace("/login");
      } else {
        router.replace("/login");
      }
    } catch (err) {
      toast.error("Logout failed.");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#F7F7F7]/95 backdrop-blur supports-backdrop-filter:bg-[#F7F7F7]/90">
      <div className="flex lg:h-14 xl:h-15 items-center gap-3 px-3 sm:px-5">
        {/* LEFT — brand */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

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
            size="icon"
            onClick={handleLogout}
            className="h-10 w-10 bg-red-600 text-white hover:bg-red-700 hover:text-white border border-red-800 shadow-none"
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
    </header>
  );
}
