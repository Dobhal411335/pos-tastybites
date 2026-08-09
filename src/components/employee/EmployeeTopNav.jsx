"use client";

import React from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DateTimeDisplay from "@/components/common/DateTimeDisplay";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import NotificationBell from "@/components/common/NotificationBell";

export default function EmployeeTopNav({ onMenuToggle, employeeName = "Employee", employeeRole = "Server" }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/employee/auth/logout", { method: "POST" });
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
    <header className="sticky top-0 z-40 h-16 border-b border-stone-200 bg-[#F7F7F7] shadow-sm">
      <div className="grid h-full grid-cols-[minmax(0,300px)_1fr_auto] items-center px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/sales/floor" className="flex items-center gap-3 min-w-0">
            <Image
              src="/BannerImage.png"
              alt="Logo"
              width={140}
              height={50}
              className="object-contain"
              priority
            />
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-700 hover:bg-orange-100 uppercase tracking-wider hidden sm:inline-flex"
            >
              Staff POS
            </Badge>
          </Link>
        </div>

        <div className="hidden lg:flex justify-center">
          <DateTimeDisplay />
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <NotificationBell viewAllHref="/sales/notifications" />

          <Link
            href="/sales/floor"
            className="group hidden xl:flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2 shadow-sm transition-all duration-200 hover:border-orange-300 hover:bg-orange-50 hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 transition-colors group-hover:bg-orange-500">
              <LayoutDashboard className="h-5 w-5 text-orange-600 group-hover:text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] uppercase tracking-wide text-stone-500">
                Navigation
              </p>
              <p className="text-sm font-semibold text-stone-900">
                Back to Dashboard
              </p>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2 shadow-sm">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-orange-600 text-white text-base font-bold">
                {employeeName?.charAt(0)?.toUpperCase() || "E"}
              </div>
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-stone-900">
                {employeeName || "Employee"}
              </p>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                {employeeRole}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="lg:hidden text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
          </Button>

          <Button
            variant="default"
            onClick={handleLogout}
            className="hidden lg:flex bg-red-500 hover:bg-red-600 text-white items-center gap-2 rounded-xl px-5 h-11"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
