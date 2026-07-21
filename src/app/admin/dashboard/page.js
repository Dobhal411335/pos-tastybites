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
  LogOut,
  DollarSign,
  ClipboardList,
  TrendingUp,
  ArrowUpRight,
  CalendarDays,
  Plus,
  Tag,
  Users,
  Package,
  BookOpen,
  CreditCard,
  Store,
  CircleDot,
  ArrowRight,
  UserCircle,
  Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { PALETTE } from "@/utils/paletteeColor";
import DateTimeDisplay from "@/components/common/DateTimeDisplay";
import NotificationBell from "@/components/common/NotificationBell";

// --- Mock Data for Charts ---
const revenueData = [
  { time: "8AM", val: 100 }, { time: "10AM", val: 300 },
  { time: "12PM", val: 800 }, { time: "2PM", val: 650 },
  { time: "4PM", val: 900 }, { time: "6PM", val: 1250 },
];
const orderData = [
  { time: "8AM", val: 5 }, { time: "10AM", val: 12 },
  { time: "12PM", val: 35 }, { time: "2PM", val: 20 },
  { time: "4PM", val: 18 }, { time: "6PM", val: 84 },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        if (data.success && data.data) {
          setAdminUser(data.data);
        } else {
          throw new Error("Unauthorized");
        }
      } catch (err) {
        if (err.message === "Unauthorized") {
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
        window.location.href = "/admin/login";
      }
    } catch (err) {
      toast.error("Logout failed. Please try again.");
    }
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 antialiased font-sans">

      {/* ──────────────────────────────────────────
          HEADER (Glassmorphic)
         ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#F7F6F3]/95 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-360 items-center justify-between px-6 lg:px-8">

          {/* Left */}
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <div className="relative w-48">
                <Image
                  src="/BannerImage.png"
                  alt="Logo"
                  height={200}
                  width={300}
                  priority
                  className="object-contain"
                />
              </div>
            </Link>
 
            <div className="hidden lg:block h-8 w-px bg-stone-300" />

            <div className="hidden lg:flex flex-col">
              <span className="text-sm font-semibold text-zinc-900">
                Restaurant Dashboard
              </span>

              <span className="text-xs text-zinc-500">
                Manage your restaurant operations
              </span>
            </div>
          </div>

          {/* Center */}
          <div className="hidden xl:flex">
            <DateTimeDisplay />
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">

            <NotificationBell />

            <div className="hidden lg:flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <UserCircle className="h-5 w-5 text-orange-600" />
              </div>

              <div className="leading-tight">
                <p className="text-xs text-zinc-500">
                  Administrator
                </p>

                <p className="text-sm font-semibold text-zinc-900">
                  {adminUser?.name || "System Admin"}
                </p>
              </div>

              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Online
              </Badge>

            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="h-10 border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>

          </div>

        </div>
      </header>

      {/* ──────────────────────────────────────────
          MAIN CONTENT
         ────────────────────────────────────────── */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-360 mx-auto px-8 py-12 space-y-12">

          {/* WELCOME BANNER */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-50 text-blue-700 border-none px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-sm">
                  Dashboard Overview
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 drop-shadow-sm">
                Good {today.getHours() < 12 ? "Morning" : today.getHours() < 17 ? "Afternoon" : "Evening"}, {adminUser?.name?.split(' ')[0] || "Admin"}
              </h1>
              <div className="flex items-center gap-3 pt-2 text-slate-500 font-medium text-sm">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                {formattedDate}
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mx-1"></span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <CircleDot className="w-3.5 h-3.5 animate-pulse" />
                  Restaurant Online
                </span>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────
              PREMIUM KPI CARDS WITH CHARTS
             ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Orders KPI */}
            <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden relative group">
              <CardContent className="p-8 pb-4">
                <div className="flex justify-between items-start z-10 relative">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 font-bold tracking-wide uppercase text-xs mb-3">
                      <ClipboardList className="w-4 h-4 text-orange-500" /> Today&apos;s Volume
                    </div>
                    <div className="text-5xl font-black text-slate-900 tracking-tighter">84</div>
                    <div className="flex items-center gap-2 mt-3 text-sm font-bold text-emerald-600 bg-emerald-50 w-max px-2.5 py-1 rounded-lg">
                      <TrendingUp className="w-4 h-4" /> +12% from yesterday
                    </div>
                  </div>

                  {/* Miniature Chart in Header */}
                  <div className="w-60 h-30">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={orderData}>
                        <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                          {orderData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === orderData.length - 1 ? "#F97316" : "#FED7AA"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">New</div>
                    <div className="text-slate-900 font-bold">4</div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Pending</div>
                    <div className="text-orange-600 font-bold">35</div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Confirmed</div>
                    <div className="text-emerald-600 font-bold">45</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue KPI */}
            <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden relative group">
              <CardContent className="p-8 pb-4">
                <div className="flex justify-between items-start z-10 relative">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 font-bold tracking-wide uppercase text-xs mb-3">
                      <DollarSign className="w-4 h-4 text-emerald-500" /> Today&apos;s Revenue
                    </div>
                    <div className="text-5xl font-black text-slate-900 tracking-tighter">$1,250</div>
                    <div className="flex items-center gap-2 mt-3 text-sm font-bold text-emerald-600 bg-emerald-50 w-max px-2.5 py-1 rounded-lg">
                      <TrendingUp className="w-4 h-4" /> +8% from yesterday
                    </div>
                  </div>

                  {/* Miniature Area Chart */}
                  <div className="w-35 h-15 translate-y-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Taxes</div>
                    <div className="text-slate-900 font-bold">$162.50</div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Avg Order</div>
                    <div className="text-blue-600 font-bold">$14.88</div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Tips</div>
                    <div className="text-emerald-600 font-bold">$42.00</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ──────────────────────────────────────────
              CORE MODULES (Bento Grid Style)
             ────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">Core Modules</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <ModuleCard
                href="/admin/menu" icon={UtensilsCrossed}
                color="orange" title="Menu Manager" stat="20 Categories"
                desc="Curate your menu items, set pricing, and manage special offers."
              />
              <ModuleCard
                href="/admin/orders" icon={ShoppingCart}
                color="blue" title="Order Tracking" stat="Live Orders"
                desc="Monitor kitchen tickets, track delivery dispatch, and review history."
              />
              <ModuleCard
                href="/admin/employee" icon={Users}
                color="indigo" title="Staff Portal" stat="6 Active"
                desc="Manage schedules, roles, permissions, and payroll data."
              />
              <ModuleCard
                href="/admin/reports" icon={BarChart3}
                color="emerald" title="Analytics" stat="Real-time"
                desc="Deep dive into sales metrics, performance graphs, and tax exports."
              />
              <ModuleCard
                href="/admin/guests" icon={UserSearch}
                color="rose" title="Guest Directory" stat="CRM"
                desc="Track guest preferences, order history, and loyalty programs."
              />
              <ModuleCard
                href="/admin/stock" icon={Boxes}
                color="amber" title="Inventory" stat="Stock Alerts"
                desc="Monitor ingredient levels and automated supplier purchase orders."
              />
            </div>
          </section>

          {/* ──────────────────────────────────────────
              RESTAURANT OPERATIONS
             ────────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6">Restaurant Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ModuleCard href="/admin/billing/admin" icon={Receipt} color="indigo" title="Admin Billing" stat="Invoices" desc="Manage administrator billing records and payment tracking." />
              <ModuleCard href="/admin/billing/server" icon={CreditCard} color="blue" title="Server Billing" stat="Records" desc="Review server-processed billing records." />
              <ModuleCard href="/admin/orders/online" icon={Globe} color="emerald" title="Online Orders" stat="Active" desc="Track and manage orders placed through the online system." />
              <ModuleCard href="/admin/orders/staff" icon={ChefHat} color="orange" title="Staff Orders" stat="Queue" desc="Monitor internal staff meal orders and kitchen prep queue." />
              <ModuleCard href="/admin/users" icon={UserCheck} color="rose" title="Admin Users" stat="Admins" desc="Configure master administrators and owner credentials." />
              <ModuleCard href="/admin/floor-plan" icon={LayoutGrid} color="amber" title="Floor Management" stat="Tables" desc="View and manage restaurant table layout and seating status." />
              <ModuleCard href="/admin/devices" icon={Tablet} color="indigo" title="Device Setup" stat="Tablets" desc="Register and manage POS tablets and hardware devices." />
            </div>
          </section>

          {/* ──────────────────────────────────────────
              QUICK ACTIONS
             ────────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ModuleCard href="/admin/orders" icon={ClipboardList} color="blue" title="New Order" stat="Start" desc="Start a new food order for dine-in, takeaway, or delivery." />
              <ModuleCard href="/admin/tax" icon={Percent} color="amber" title="Configure Tax" stat="Rules" desc="Set up tax rates, exemptions, and regional settings." />
              <ModuleCard href="/admin/emails" icon={Mail} color="emerald" title="Promotions" stat="Active" desc="Send promotional emails and manage marketing campaigns." />
              <ModuleCard href="/admin/web" icon={Store} color="blue" title="Web Console" stat="Settings" desc="Manage your restaurant website and SEO settings." />
              <ModuleCard href="/admin/stock" icon={Boxes} color="emerald" title="Stock Control" stat="Alerts" desc="Monitor low stock alerts, reorder points, and supplier inventory." />
              <ModuleCard onClick={handleLogout} icon={LogOut} color="rose" title="Sign Out" stat="Action" desc="Log out of the admin panel and return to the login screen." actionLabel="Sign Out" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS (Pro Max Styled)
   ───────────────────────────────────────────────────────────────────── */

/**
 * Module Card — Large Bento Box style
 */
function ModuleCard({ href, icon: Icon, color, title, stat, desc, onClick, actionLabel = "Access Module" }) {
  const colorMap = {
    orange: "text-orange-600 bg-orange-100 group-hover:bg-orange-600",
    blue: "text-blue-600 bg-blue-100 group-hover:bg-blue-600",
    indigo: "text-indigo-600 bg-indigo-100 group-hover:bg-indigo-600",
    emerald: "text-emerald-600 bg-emerald-100 group-hover:bg-emerald-600",
    rose: "text-rose-600 bg-rose-100 group-hover:bg-rose-600",
    amber: "text-amber-600 bg-amber-100 group-hover:bg-amber-600",
  };

  const textHoverMap = {
    orange: "group-hover:text-orange-50",
    blue: "group-hover:text-blue-50",
    indigo: "group-hover:text-indigo-50",
    emerald: "group-hover:text-emerald-50",
    rose: "group-hover:text-rose-50",
    amber: "group-hover:text-amber-50",
  };

  const Inner = (
    <Card className="bg-white border border-slate-200/60 rounded-2xl h-full transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 relative overflow-hidden text-left w-full cursor-pointer">
      {/* Subtle hover gradient background */}
      <div className="absolute inset-0 bg-linear-to-br from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />

      <CardContent className="p-8 relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${colorMap[color]}`}>
            <Icon className={`w-7 h-7 transition-colors duration-300 ${textHoverMap[color] || 'group-hover:text-white'}`} />
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold tracking-wide uppercase text-[10px] px-2.5 py-1">
            {stat}
          </Badge>
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 font-medium text-sm leading-relaxed flex-1">
          {desc}
        </p>

        <div className="mt-6 flex items-center text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
          {actionLabel}
          <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </CardContent>
    </Card>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block group outline-none h-full w-full">
        {Inner}
      </button>
    );
  }

  return (
    <Link href={href} className="block group outline-none h-full">
      {Inner}
    </Link>
  );
}
