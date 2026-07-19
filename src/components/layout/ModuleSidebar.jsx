"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function ModuleSidebar({ groups = [] }) {
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState(() =>
    groups.reduce((acc, _, idx) => {
      acc[idx] = true;
      return acc;
    }, {})
  );

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
        <h2 className="text-[18px] font-bold text-zinc-900">
          Module Navigation
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500 font-medium">
          Manage module sections
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
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(groupIdx)}
                className="flex w-full items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      group.color || "bg-orange-500"
                    }`}
                  />

                  <span className="text-base font-semibold text-zinc-800">
                    {group.title}
                  </span>
                </div>

                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                )}
              </button>

              {/* Links */}
              {isOpen && (
                <div className="border-t border-zinc-100 py-2">
                  {group.items.map((item, index) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={index}
                        href={item.href}
                        className={`group mx-2 mb-1 flex items-center justify-between rounded-lg px-4 py-3 text-base transition-all duration-200 ${
                          active
                            ? "bg-orange-200 text-orange-600 font-semibold"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                      >
                        <span>{item.label}</span>

                        {active && (
                          <span className="h-2 w-2 rounded-full bg-orange-500" />
                        )}
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