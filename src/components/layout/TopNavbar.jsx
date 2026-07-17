"use client";

import React from "react";
import Link from "next/link";
import { LogOut, Menu, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function TopNavbar({ onMenuToggle, adminName }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Logged out successfully.");
        router.replace("/admin/login");
      }
    } catch (err) {
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-zinc-200 bg-white">
      <div className="flex h-full items-center justify-between px-4 md:px-6">

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
            <span className="text-lg md:text-2xl font-bold tracking-tight text-zinc-900">
              TASTY BITES
            </span>

            <span className="hidden sm:inline-flex rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-orange-600">
              Admin
            </span>
          </Link>

        </div>

        {/* Right */}
        <div className="flex items-center gap-1 md:gap-4">

          <span className="hidden lg:block text-sm text-zinc-500">
            Welcome, <span className="font-medium text-zinc-900">{adminName}</span>
          </span>

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="md:hidden"
          >
            <Link href="/admin/dashboard">
              <Home className="h-5 w-5" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className="hidden md:flex gap-2"
          >
            <Link href="/admin/dashboard">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            onClick={handleLogout}
            size="icon"
            className="md:hidden text-red-600"
          >
            <LogOut className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="hidden md:flex gap-2 text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>

        </div>

      </div>
    </header>
  );
}
