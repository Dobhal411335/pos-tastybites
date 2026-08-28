"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  ChefHat,
  Wine,
  Users,
  Package,
  BarChart3,
  Printer,
  Settings,
  Monitor,
  Wifi,
  WifiOff,
  Database,
  Server,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "counter", label: "Counter / Bar", icon: Wine },
  { id: "employees", label: "Employees", icon: Users },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "printer", label: "Printer Settings", icon: Printer },
  { id: "settings", label: "Settings", icon: Settings },
];

const STATUS_CARDS = [
  { label: "Web POS", status: "Connected", connected: true },
  { label: "Backend", status: "Placeholder", connected: null },
  { label: "Socket.IO", status: "Placeholder", connected: null },
  { label: "Printer", status: "Not Connected", connected: false },
  { label: "Database", status: "Connected", connected: true },
];

const CAPABILITIES = [
  "Thermal Printing",
  "Cash Drawer",
  "Barcode Scanner",
  "Offline Mode",
];

function StatusIndicator({ connected }) {
  if (connected === true) {
    return <Wifi className="h-4 w-4 text-emerald-500" />;
  }
  if (connected === false) {
    return <WifiOff className="h-4 w-4 text-red-400" />;
  }
  return <Server className="h-4 w-4 text-amber-500" />;
}

export default function ElectronPreviewPage() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const activeLabel =
    NAV_ITEMS.find((item) => item.id === activeSection)?.label ?? "Dashboard";

  return (
    <div className="flex h-dvh bg-[#FAFAFA] text-zinc-900 antialiased">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="flex items-center gap-2.5 border-b border-zinc-200 px-4 py-4">
          <Image
            src="/icons/POS.png"
            alt="Tasty Bites POS"
            width={32}
            height={32}
            className="rounded-md"
          />
          <div>
            <p className="text-sm font-semibold leading-tight">Tasty Bites</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              POS Desktop
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeSection === id
                      ? "bg-orange-50 text-orange-600"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-zinc-200 p-3">
          <Button variant="outline" size="sm" className="w-full text-xs" asChild>
            <Link href="/sales/login">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open Web Sales POS
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Electron POS Preview
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Section: <span className="font-medium text-zinc-700">{activeLabel}</span>
              {" · "}
              Placeholder only
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Monitor className="h-4 w-4" />
            {typeof window !== "undefined" && window.electronPOS?.isDesktop
              ? "Desktop Shell Active"
              : "Web Browser"}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Status cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {STATUS_CARDS.map(({ label, status, connected }) => (
              <Card key={label} className="border-zinc-200 shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs font-medium text-zinc-500">{label}</p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-semibold",
                        connected === true && "text-emerald-600",
                        connected === false && "text-red-500",
                        connected === null && "text-amber-600",
                      )}
                    >
                      {status}
                    </p>
                  </div>
                  <StatusIndicator connected={connected} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Active section placeholder */}
          <Card className="mb-8 border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{activeLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">
                This is a placeholder section for{" "}
                <span className="font-medium text-zinc-700">{activeLabel}</span>.
                Real functionality will be integrated in a future Electron phase.
              </p>
            </CardContent>
          </Card>

          {/* Desktop capabilities */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Desktop POS Capabilities
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map((capability) => (
                <Card
                  key={capability}
                  className="border-dashed border-zinc-300 bg-zinc-50/50 shadow-none"
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <Database className="h-5 w-5 shrink-0 text-zinc-300" />
                    <div>
                      <p className="text-sm font-medium text-zinc-700">
                        {capability}
                      </p>
                      <p className="text-xs text-zinc-400">Coming Soon</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
