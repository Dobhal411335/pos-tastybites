"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  BarChart3,
  UserCheck,
  HeartHandshake,
  ShoppingCart,
  UserSearch,
  Receipt,
  Globe,
  ChefHat,
  Mail,
  Percent,
  Boxes,
  LayoutGrid,
  TableProperties,
  LogOut,
  Phone,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);

  // Authenticate user on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        const data = await res.json();
        if (data.success && data.data) {
          setAdminUser(data.data);
        } else {
          throw new Error("Unauthorized");
        }
      } catch (err) {
        if (err.message === "Unauthorized") {
          // Handled by proxy, but fallback
          router.replace("/admin/login");
        }
      }
    };
    verifyAuth();
  }, [router]);

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
    <div className="min-h-screen bg-[#FAF9F6] antialiased text-[#1F2937] font-sans flex flex-col justify-between">
      <Toaster position="top-right" richColors />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#ECECEC] bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 font-serif">
              TASTY BITES <span className="text-xs font-bold text-[#F97316] uppercase tracking-wider pl-2 border-l border-zinc-200">Admin</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6 text-xs uppercase tracking-widest font-bold text-zinc-500">
            <span>Welcome, {adminUser?.name || "Admin"}</span>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-zinc-500 hover:text-red-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 p-0 hover:bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Grid Dashboard */}
      <main className="grow mx-auto max-w-7xl w-full px-6 py-12 sm:px-8 space-y-12">
        
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#F97316]">
            Control Center
          </span>
          <h1 className="text-3xl md:text-4xl font-normal tracking-tight font-serif text-zinc-900">
            Operations Console
          </h1>
          <div className="w-12 h-[2px] bg-zinc-300"></div>
        </div>

        {/* Console Grid: Recreated layout from reference image */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Row 1, Card 1: Menu / Offer / Product Dashboard */}
          <Link href="/admin/menu" className="block group">
            <div className="bg-[#FEF3C7] border border-[#FDE68A] p-6 rounded-xl shadow-xs group-hover:shadow-md transition-all flex flex-col justify-between h-[230px]">
              <div className="flex justify-between items-start">
                <div className="p-3.5 bg-white rounded-full text-[#F97316] shadow-xs">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="bg-[#F97316] text-white text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">20 Menu</span>
                  <span className="bg-zinc-800 text-white text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">65 Product</span>
                  <span className="bg-white text-zinc-800 border border-zinc-200 text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">5 Offer</span>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-900">Menu / Offer / Product</h3>
                <p className="text-xs text-zinc-650 font-light leading-relaxed">
                  Manage menu items, prices, active special bundles, and food dishes.
                </p>
              </div>
            </div>
          </Link>

          {/* Row 1, Card 2: Report Dashboard */}
          <Link href="/admin/reports" className="block group">
            <div className="bg-[#E0F2FE] border border-[#BAE6FD] p-6 rounded-xl shadow-xs group-hover:shadow-md transition-all flex flex-col justify-between h-[230px]">
              <div className="flex justify-between items-start">
                <div className="p-3.5 bg-white rounded-full text-[#0F6B7A] shadow-xs">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <span className="text-[9px] font-bold text-[#0F6B7A] uppercase tracking-widest bg-white px-2 py-0.5 rounded">Reports</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-900">Report Dashboard</h3>
                <p className="text-xs text-zinc-650 font-light leading-relaxed">
                  Analyze restaurant sales statistics, billing sums, and tax outputs.
                </p>
              </div>
            </div>
          </Link>

          {/* Row 2, Card 3: Manage Admin User Dashboard */}
          <Link href="/admin/users" className="block group">
            <div className="bg-[#E0F7FA] border border-[#B2EBF2] p-6 rounded-xl shadow-xs group-hover:shadow-md transition-all flex flex-col justify-between h-[230px]">
              <div className="flex justify-between items-start">
                <div className="p-3.5 bg-white rounded-full text-cyan-750 shadow-xs">
                  <UserCheck className="h-6 w-6" />
                </div>
                <span className="bg-white text-zinc-800 text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-zinc-200">3 Users</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-900">Manage Admin Users</h3>
                <p className="text-xs text-zinc-650 font-light leading-relaxed">
                  Configure master administrators and restaurant owner credentials.
                </p>
              </div>
            </div>
          </Link>

          {/* Row 2, Card 4: Food Order Dashboard */}
          <Link href="/admin/orders" className="block group lg:col-span-2">
            <div className="bg-[#FFEDD5] border border-[#FED7AA] p-6 rounded-xl shadow-xs group-hover:shadow-md transition-all flex flex-col justify-between h-[230px]">
              <div className="flex justify-between items-start">
                <div className="p-3.5 bg-white rounded-full text-[#F97316] shadow-xs">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div className="flex gap-2">
                  <span className="bg-[#F97316] text-white text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">4 New</span>
                  <span className="bg-[#12A594] text-white text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">35 Pending</span>
                  <span className="bg-zinc-800 text-white text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">45 Confirm</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-6 border-t border-b border-orange-200/50 py-3 my-1 text-xs font-bold text-[#1F2937] uppercase tracking-wider">
                <span>Total Sale: $1,250.00</span>
                <span>Total Tax: $162.50</span>
                <span>Total Orders: 84</span>
              </div>

              <div className="space-y-1">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-900">Food Order Terminal</h3>
                <p className="text-xs text-zinc-650 font-light leading-relaxed">
                  Review active guest cart orders, cashier payments, and order tracking.
                </p>
              </div>
            </div>
          </Link>

          {/* Row 3, Card 5: Staff Welfare Dashboard */}
          <Link href="/admin/staff" className="block group">
            <div className="bg-[#1A1D20] border border-zinc-800 text-white p-6 rounded-xl shadow-xs group-hover:shadow-md transition-all flex flex-col justify-between h-[230px]">
              <div className="flex justify-between items-start">
                <div className="p-3.5 bg-white/10 rounded-full text-[#12A594] shadow-xs">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Active</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">Staff Welfare</h3>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  Monitor employee schedules, restaurant operations, and cashier logs.
                </p>
              </div>
            </div>
          </Link>

          {/* Row 3, Card 6: Guest Record Dashboard */}
          <Link href="/admin/guests" className="block group">
            <div className="bg-[#FEF3C7] border border-[#FDE68A] p-6 rounded-xl shadow-xs group-hover:shadow-md transition-all flex flex-col justify-between h-[230px]">
              <div className="flex justify-between items-start">
                <div className="p-3.5 bg-white rounded-full text-zinc-800 shadow-xs">
                  <UserSearch className="h-6 w-6" />
                </div>
                <span className="bg-[#F97316]/15 text-[#F97316] text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">20 Guest</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-900">Guest Record</h3>
                <p className="text-xs text-zinc-650 font-light leading-relaxed">
                  Maintain guest tables records, online reservations, and special feedback.
                </p>
              </div>
            </div>
          </Link>

          {/* Row 3, Card 7: Billing Sub-Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            
            {/* Admin Billing */}
            <Link href="/admin/billing/admin" className="block group">
              <div className="bg-[#F0FDF4] border border-[#DCFCE7] p-5 rounded-xl flex items-center justify-between group-hover:shadow-md transition-all h-[108px]">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white border border-[#DCFCE7] rounded-full text-[#12A594]">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Admin Billing</span>
                </div>
                <span className="bg-[#12A594]/10 text-[#12A594] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">10 Count</span>
              </div>
            </Link>

            {/* Server Billing */}
            <Link href="/admin/billing/server" className="block group">
              <div className="bg-[#F5F3FF] border border-[#EDE9FE] p-5 rounded-xl flex items-center justify-between group-hover:shadow-md transition-all h-[108px]">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white border border-[#EDE9FE] rounded-full text-purple-600">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Server Billing</span>
                </div>
                <span className="bg-purple-500/10 text-purple-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">35 Count</span>
              </div>
            </Link>

            {/* Order Online */}
            <Link href="/admin/orders/online" className="block group">
              <div className="bg-[#ECFDF5] border border-[#D1FAE5] p-5 rounded-xl flex items-center justify-between group-hover:shadow-md transition-all h-[108px]">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white border border-[#D1FAE5] rounded-full text-emerald-700">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Order Online</span>
                </div>
                <span className="bg-[#B91C1C]/10 text-[#B91C1C] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">10 Count</span>
              </div>
            </Link>

            {/* Staff Order */}
            <Link href="/admin/orders/staff" className="block group">
              <div className="bg-[#FFF1F2] border border-[#FFE4E6] p-5 rounded-xl flex items-center justify-between group-hover:shadow-md transition-all h-[108px]">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white border border-[#FFE4E6] rounded-full text-rose-500">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Staff Order</span>
                </div>
                <span className="bg-[#B91C1C]/10 text-[#B91C1C] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">5 Count</span>
              </div>
            </Link>

          </div>

        </div>

        {/* Bottom Actions Quickbar */}
        <div className="border-t border-[#ECECEC] pt-12">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6B7280] block mb-6">
            Quick Actions
          </span>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Promo Emails */}
            <Link href="/admin/emails" className="block group">
              <div className="flex flex-col items-center justify-center p-6 bg-[#FFF7ED] border border-[#FFEDD5] group-hover:border-orange-300 rounded-xl space-y-3.5 text-center transition-all h-[115px] shadow-xs">
                <Mail className="h-5 w-5 text-[#F97316]" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-700">Promotions</span>
              </div>
            </Link>

            {/* Create Tax */}
            <Link href="/admin/tax" className="block group">
              <div className="flex flex-col items-center justify-center p-6 bg-[#F0FDF4] border border-[#DCFCE7] group-hover:border-green-300 rounded-xl space-y-3.5 text-center transition-all h-[115px] shadow-xs">
                <Percent className="h-5 w-5 text-[#12A594]" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-700">Create Tax</span>
              </div>
            </Link>

            {/* Stock Management */}
            <Link href="/admin/stock" className="block group">
              <div className="flex flex-col items-center justify-center p-6 bg-[#ECFDF5] border border-[#D1FAE5] group-hover:border-emerald-300 rounded-xl space-y-3.5 text-center transition-all h-[115px] shadow-xs">
                <Boxes className="h-5 w-5 text-[#12A594]" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-700">Stock Control</span>
              </div>
            </Link>

            {/* Web Dashboard */}
            <Link href="/admin/web" className="block group">
              <div className="flex flex-col items-center justify-center p-6 bg-[#F5F3FF] border border-[#EDE9FE] group-hover:border-purple-300 rounded-xl space-y-3.5 text-center transition-all h-[115px] shadow-xs">
                <LayoutGrid className="h-5 w-5 text-zinc-900" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-700">Console</span>
              </div>
            </Link>

            {/* Create Table */}
            <Link href="/admin/tables" className="block group">
              <div className="flex flex-col items-center justify-center p-6 bg-[#F0FDFA] border border-[#CCFBF1] group-hover:border-teal-300 rounded-xl space-y-3.5 text-center transition-all h-[115px] shadow-xs">
                <TableProperties className="h-5 w-5 text-zinc-550" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-700">Tables Grid</span>
              </div>
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex flex-col items-center justify-center p-6 bg-red-50 border border-red-100 hover:border-red-400 rounded-xl space-y-3.5 text-center transition-all h-[115px] shadow-xs cursor-pointer group"
            >
              <LogOut className="h-5 w-5 text-red-500 group-hover:scale-105 transition-transform" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-red-700">Logout</span>
            </button>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full bg-[#121416] text-white border-t border-zinc-800 py-6 text-center text-[10px] font-bold uppercase tracking-widest">
        <span>&copy; {new Date().getFullYear()} Tasty Bites. All Rights Reserved.</span>
      </footer>
    </div>
  );
}
