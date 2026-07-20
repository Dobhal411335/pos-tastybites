"use client";

import React from "react";
import Link from "next/link";
import { LogOut, Menu, Home, UserCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DateTimeDisplay from "@/components/common/DateTimeDisplay";
export default function TopNavbar({ onMenuToggle, adminName }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Logged out successfully.");
        router.replace("/login");
      }
    } catch (err) {
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-stone-200 bg-[#F7F7F7]">
  <div className="grid h-full grid-cols-[280px_1fr_auto] items-center px-5">

    {/* LEFT */}
    <div className="flex items-center gap-4">
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
          width={170}
          height={60}
          className="object-contain"
        />

        <span className="rounded-md bg-orange-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-orange-700">
          Admin
        </span>
      </Link>
    </div>

    {/* CENTER */}
    <div className="hidden lg:flex justify-center">
      <DateTimeDisplay />
    </div>

    {/* RIGHT */}
    <div className="flex items-center justify-end gap-3">

      <Link
        href="/admin/dashboard"
        className="group hidden xl:flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2 shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 group-hover:bg-orange-500">
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
        <UserCircle className="h-5 w-5 text-zinc-500" />

        <div className="leading-tight">
          <p className="text-xs text-zinc-500">
            Administrator
          </p>

          <p className="text-sm font-semibold text-zinc-900">
            {adminName || "Admin"}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="lg:hidden text-red-600"
      >
        <LogOut className="h-5 w-5" />
      </Button>

      <Button
        variant="destructive"
        onClick={handleLogout}
        className="hidden lg:flex h-12 gap-2 rounded-xl px-5 text-white bg-red-500 hover:bg-red-600"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>

    </div>

  </div>
</header>
  );
}
