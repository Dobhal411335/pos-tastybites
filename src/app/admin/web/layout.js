"use client";

import React, { useState } from "react";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { FooterBar } from "@/components/layout/FooterBar";

export default function UsersModuleLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sidebarGroups = [
    {
      title: "Web Admin",
      color: "bg-[#0F6B7A]",
      items: [
        { label: "Manage Banner", href: "/admin/web/manage-banners" },
        { label: "Banner Section 1st", href: "/admin/web/banner1st" },
        { label: "Banner Section 2nd", href: "/admin/web/banner2nd" },
        { label: "Banner Section 3rd", href: "/admin/web/banner3rd" },
        { label: "Navbar Section", href: "/admin/web/navbar-section" },
        { label: "Create WebPages", href: "/admin/web/create-webpages" },
        { label: "Manage WebPages", href: "/admin/web/manage-webpages" },
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

        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 sm:p-8 md:p-12">
          <div className="mx-auto max-w-360">
            {children}
          </div>
        </main>
      </div>
      <FooterBar />

    </div>
  );
}
