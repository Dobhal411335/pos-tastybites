"use client";

import React from "react";
import Link from "next/link";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
    <header className="sticky top-0 z-40 h-16 border-b border-zinc-200 bg-white shadow-sm">
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

          <Link href="/employee/orders/create" className="flex items-center gap-2">
            <span className="text-lg md:text-2xl font-bold tracking-tight text-zinc-900">
              TASTY BITES
            </span>
            <span className="hidden sm:inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              Staff POS
            </span>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm text-zinc-600 border-r border-zinc-200 pr-4">
            <UserCircle className="h-5 w-5 text-zinc-400" />
            <span>Welcome, <span className="font-semibold text-zinc-900">{employeeName}</span></span>
          </div>

          <div className="hidden sm:block text-sm font-medium text-zinc-900 pr-4">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>

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
            className="hidden md:flex gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
