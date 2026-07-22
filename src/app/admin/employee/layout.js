"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { FooterBar } from "@/components/layout/FooterBar";

export default function UsersModuleLayout({ children }) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      title: "Employee Management",
      color: "bg-[#0F6B7A]",
      items: [
        { label: "All Employees", href: "/admin/employee/lists" },
        { label: "Create Employee", href: "/admin/employee/create" },
        { label: "Roles & Permissions", href: "/admin/employee/roles" },
      ],
    },
    {
      title: "Workforce",
      color: "bg-[#1E3A8A]",
      items: [
        { label: "Shifts & Scheduling", href: "/admin/employee/shifts" },
        { label: "Table Assignment", href: "/admin/employee/table-assignment" },
        { label: "Device Assignment", href: "/admin/employee/device-assignment" },
      ],
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col antialiased text-[#1F2937] font-sans">

      <TopNavbar
        adminName={adminUser?.name}
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

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl bg-white border border-zinc-200 p-6 rounded-xl shadow-xs min-h-125">
            {children}
          </div>
        </main>
      </div>
      <FooterBar />

    </div>
  );
}
