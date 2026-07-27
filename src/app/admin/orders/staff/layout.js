"use client";

import React, { useState } from "react";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { FooterBar } from "@/components/layout/FooterBar";

export default function StaffOrderLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isPosPage = true;

  const sidebarGroups = [
    {
      title: "Staff Food Order",
      bgColorClass: "bg-blue-800", // Blue color for staff food order section
      items: [
        { label: "Create Order", href: "/admin/orders/staff/create" },
      ],
    },
  ];

  return (
    <div className={`${isPosPage ? "h-screen overflow-hidden" : "min-h-screen"} bg-[#FAF9F6] flex flex-col antialiased text-[#1F2937] font-sans`}>

      <TopNavbar
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <main className={`flex-1 flex flex-col bg-white ${isPosPage ? 'overflow-hidden' : 'overflow-y-auto p-6 sm:p-8'}`}>
          <div className={`mx-auto w-full ${isPosPage ? 'flex-1 h-full max-w-full' : 'max-w-7xl'}`}>
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
