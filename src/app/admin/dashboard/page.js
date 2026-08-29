"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/context/AdminContext";
import {
  UtensilsCrossed,
  BarChart3,
  ShoppingCart,
  UserSearch,
  Receipt,
  Globe,
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
  Printer,
  FileText,
  ShoppingBasket,
  ChevronsRight,
  ChevronDown,
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

/** Shortcuts shown beside Report Module */
const REPORT_SHORTCUTS = [
  {
    href: "/admin/reports/admin/eod",
    label: "End-of-Day (EOD) Report",
    icon: Printer,
  },
  {
    href: "/admin/reports/financial/orders",
    label: "Itemized Sales Report",
    icon: Printer,
    chevron: true,
  },
  {
    href: "/admin/tax/details",
    label: "Tax Details Section",
    icon: FileText,
  },
  {
    href: "/admin/floor-plan/new",
    label: "Create Floor Plan",
    icon: LayoutGrid,
    chevron: true,
  },
  {
    href: "/admin/reports/financial/tips",
    label: "Staff Tips / Gratuities",
    icon: Users,
  },
  {
    href: "/admin/menu/products",
    label: "Create Menu Product",
    icon: ShoppingBasket,
    chevron: true,
  },
];

/** Remaining quick links under Quick Links section */
const QUICK_ACTION_LINKS = [
  {
    href: "/admin/menu/categories",
    label: "Create Menu Category",
    icon: UtensilsCrossed,
  },
  {
    href: "/admin/tax",
    label: "Create Tax / Govt Fee",
    icon: Percent,
  },
  {
    href: "/admin/employee/lists",
    label: "Staff Portal All Employee",
    icon: Users,
  },
  {
    href: "/admin/reports/financial/invoices",
    label: "Today Order Invoices",
    icon: Receipt,
  },
  {
    href: "/admin/promotions/discounts",
    label: "Create Discount / Offer",
    icon: Tag,
  },
  {
    href: "/admin/employee/shifts",
    label: "Shifts & Scheduling",
    icon: CalendarDays,
  },
  {
    href: "/admin/reports/financial",
    label: "Total Sales Summary",
    icon: DollarSign,
  },
  {
    href: "/admin/promotions/offers",
    label: "Create Festive Offer",
    icon: Gift,
  },
  {
    href: "/admin/reports/employees",
    label: "Employee & Staff Reports Log",
    icon: ClipboardList,
  },
  {
    href: "/admin/promotions/giftcards",
    label: "Create Gift Card",
    icon: Gift,
  },
  {
    href: "/admin/giftcard/issue",
    label: "Issue GiftCard",
    icon: Gift,
  },
  {
    href: "/admin/stock/out",
    label: "Low Stock / Out-of-Stock Report",
    icon: Package,
  },
  {
    href: "/admin/reports/admin/audit",
    label: "Audit & Exception Reports",
    icon: FileText,
  },
  {
    href: "/admin/stock",
    label: "Stock Control / Inventory Management",
    icon: Boxes,
  },
  {
    href: "/admin/web",
    label: "Email Marketing",
    icon: Mail,
  },
];

/** All dashboard destinations (category views + legacy list) */
const DASHBOARD_QUICK_LINKS = [
  { href: "/admin/menu", label: "Create Menu", icon: UtensilsCrossed },
  { href: "/admin/floor-plan", label: "Floor Management", icon: LayoutGrid },
  { href: "/admin/employee", label: "Staff Portal", icon: Users },
  { href: "/admin/promotions", label: "Season Promotions", icon: Gift },
  { href: "/admin/giftcard", label: "Issue GiftCard", icon: Gift },
  { href: "/admin/tax", label: "Configure Tax And Fees", icon: Percent },
  { href: "/admin/users", label: "Master Admin Users", icon: UserPlus },
  { href: "/admin/settings", label: "System Settings", icon: Settings },
  { href: "/admin/stock", label: "Stock Control", icon: Boxes },
  { href: "/admin/web", label: "Web Console", icon: Globe },
  { href: "/admin/reports/guests", label: "Guest Directory", icon: UserSearch },
  {
    href: "/admin/reports/financial",
    label: "Financial & Accounting",
    icon: DollarSign,
  },
  {
    href: "/admin/reports/employees",
    label: "Employee & Staff Reports",
    icon: Users,
  },
  { href: "/admin/reports/admin", label: "Admin Reports", icon: ClipboardList },
  {
    href: "/admin/reports/inventory",
    label: "Inventory & Stock Reports",
    icon: Package,
  },
];

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
            <div className="space-y-10">
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
                </div>
              </section>

              {/* Report Module + report shortcuts */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-1">
                  <ModuleCard
                    onClick={() => setActiveCategory("reports")}
                    icon={BarChart3}
                    color="rose"
                    title="Report Module"
                    stat="Data"
                    desc="Guest, inventory, invoices, financial, and stock logs."
                    actionLabel="View Modules"
                  />
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                  {REPORT_SHORTCUTS.map((link) => (
                    <QuickLinkButton
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      icon={link.icon}
                      chevron={link.chevron}
                      tone="report"
                    />
                  ))}
                </div>
              </section>

              {/* Remaining quick links */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Boxes className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        Quick Links
                      </h2>
                      <p className="text-sm text-slate-500 font-medium">
                        Instant stock, menu, floor, and staff updates.
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {QUICK_ACTION_LINKS.map((link, index) => (
                    <QuickLinkButton
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      icon={link.icon}
                      highlight={index === 0}
                    />
                  ))}
                </div>
              </section>
            </div>
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
                    <ModuleCard
                      href="/admin/printers"
                      icon={Printer}
                      color="slate"
                      title="Printer Configuration"
                      stat="Hardware"
                      desc="Register kitchen, bar, and receipt printers by IP for the sales print queue."
                    />
                  </div>
                </section>
              )}
              {activeCategory === "quick" && (
                <section>
                  <h2 className="text-2xl font-black text-slate-900 mb-6">
                    Quick Actions And Useful
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <ModuleCard
                      href="/admin/stock"
                      icon={Boxes}
                      color="emerald"
                      title="Stock Control"
                      stat="Inventory"
                      desc="Quick stock adjustments, item additions, and batch tracking."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DASHBOARD_QUICK_LINKS.map((link) => (
                      <QuickLinkButton
                        key={link.href}
                        href={link.href}
                        label={link.label}
                        icon={link.icon}
                      />
                    ))}
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

function QuickLinkButton({
  href,
  label,
  icon: Icon,
  chevron = false,
  highlight = false,
  tone = "default",
}) {
  const isReport = tone === "report";

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl border px-4 py-5 text-left text-md font-bold transition-all duration-200 ${
        highlight
          ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/25 hover:bg-orange-600"
          : isReport
            ? "border-slate-200 bg-white text-slate-900 shadow-sm hover:border-rose-300 hover:bg-rose-50 hover:shadow-md"
            : "border-slate-200 bg-white text-slate-900 shadow-sm hover:border-orange-300 hover:bg-orange-50 hover:shadow-md"
      }`}
    >
      {Icon ? (
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            highlight
              ? "bg-white/20 text-white"
              : isReport
                ? "bg-rose-100 text-rose-600 group-hover:bg-rose-200"
                : "bg-slate-100 text-slate-700 group-hover:bg-orange-100 group-hover:text-orange-600"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <span className="flex-1 leading-snug">{label}</span>
      {chevron ? (
        <ChevronsRight
          className={`h-4 w-4 shrink-0 ${
            highlight ? "text-white/80" : "text-slate-400 group-hover:text-orange-500"
          }`}
        />
      ) : (
        <ArrowRight
          className={`h-4 w-4 shrink-0 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 ${
            highlight ? "text-white opacity-100" : "text-slate-400"
          }`}
        />
      )}
    </Link>
  );
}

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
