"use client";

import React from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DateTimeDisplay from "@/components/common/DateTimeDisplay";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
export default function EmployeeTopNav({ onMenuToggle, employeeName = "Employee" }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/employee/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Logged out successfully.");
        router.replace("/employee/login");
      } else {
        // Fallback clear if logout api fails
        router.replace("/employee/login");
      }
    } catch (err) {
      toast.error("Logout failed.");
      router.replace("/employee/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-stone-200 bg-[#F7F7F7] shadow-sm">
      <div className="grid h-full grid-cols-[300px_1fr_auto] items-center px-4 lg:px-6">

        {/* LEFT */}
        <div className="flex items-center gap-3">

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3"
          >
            <Image
              src="/BannerImage.png"
              alt="Logo"
              width={180}
              height={60}
              className="object-contain"
              priority
            />

            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 hover:bg-blue-100 uppercase tracking-wider"
            >
              Staff POS
            </Badge>
          </Link>

        </div>

        {/* CENTER */}
        <div className="hidden lg:flex justify-center">
          <DateTimeDisplay />
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-end gap-3">

          {/* Back */}
          <Link
            href="/admin/dashboard"
            className="group hidden xl:flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2 shadow-sm transition-all duration-200 hover:border-orange-300 hover:bg-orange-50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 transition-colors group-hover:bg-orange-500">
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

          {/* Employee */}
          <div className="hidden lg:flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2 shadow-sm">

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <UserCircle className="h-6 w-6 text-blue-600" />
            </div>

            <div className="leading-tight">
              <p className="text-xs text-stone-500">
                Logged in as
              </p>

              <p className="text-sm font-semibold text-stone-900">
                {employeeName || "Employee"}
              </p>
            </div>

          </div>

          {/* Mobile Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="lg:hidden text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
          </Button>

          {/* Desktop Logout */}
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="hidden lg:flex h-11 items-center gap-2 rounded-xl px-5"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>

        </div>

      </div>
    </header>
  );
}
