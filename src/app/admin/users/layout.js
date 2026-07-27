"use client";

import React, { useState } from "react";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { FooterBar } from "@/components/layout/FooterBar";

export default function TaxModuleLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sidebarGroups = [
    {
      title: "User Management",
      color: "bg-[#12A594]",
      items: [
        { label: "Admin Users", href: "/admin/users" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col antialiased text-[#1F2937] font-sans">

      <TopNavbar
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <div className="hidden md:block">
          <ModuleSidebar groups={sidebarGroups} />
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative flex w-64 max-w-xs flex-col bg-zinc-900">
              <ModuleSidebar groups={sidebarGroups} />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 sm:p-8 md:p-12">
          <div className="mx-auto max-w-5xl bg-white border border-zinc-200 p-6 sm:p-10 rounded-xl shadow-xs min-h-125">
            {children}
          </div>
        </main>
      </div>
      <FooterBar />

    </div>
  );
}
