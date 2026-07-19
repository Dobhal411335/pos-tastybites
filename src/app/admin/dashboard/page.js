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
  DollarSign,
  ClipboardList,
  TrendingUp,
  ArrowUpRight,
  CalendarDays,
  Plus,
  Tag,
  Users,
  Package,
  Utensils,
  BookOpen,
  CreditCard,
  Store,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";

/* ─────────────────────────────────────────────────
   shadcn/ui components used in this page:
   - Card, CardContent, CardHeader, CardTitle, CardFooter
   - Button
   - Badge
   ───────────────────────────────────────────────── */

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

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAFAFA", color: "#18181B" }}>
      <Toaster position="top-right" richColors />

      {/* ═══════════════════════════════════════════════════════
          TOP BAR
          64px, white, clean, enterprise
         ═══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div className="h-16 max-w-[1440px] mx-auto flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <span className="text-[20px] font-bold tracking-tight" style={{ color: "#18181B" }}>
              Tasty Bites
            </span>
            <Badge
              className="border-none text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5"
              style={{ backgroundColor: "#FFF7ED", color: "#F97316" }}
            >
              Admin
            </Badge>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-[15px]" style={{ color: "#71717A" }}>
              {adminUser?.name || "Admin"}
            </span>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-[15px] font-medium gap-2 cursor-pointer"
              style={{ color: "#71717A" }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════════════════════ */}
      <main className="flex-1">
        <div className="max-w-[1440px] mx-auto px-8 py-10 space-y-10">

          {/* ──────────────────────────────────────────
              SECTION 1 — Welcome Header
             ────────────────────────────────────────── */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[40px] font-bold leading-tight" style={{ color: "#18181B" }}>
                Good {today.getHours() < 12 ? "Morning" : today.getHours() < 17 ? "Afternoon" : "Evening"},{" "}
                {adminUser?.name || "Admin"}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <CalendarDays className="w-4 h-4" style={{ color: "#71717A" }} />
                <span className="text-[15px]" style={{ color: "#71717A" }}>
                  {formattedDate}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CircleDot className="w-3 h-3" style={{ color: "#22C55E" }} />
              <span className="text-[15px] font-medium" style={{ color: "#22C55E" }}>
                Restaurant Open
              </span>
            </div>
          </div>

          {/* ──────────────────────────────────────────
              SECTION 2 — Two Large KPI Cards
             ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today's Orders */}
            <Card className="bg-white border-0 rounded-xl" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}>
              <CardContent className="p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[15px] font-medium" style={{ color: "#71717A" }}>
                      Today&apos;s Orders
                    </p>
                    <p className="text-[48px] font-bold leading-none mt-3 tabular-nums" style={{ color: "#18181B", fontVariantNumeric: "tabular-nums" }}>
                      84
                    </p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <TrendingUp className="w-4 h-4" style={{ color: "#22C55E" }} />
                      <span className="text-[14px] font-medium" style={{ color: "#22C55E" }}>
                        +12% vs yesterday
                      </span>
                    </div>
                  </div>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: "#FFF7ED" }}
                  >
                    <ClipboardList className="w-7 h-7" style={{ color: "#F97316" }} />
                  </div>
                </div>
                <div
                  className="mt-6 pt-5 flex items-center gap-4"
                  style={{ borderTop: "1px solid #E5E7EB" }}
                >
                  <Badge className="border-none text-[13px] font-semibold px-3 py-1" style={{ backgroundColor: "#FFF7ED", color: "#F97316" }}>
                    4 New
                  </Badge>
                  <Badge className="border-none text-[13px] font-semibold px-3 py-1" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
                    35 Pending
                  </Badge>
                  <Badge className="border-none text-[13px] font-semibold px-3 py-1" style={{ backgroundColor: "#F4F4F5", color: "#18181B" }}>
                    45 Confirmed
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Today's Revenue */}
            <Card className="bg-white border-0 rounded-xl" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}>
              <CardContent className="p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[15px] font-medium" style={{ color: "#71717A" }}>
                      Today&apos;s Revenue
                    </p>
                    <p className="text-[48px] font-bold leading-none mt-3" style={{ color: "#18181B", fontVariantNumeric: "tabular-nums" }}>
                      $1,250
                    </p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <TrendingUp className="w-4 h-4" style={{ color: "#22C55E" }} />
                      <span className="text-[14px] font-medium" style={{ color: "#22C55E" }}>
                        +8% vs yesterday
                      </span>
                    </div>
                  </div>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: "#F0FDF4" }}
                  >
                    <DollarSign className="w-7 h-7" style={{ color: "#15803D" }} />
                  </div>
                </div>
                <div
                  className="mt-6 pt-5 flex items-center gap-6"
                  style={{ borderTop: "1px solid #E5E7EB" }}
                >
                  <div>
                    <span className="text-[13px]" style={{ color: "#71717A" }}>Total Tax</span>
                    <span className="text-[15px] font-semibold ml-2" style={{ color: "#18181B", fontVariantNumeric: "tabular-nums" }}>$162.50</span>
                  </div>
                  <div style={{ width: "1px", height: "16px", backgroundColor: "#E5E7EB" }} />
                  <div>
                    <span className="text-[13px]" style={{ color: "#71717A" }}>Avg Order</span>
                    <span className="text-[15px] font-semibold ml-2" style={{ color: "#18181B", fontVariantNumeric: "tabular-nums" }}>$14.88</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ──────────────────────────────────────────
              SECTION 3 — Main Modules
             ────────────────────────────────────────── */}
          <section>
            <h2 className="text-[28px] font-bold mb-5" style={{ color: "#18181B" }}>
              Main Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <ModuleCard
                href="/admin/menu"
                icon={UtensilsCrossed}
                iconBg="#FFF7ED"
                iconColor="#F97316"
                title="Menu Management"
                stat="20 Categories · 65 Products"
                description="Manage food items, categories, pricing, offers, and special bundles."
                action="View Menu"
              />
              <ModuleCard
                href="/admin/orders"
                icon={ShoppingCart}
                iconBg="#FFF7ED"
                iconColor="#F97316"
                title="Food Orders"
                stat="84 Orders Today"
                description="Review active guest cart orders, cashier payments, and order tracking."
                action="View Orders"
              />
              <ModuleCard
                href="/admin/staff"
                icon={HeartHandshake}
                iconBg="#F0FDF4"
                iconColor="#15803D"
                title="Staff & Employees"
                stat="6 Active Staff"
                description="Monitor employee schedules, restaurant operations, and cashier logs."
                action="View Staff"
              />
              <ModuleCard
                href="/admin/reports"
                icon={BarChart3}
                iconBg="#EFF6FF"
                iconColor="#2563EB"
                title="Reports & Analytics"
                stat="Daily · Weekly · Monthly"
                description="Analyze sales statistics, billing summaries, and tax report outputs."
                action="View Reports"
              />
              <ModuleCard
                href="/admin/guests"
                icon={UserSearch}
                iconBg="#FFFBEB"
                iconColor="#D97706"
                title="Guest Records"
                stat="20 Guests Today"
                description="Maintain guest records, online reservations, and special feedback."
                action="View Guests"
              />
              <ModuleCard
                href="/admin/stock"
                icon={Boxes}
                iconBg="#F0FDF4"
                iconColor="#15803D"
                title="Inventory"
                stat="Stock Tracking"
                description="Track ingredient stock levels, low stock alerts, and supply orders."
                action="View Stock"
              />
            </div>
          </section>

          {/* ──────────────────────────────────────────
              SECTION 4 — Restaurant Operations
             ────────────────────────────────────────── */}
          <section>
            <h2 className="text-[28px] font-bold mb-5" style={{ color: "#18181B" }}>
              Restaurant Operations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <OperationCard
                href="/admin/billing/admin"
                icon={Receipt}
                iconBg="#F0FDF4"
                iconColor="#15803D"
                title="Admin Billing"
                stat="10"
                statLabel="invoices"
                description="Manage administrator billing records and payment tracking."
              />
              <OperationCard
                href="/admin/billing/server"
                icon={CreditCard}
                iconBg="#F5F3FF"
                iconColor="#7C3AED"
                title="Server Billing"
                stat="35"
                statLabel="invoices"
                description="Review server-processed billing records and transaction logs."
              />
              <OperationCard
                href="/admin/orders/online"
                icon={Globe}
                iconBg="#EFF6FF"
                iconColor="#2563EB"
                title="Online Orders"
                stat="10"
                statLabel="active"
                description="Track and manage orders placed through the online ordering system."
              />
              <OperationCard
                href="/admin/orders/staff"
                icon={ChefHat}
                iconBg="#FFF7ED"
                iconColor="#F97316"
                title="Staff Orders"
                stat="5"
                statLabel="orders"
                description="Monitor internal staff meal orders and kitchen preparation queue."
              />
              <OperationCard
                href="/admin/users"
                icon={UserCheck}
                iconBg="#F0FDFA"
                iconColor="#0D9488"
                title="Admin Users"
                stat="3"
                statLabel="admins"
                description="Configure master administrators and restaurant owner credentials."
              />
              <OperationCard
                href="/admin/tables"
                icon={TableProperties}
                iconBg="#F4F4F5"
                iconColor="#18181B"
                title="Table Management"
                stat="—"
                statLabel="tables"
                description="View and manage restaurant table layout, seating, and status."
              />
            </div>
          </section>

          {/* ──────────────────────────────────────────
              SECTION 5 — Quick Actions (Full-Width Operations Panel)
             ────────────────────────────────────────── */}
          <section>
            <h2 className="text-[28px] font-bold mb-5" style={{ color: "#18181B" }}>
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <OperationCard
                href="/admin/menu"
                icon={Plus}
                iconBg="#FFF7ED"
                iconColor="#F97316"
                title="Add Product"
                stat="+"
                statLabel="new"
                action="View Product"
                description="Create a new menu product with pricing, category, and availability."
              />
              <OperationCard
                href="/admin/menu"
                icon={Tag}
                iconBg="#EFF6FF"
                iconColor="#2563EB"
                title="Add Category"
                stat="+"
                statLabel="new"
                action="View Category"
                description="Add a new menu category to organize your food items and dishes."
              />
              <OperationCard
                href="/admin/menu"
                icon={BookOpen}
                iconBg="#FFF1F2"
                iconColor="#E11D48"
                title="Create Offer"
                stat="5"
                statLabel="active"
                action="Create Offer"
                description="Launch promotional offers, bundles, and limited-time discounts."
              />
              <OperationCard
                href="/admin/orders"
                icon={ClipboardList}
                iconBg="#FFFBEB"
                iconColor="#D97706"
                title="New Order"
                stat="84"
                statLabel="today"
                action="Start New Order"
                description="Start a new food order for dine-in, takeaway, or delivery service."
              />
              <OperationCard
                href="/admin/staff"
                icon={Users}
                iconBg="#F0FDF4"
                iconColor="#15803D"
                title="Add Employee"
                stat="6"
                statLabel="staff"
                action="Add Employee"
                description="Register a new employee with role, schedule, and access settings."
              />
              <OperationCard
                href="/admin/tax"
                icon={Percent}
                iconBg="#F5F3FF"
                iconColor="#7C3AED"
                title="Configure Tax"
                stat="—"
                statLabel="rules"
                action="Configure Tax"
                description="Set up tax rates, exemptions, and regional tax configurations."
              />
              <OperationCard
                href="/admin/tables"
                icon={LayoutGrid}
                iconBg="#F0FDFA"
                iconColor="#0D9488"
                title="Manage Tables"
                stat="—"
                statLabel="tables"
                action="Manage Tables"
                description="View and update table layout, seating capacity, and reservations."
              />
              <OperationCard
                href="/admin/stock"
                icon={Package}
                iconBg="#F4F4F5"
                iconColor="#18181B"
                title="Update Inventory"
                stat="—"
                statLabel="items"
                action="Update Inventory"
                description="Update stock levels, add new supply items, and track ingredients."
              />
              <OperationCard
                href="/admin/emails"
                icon={Mail}
                iconBg="#FFF7ED"
                iconColor="#F97316"
                title="Promotions"
                stat="—"
                statLabel="active"
                action="Promotions"
                description="Send promotional emails, manage campaigns, and track engagement."
              />
              <OperationCard
                href="/admin/web"
                icon={Store}
                iconBg="#F4F4F5"
                iconColor="#18181B"
                title="Web Console"
                stat="—"
                statLabel="settings"
                action="Web Console"
                description="Manage your restaurant website, online menu display, and SEO settings."
              />
              <OperationCard
                href="/admin/stock"
                icon={Boxes}
                iconBg="#F0FDF4"
                iconColor="#15803D"
                title="Stock Control"
                stat="—"
                statLabel="alerts"
                action="Stock Control"
                description="Monitor low stock alerts, reorder points, and supplier inventory."
              />

              {/* Sign Out card */}
              <button onClick={handleLogout} className="text-left w-full cursor-pointer group">
                <Card
                  className="bg-white border-0 rounded-xl h-full transition-shadow group-hover:shadow-md"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: "#FEF2F2" }}
                      >
                        <LogOut className="w-5 h-5" style={{ color: "#EF4444" }} />
                      </div>
                    </div>
                    <h3 className="text-[16px] font-bold mt-4" style={{ color: "#EF4444" }}>
                      Sign Out
                    </h3>
                    <p className="text-[14px] mt-1 leading-relaxed" style={{ color: "#71717A" }}>
                      Log out of the admin panel and return to the login screen.
                    </p>
                  </CardContent>
                </Card>
              </button>
            </div>
          </section>

        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════════════════════ */}
      <footer
        className="py-5 text-center text-[14px] text-white font-medium"
        style={{ backgroundColor: "#18181B" }}
      >
        &copy; {new Date().getFullYear()} Tasty Bites. All Rights Reserved.
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS — kept in same file (dashboard-specific)
   ───────────────────────────────────────────────────────────────────── */

/**
 * Module Card — Medium size
 * Icon · Title · Stat · Description · Footer action
 */
function ModuleCard({ href, icon: Icon, iconBg, iconColor, title, stat, description, action }) {
  return (
    <Link href={href} className="block group">
      <Card
        className="bg-white border-0 rounded-xl h-full transition-shadow group-hover:shadow-md"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}
      >
        <CardContent className="p-6 flex flex-col justify-between h-full min-h-[220px]">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: iconBg }}
              >
                <Icon className="w-6 h-6" style={{ color: iconColor }} />
              </div>
            </div>
            <h3 className="text-[18px] font-bold" style={{ color: "#18181B" }}>
              {title}
            </h3>
            <p className="text-[13px] font-semibold mt-1" style={{ color: "#F97316", fontVariantNumeric: "tabular-nums" }}>
              {stat}
            </p>
            <p className="text-[15px] mt-2 leading-relaxed" style={{ color: "#71717A" }}>
              {description}
            </p>
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid #E5E7EB" }}>
            <span className="inline-flex items-center gap-1 text-[14px] font-semibold group-hover:gap-2 transition-all" style={{ color: "#F97316" }}>
              {action}
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Operation Card — Small size
 * Icon · Title · Stat + Label · Description
 */
function OperationCard({ href, icon: Icon, iconBg, iconColor, title, stat, statLabel,action, description }) {
  return (
    <Link href={href} className="block group">
      <Card
        className="bg-white border-0 rounded-xl h-full transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}
      >
        <CardContent className="p-6 flex flex-col justify-between h-full min-h-[180px]">
          <div>
            <div className="flex items-start justify-between">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: iconBg }}
              >
                <Icon className="w-5 h-5" style={{ color: iconColor }} />
              </div>
              <div className="text-right">
                <span className="text-[28px] font-bold leading-none" style={{ color: "#18181B", fontVariantNumeric: "tabular-nums" }}>
                  {stat}
                </span>
                <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
                  {statLabel}
                </p>
              </div>
            </div>
            <h3 className="text-[16px] font-bold mt-4" style={{ color: "#18181B" }}>
              {title}
            </h3>
            <p className="text-[14px] mt-1 leading-relaxed" style={{ color: "#71717A" }}>
              {description}
            </p>
          </div>
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid #E5E7EB" }}>
            <span className="inline-flex items-center gap-1 text-[14px] font-semibold group-hover:gap-2 transition-all duration-200" style={{ color: "#F97316" }}>
              {action}
              <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}