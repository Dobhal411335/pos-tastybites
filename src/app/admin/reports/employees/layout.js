"use client";

import React, { useState } from "react";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { FooterBar } from "@/components/layout/FooterBar";

const SIDEBAR_GROUPS = [
  {
    title: "Reports",
    color: "bg-orange-500",
    items: [

      { label: "Employee & Staff", href: "/admin/reports/employees" },
    ],
  },
];

export default function ReportsModuleLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col antialiased text-[#1F2937] font-sans">
      <TopNavbar onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      <div className="flex-1 flex overflow-hidden relative">
        <div className="hidden md:block">
          <ModuleSidebar groups={SIDEBAR_GROUPS} />
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex w-64 max-w-xs flex-col bg-zinc-900">
              <ModuleSidebar groups={SIDEBAR_GROUPS} />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <FooterBar />
    </div>
  );
}
