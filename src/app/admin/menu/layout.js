"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { Loader2 } from "lucide-react";
import { FooterBar } from "@/components/layout/FooterBar";

export default function MenuModuleLayout({ children }) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authenticate user on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
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
      title: "Create Menu",
      bgColorClass: "bg-blue-800",
      items: [
        { label: "Menu Category", href: "/admin/menu/categories" },
        { label: "Create Product", href: "/admin/menu/products" },
        { label: "Create Festive Offer", href: "/admin/menu/offers" },
      ],
    },
    {
      title: "Create Discount",
      bgColorClass: "bg-blue-850",
      items: [
        { label: "Create Discount & Coupon", href: "/admin/menu/coupons" },
        { label: "Apply Discount / Offer", href: "/admin/menu/discounts" },
        { label: "Create Tasty Bites Gift Card", href: "/admin/menu/giftcards" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col antialiased text-[#1F2937] font-sans">
      
      {/* Shared top navbar */}
      <TopNavbar
        adminName={adminUser?.name}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Module Sidebar (Desktop) */}
        <div className="hidden md:block">
          <ModuleSidebar groups={sidebarGroups} />
        </div>

        {/* Left Module Sidebar (Mobile Drawer) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            <div className="relative flex w-64 max-w-xs flex-col bg-zinc-900 animate-slide-in-left">
              <ModuleSidebar groups={sidebarGroups} />
            </div>
          </div>
        )}

        {/* Right Content Viewport */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl bg-white border border-[#ECECEC] p-6 sm:p-10 rounded-xl shadow-xs min-h-[500px]">
            {children}
          </div>
        </main>
      </div>

      <FooterBar/>
    </div>
  );
}
