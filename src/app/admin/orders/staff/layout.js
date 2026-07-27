"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { FooterBar } from "@/components/layout/FooterBar";

export default function StaffOrderLayout({ children }) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isPosPage = true; // For now we assume this layout is only wrapping the create order page or we can check pathname

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
          router.replace("/login");
        }
      }
    };
    verifyAuth();
  }, [router]);

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
        adminName={adminUser?.name}
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
