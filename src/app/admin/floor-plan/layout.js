"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { Toaster } from "sonner";
import { FooterBar } from "@/components/layout/FooterBar";

export default function TablesModuleLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if we are in the floor plan editor
  const isEditor = pathname?.includes("/admin/floor-plan/floor/") && pathname !== "/admin/floor-plan/floor";

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error("Unauthorized");
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

  const sidebarGroups = [
    {
      title: "Create Table",
      color: "bg-[#1e40af]",
      items: [
        { label: "Create Table", href: "/admin/floor-plan/new" },
        { label: "Create Floor", href: "/admin/floor-plan/floor" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col antialiased text-[#1F2937] font-sans">
      <Toaster position="top-right" richColors />

      <TopNavbar
        adminName={adminUser?.name}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {!isEditor && (
          <div className="hidden md:block">
            <ModuleSidebar groups={sidebarGroups} />
          </div>
        )}

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative flex w-64 max-w-xs flex-col bg-zinc-900">
              <ModuleSidebar groups={sidebarGroups} />
            </div>
          </div>
        )}

        {isEditor ? (
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-5xl bg-white border border-zinc-200 p-6 sm:p-10 rounded-xl shadow-xs">
              {children}
            </div>
          </main>
        )}
      </div>
      <FooterBar />

    </div>
  );
}
