"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Utensils, Receipt, CheckCircle, XCircle, BarChart3 } from "lucide-react";

export default function EmployeeSidebar() {
  const pathname = usePathname();

  const groups = [
    {
      title: "Point of Sale",
      color: "bg-orange-500",
      items: [
        { label: "Create Order", href: "/employee/orders/create", icon: Utensils },
        { label: "Today Order List", href: "/employee/orders/today", icon: Receipt },
        { label: "Total Sale Record", href: "/employee/sales", icon: BarChart3 },
        { label: "Confirm Order", href: "/employee/orders/confirm", icon: CheckCircle },
        { label: "Cancel Order", href: "/employee/orders/cancel", icon: XCircle },
      ],
    },
  ];

  const [openGroups, setOpenGroups] = useState({ 0: true });

  const toggleGroup = (idx) => {
    setOpenGroups((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <aside className="w-72 shrink-0 border-r border-zinc-200 bg-white h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-zinc-900">
          Staff Dashboard
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Restaurant Order Management
        </p>
      </div>

      {/* Navigation */}
      <div className="p-4 space-y-5">
        {groups.map((group, groupIdx) => {
          const isOpen = openGroups[groupIdx];

          return (
            <div
              key={groupIdx}
              className="rounded-xl border border-zinc-200 overflow-hidden bg-white shadow-sm"
            >
              <button
                onClick={() => toggleGroup(groupIdx)}
                className="flex w-full items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${group.color}`} />
                  <span className="text-sm font-semibold text-zinc-800">
                    {group.title}
                  </span>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
              </button>

              {isOpen && (
                <div className="border-t border-zinc-100 py-2">
                  {group.items.map((item, index) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    return (
                      <Link
                        key={index}
                        href={item.href}
                        className={`group mx-2 mb-1 flex items-center justify-between rounded-lg px-4 py-3 text-sm transition-all duration-200 ${
                          active
                            ? "bg-orange-50 text-orange-600 font-semibold"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${active ? "text-orange-500" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                          <span>{item.label}</span>
                        </div>
                        {active && <span className="h-2 w-2 rounded-full bg-orange-500" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
