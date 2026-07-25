"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, ShoppingBag, Grid2X2, UtensilsCrossed, 
  BarChart3, UserCircle, ChefHat, ChevronLeft
} from "lucide-react";

export default function EmployeeSidebar() {
  const pathname = usePathname();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/employee/dashboard" },
    { icon: ShoppingBag, label: "Orders", href: "/employee/orders/history" },
    { icon: BarChart3, label: "Sales Report", href: "/employee/sales" },
    { icon: UserCircle, label: "Profile", href: "/employee/profile" },
  ];

  return (
    <aside 
      className={`${isSidebarExpanded ? 'w-55' : 'w-18'} bg-white border-r border-zinc-200 flex flex-col transition-all duration-300 z-20 shrink-0 h-full relative`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-orange-500 text-white p-1.5 rounded-lg shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          {isSidebarExpanded && <span className="font-bold text-zinc-900 whitespace-nowrap">TastyBites</span>}
        </div>
        <button 
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className="hover:bg-zinc-100 rounded-lg shrink-0 text-zinc-500"
        >
          <ChevronLeft className={`absolute bg-white border-2 rounded top-5 -right-3 w-6 h-6 transition-transform ${!isSidebarExpanded && 'rotate-180'}`} />
        </button>
      </div>

      <nav className="flex-1 py-4 px-2.5 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
        {navItems.map((item, idx) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={idx}
              href={item.href}
              className={`flex items-center gap-3 px-3 min-h-11 rounded-xl font-bold text-sm transition-colors ${
                active 
                  ? 'bg-orange-50 text-orange-600' 
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
              title={!isSidebarExpanded ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
