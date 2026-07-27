"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import TopNavbar from "@/components/layout/TopNavbar";
import ModuleSidebar from "@/components/layout/ModuleSidebar";
import { FooterBar } from "@/components/layout/FooterBar";

export default function MenuModuleLayout({ children }) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isPrintPage = pathname?.includes("/print/");

    const sidebarGroups = [
        {
            title: "Create Discount",
            bgColorClass: "bg-blue-850",
            items: [
                { label: "Create Discount / Offer", href: "/admin/promotions/coupons" },
                { label: "Apply Discount / Offer", href: "/admin/promotions/discounts" },
                
            ],
        },
        {
            title: "Festive / Gift Card",
            bgColorClass: "bg-blue-850",
            items: [
                { label: "Create Festive Offer", href: "/admin/promotions/offers" },
                { label: "Create Tasty Bites Gift Card", href: "/admin/promotions/giftcards" },
            ],
        },
    ];

    return (
        <div className={`${isPrintPage ? "h-screen overflow-hidden" : "min-h-screen"} bg-[#FAF9F6] flex flex-col antialiased text-[#1F2937] font-sans`}>

            {/* Shared top navbar */}
            {!isPrintPage && (
                <TopNavbar
                    onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                />
            )}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Module Sidebar (Desktop) */}
                {!isPrintPage && (
                    <div className="hidden md:block">
                        <ModuleSidebar groups={sidebarGroups} />
                    </div>
                )}

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
                {isPrintPage ? (
                    <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-gray-200">
                        {children}
                    </main>
                ) : (
                    <main className="flex-1 overflow-y-auto p-8">
                        <div className="mx-auto max-w-6xl bg-white border border-[#ECECEC] p-6 sm:p-10 rounded-xl shadow-xs min-h-125">
                            {children}
                        </div>
                    </main>
                )}
            </div>

            {!isPrintPage && <FooterBar />}
        </div>
    );
}
