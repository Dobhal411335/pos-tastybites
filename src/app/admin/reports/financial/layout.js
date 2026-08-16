"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { FooterBar } from "@/components/layout/FooterBar";
import { UtensilsCrossed } from "lucide-react";

export default function AdminBillingLayout({ children }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isPosPage = pathname === "/admin/billing/admin/create";

  const sidebarGroups = [
    {
      title: "Food Order Section",
      color: "bg-[#0052cc]", // Blue color for food order section
      items: [
        { label: "Food Order Admin", href: "/admin/billing/admin/create", icon: UtensilsCrossed },
        // { label: "Today Order List", href: "/admin/billing/admin/today", icon: CalendarClock },
      ],
    },
    
  ];

  return (
    <div className={`${isPosPage ? "h-screen overflow-hidden" : "min-h-screen"} bg-[#FAF9F6] flex flex-col antialiased text-[#1F2937] font-sans`}>
      
        <TopNavbar
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
      

      <div className="flex-1 flex overflow-hidden relative">
        {!isPosPage && (
          <div className="hidden md:block">
            <ModuleSidebar groups={sidebarGroups} defaultCollapsed={isPosPage} />
          </div>
        )}

        {!isPosPage && isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative flex w-64 max-w-xs flex-col bg-zinc-900">
              <ModuleSidebar groups={sidebarGroups} defaultCollapsed={isPosPage} />
            </div>
          </div>
        )}

        <main className={`flex-1 flex flex-col bg-white ${isPosPage ? 'overflow-hidden' : 'overflow-y-auto p-6 sm:p-8'}`}>
          <div className={`mx-auto w-full ${isPosPage ? 'flex-1 h-full max-w-full' : 'max-w-8xl'}`}>
            {children}
          </div>
        </main>
      </div>
      {!isPosPage && <FooterBar />}
    </div>
  );
}
