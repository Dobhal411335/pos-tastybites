"use client";

import React from "react";
import Link from "next/link";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DateTimeDisplay from "@/components/common/DateTimeDisplay";
import Image from "next/image";
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
    <header className="sticky top-0 z-40 h-16 border-b border-stone-200 bg-[#F7F7F7]">
      <div className="mx-auto flex h-full items-center justify-between px-4 lg:px-6">

        {/* Left */}
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
            className="flex items-center gap-2"
          >
            <div className="w-40 h-28 relative">
              <Image src="/BannerImage.png" alt="Logo" fill className="object-contain" priority />
            </div>
            <span className="hidden sm:inline-flex rounded bg-orange-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              Staff POS
            </span>
          </Link>
        </div>

        {/* Center */}
        <div className="hidden lg:flex">
          <DateTimeDisplay />
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">

          {/* Employee */}
      <div className="hidden md:flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
              <UserCircle className="h-8 w-8 text-zinc-500" />

            <div className="leading-tight">
              <p className="text-xs text-zinc-500">
                Logged in as
              </p>

              <p className="text-sm font-semibold text-zinc-900">
                {employeeName || "Employee"}
              </p>
            </div>
          </div>

          {/* Mobile Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="md:hidden text-red-600"
          >
            <LogOut className="h-5 w-5" />
          </Button>

          {/* Desktop Logout */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="hidden md:flex h-10 items-center gap-2 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>

        </div>

      </div>
    </header>
  );
}
