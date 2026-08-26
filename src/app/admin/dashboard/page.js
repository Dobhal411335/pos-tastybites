"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdmin } from "@/context/AdminContext";
import {
  UtensilsCrossed,
  BarChart3,
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
  TrendingDown,
  Loader2,
  ArrowUpRight,
  CalendarDays,
  Plus,
  Tag,
  Users,
  Package,
  BookOpen,
  Store,
  CircleDot,
  ArrowRight,
  UserCircle,
  Tablet,
  Settings,
  UserPlus,
  Gift,
  Edit,
  Database,
  PieChart,
  Coffee,
  Megaphone,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import DateTimeDisplay from "@/components/common/DateTimeDisplay";
import NotificationBell from "@/components/common/NotificationBell";

const EMPTY_CHART = [
  { time: "8AM", val: 0 },
  { time: "10AM", val: 0 },
  { time: "12PM", val: 0 },
  { time: "2PM", val: 0 },
  { time: "4PM", val: 0 },
  { time: "6PM", val: 0 },
];

const EMPTY_STATS = {
  volume: 0,
  newCount: 0,
  pending: 0,
  confirmed: 0,
  revenue: 0,
  taxes: 0,
  tips: 0,
  avgOrder: 0,
  volumeChange: 0,
  revenueChange: 0,
  orderChart: EMPTY_CHART,
  revenueChart: EMPTY_CHART,
};

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ChangeBadge({ value }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div
      className={`flex items-center gap-2 mt-3 text-sm font-bold w-max px-2.5 py-1 rounded-lg ${
        up ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
      }`}
    >
      <Icon className="w-4 h-4" />
      {up ? "+" : ""}
      {value}% from yesterday
    </div>
  );
}

export default function AdminDashboardPage() {
  const { adminUser } = useAdmin();
  const [activeCategory, setActiveCategory] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const res = await fetch("/api/orders/stats", {
          credentials: "include",
        });
        const json = await res.json();
        if (!cancelled && res.ok && json.success && json.data) {
          setStats({
            ...EMPTY_STATS,
            ...json.data,
            orderChart: json.data.orderChart?.length
              ? json.data.orderChart
              : EMPTY_CHART,
            revenueChart: json.data.revenueChart?.length
              ? json.data.revenueChart
              : EMPTY_CHART,
          });
        }
      } catch (err) {
        if (!cancelled) toast.error("Failed to load today's sales");
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

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
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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
                <p className="text-xs text-zinc-500">Administrator</p>

                <p className="text-sm font-semibold text-zinc-900">
                  {adminUser?.name || "System Admin"}
                </p>
              </div>

              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Online
              </Badge>
            </div>
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
                Good{" "}
                {today.getHours() < 12
                  ? "Morning"
                  : today.getHours() < 17
                    ? "Afternoon"
                    : "Evening"}
                , {adminUser?.name?.split(" ").slice(0, 2).join(" ") || ""}
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
                      <ClipboardList className="w-4 h-4 text-orange-500" />{" "}
                      Today&apos;s Volume
                    </div>
                    <div className="text-5xl font-black text-slate-900 tracking-tighter min-h-12 flex items-center">
                      {statsLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                      ) : (
                        stats.volume
                      )}
                    </div>
                    <ChangeBadge value={stats.volumeChange} />
                  </div>

                  <div className="w-60 h-30">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.orderChart}>
                        <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                          {stats.orderChart.map((entry, index) => (
                            <Cell
                              key={`cell-${entry.time}-${index}`}
                              fill={
                                index === stats.orderChart.length - 1
                                  ? "#F97316"
                                  : "#FED7AA"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">
                      New
                    </div>
                    <div className="text-slate-900 font-bold">
                      {stats.newCount}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">
                      Pending
                    </div>
                    <div className="text-orange-600 font-bold">
                      {stats.pending}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">
                      Confirmed
                    </div>
                    <div className="text-emerald-600 font-bold">
                      {stats.confirmed}
                    </div>
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
                      <DollarSign className="w-4 h-4 text-emerald-500" />{" "}
                      Today&apos;s Revenue
                    </div>
                    <div className="text-5xl font-black text-slate-900 tracking-tighter min-h-12 flex items-center">
                      {statsLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                      ) : (
                        formatMoney(stats.revenue)
                      )}
                    </div>
                    <ChangeBadge value={stats.revenueChange} />
                  </div>

                  <div className="w-35 h-15 translate-y-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.revenueChart}>
                        <defs>
                          <linearGradient
                            id="colorRev"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10B981"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10B981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="val"
                          stroke="#10B981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorRev)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">
                      Taxes
                    </div>
                    <div className="text-slate-900 font-bold">
                      {formatMoney(stats.taxes)}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">
                      Avg Order
                    </div>
                    <div className="text-blue-600 font-bold">
                      {formatMoney(stats.avgOrder)}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex-1">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">
                      Tips
                    </div>
                    <div className="text-emerald-600 font-bold">
                      {formatMoney(stats.tips)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ──────────────────────────────────────────
              DYNAMIC CATEGORY VIEW
             ────────────────────────────────────────── */}
          {!activeCategory ? (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  Dashboard Modules
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ModuleCard
                  onClick={() => setActiveCategory("core")}
                  icon={UtensilsCrossed}
                  color="orange"
                  title="Core Modules"
                  stat="Setup"
                  desc="Configure menu, floor plan, staff, taxes, and settings."
                  actionLabel="View Modules"
                />
                <ModuleCard
                  onClick={() => setActiveCategory("quick")}
                  icon={Boxes}
                  color="emerald"
                  title="Quick Actions"
                  stat="Fast"
                  desc="Instant stock, menu, floor, and staff updates."
                  actionLabel="View Modules"
                />
                <ModuleCard
                  onClick={() => setActiveCategory("web")}
                  icon={Globe}
                  color="blue"
                  title="Web Portal"
                  stat="Cloud"
                  desc="Secure cloud dashboard and remote reporting."
                  actionLabel="View Modules"
                />
                <ModuleCard
                  onClick={() => setActiveCategory("reports")}
                  icon={BarChart3}
                  color="rose"
                  title="Report Module"
                  stat="Data"
                  desc="Guest directory, sales, orders, payments, employees, and day closing."
                  actionLabel="View Modules"
                />
                <ModuleCard
                  onClick={handleLogout}
                  icon={LogOut}
                  color="rose"
                  title="Sign Out"
                  stat="Action"
                  desc="Log out of the admin panel and return to the login screen."
                  actionLabel="Sign Out"
                />
              </div>
            </section>
          ) : (
            <div>
              <Button
                variant="ghost"
                onClick={() => setActiveCategory(null)}
                className="mb-6 px-2 text-white hover:underline border bg-orange-500 hover:bg-orange-600 flex items-center gap-2 font-bold"
              >
                <ChevronLeft className="w-5 h-5" /> Back to Modules
              </Button>

              {activeCategory === "core" && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-900">
                      Core Modules Menu Series
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <ModuleCard
                      href="/admin/menu"
                      icon={UtensilsCrossed}
                      color="orange"
                      title="Create Menu"
                      stat="Configure"
                      desc="Configure categories, items, modifiers, pricing, and availability."
                    />
                    <ModuleCard
                      href="/admin/floor-plan"
                      icon={LayoutGrid}
                      color="amber"
                      title="Floor Management"
                      stat="Tables"
                      desc="Setup dining sections, table layouts, seating capacities, and status tracking."
                    />
                    <ModuleCard
                      href="/admin/employee"
                      icon={Users}
                      color="indigo"
                      title="Staff Portal"
                      stat="Employees"
                      desc="Manage employee profiles, access permissions, and designation matrices."
                    />
                    <ModuleCard
                      href="/admin/promotions"
                      icon={Gift}
                      color="rose"
                      title="Season Promotions"
                      stat="Offers"
                      desc="Setup promotional codes, percentage/flat discounts, and happy hour schedules."
                    />
                    <ModuleCard
                      href="/admin/giftcard"
                      icon={Gift}
                      color="rose"
                      title="Issue GiftCard"
                      stat="Offer"
                      desc="Issue or sell gift cards, track balances, and manage redemptions."
                    />
                    <ModuleCard
                      href="/admin/tax"
                      icon={Percent}
                      color="emerald"
                      title="Configure Tax And Fees"
                      stat="Tax"
                      desc="Define applicable tax slabs (GST/VAT), service charges, and additional surcharges."
                    />
                    <ModuleCard
                      href="/admin/users"
                      icon={UserPlus}
                      color="blue"
                      title="Master Admin Users"
                      stat="Admins"
                      desc="Setup super-admin accounts with system-wide configuration rights."
                    />
                    <ModuleCard
                      href="/admin/settings"
                      icon={Settings}
                      color="amber"
                      title="System Settings & Integrations"
                      stat="Setup"
                      desc="Configure payment gateways, hardware peripherals, and receipt templates."
                    />
                  </div>
                </section>
              )}
              {activeCategory === "quick" && (
                <section>
                  <h2 className="text-2xl font-black text-slate-900 mb-6">
                    Quick Actions And Useful
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ModuleCard
                      href="/admin/stock"
                      icon={Boxes}
                      color="emerald"
                      title="Stock Control"
                      stat="Inventory"
                      desc="Quick stock adjustments, item additions, and batch tracking."
                    />
                  </div>
                </section>
              )}
              {activeCategory === "web" && (
                <section>
                  <h2 className="text-2xl font-black text-slate-900 mb-6">
                    Web Portal / Useful Link
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ModuleCard
                      href="/admin/web"
                      icon={Store}
                      color="blue"
                      title="Web Console"
                      stat="Cloud"
                      desc="Direct secure link to the cloud management dashboard and remote reporting suite."
                    />
                  </div>
                </section>
              )}
              {activeCategory === "reports" && (
                <section>
                  <h2 className="text-2xl font-black text-slate-900 mb-6">
                    Report Module
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ModuleCard
                      href="/admin/reports/guests"
                      icon={UserSearch}
                      color="rose"
                      title="Guest Directory"
                      stat="Reports"
                      desc="Guest info, purchase history, and revenue from orders."
                    />
                    <ModuleCard
                      href="/admin/reports/financial"
                      icon={DollarSign}
                      color="emerald"
                      title="Financial & Accounting"
                      stat="Reports"
                      desc="Sales, payments, tax, tips, discounts, and day closing."
                    />
                    <ModuleCard
                      href="/admin/reports/employees"
                      icon={Users}
                      color="blue"
                      title="Employee & Staff"
                      stat="Reports"
                      desc="Staff performance, attendance, and labor reports."
                    />
                    <ModuleCard
                      href="/admin/reports/admin"
                      icon={ClipboardList}
                      color="indigo"
                      title="Admin Reports"
                      stat="Reports"
                      desc="Activity, revenue, daily summary, day closing, audit, and kitchen log."
                    />
                    <ModuleCard
                      href="/admin/reports/inventory"
                      icon={Package}
                      color="amber"
                      title="Inventory & Stock"
                      stat="Reports"
                      desc="Current stock, movements, top outgoing items, and low-stock alerts."
                    />
                  </div>
                </section>
              )}
            </div>
          )}
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
function ModuleCard({
  href,
  icon: Icon,
  color,
  title,
  stat,
  desc,
  onClick,
  actionLabel = "Access Module",
}) {
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
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${colorMap[color]}`}
          >
            <Icon
              className={`w-7 h-7 transition-colors duration-300 ${textHoverMap[color] || "group-hover:text-white"}`}
            />
          </div>
          <Badge
            variant="secondary"
            className="bg-slate-100 text-slate-600 font-bold tracking-wide uppercase text-[10px] px-2.5 py-1"
          >
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
      <button
        type="button"
        onClick={onClick}
        className="block group outline-none h-full w-full"
      >
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
