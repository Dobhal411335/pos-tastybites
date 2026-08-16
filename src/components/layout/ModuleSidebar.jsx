"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ChevronLeft, ChefHat } from "lucide-react";

export default function ModuleSidebar({ groups = [], defaultCollapsed = false }) {
  const pathname = usePathname();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(!defaultCollapsed);

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
    <aside className={`${isSidebarExpanded ? 'w-72' : 'w-18'} bg-white border-r border-zinc-200 flex flex-col transition-all duration-300 z-20 shrink-0 h-full relative`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-orange-500 text-white p-1.5 rounded-lg shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          {isSidebarExpanded && <span className="font-bold text-zinc-900 whitespace-nowrap">TastyBites</span>}
        </div>
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className="hover:bg-zinc-100 rounded-lg shrink-0 text-zinc-500"
        >
          <ChevronLeft className={`absolute bg-white border-2 rounded top-5 -right-3 w-6 h-6 transition-transform ${!isSidebarExpanded && 'rotate-180'} shadow-sm cursor-pointer hover:bg-zinc-50`} />
        </button>
      </div>
      {/* Navigation */}
      <div className={`p-4 space-y-5 flex-1 overflow-y-auto no-scrollbar ${!isSidebarExpanded ? 'px-2 flex flex-col gap-2 space-y-0' : ''}`}>
        {groups.map((group, groupIdx) => {
          const isOpen = openGroups[groupIdx];

          return (
            <div
              key={groupIdx}
              className={`${isSidebarExpanded ? 'rounded-xl border border-zinc-200 bg-white shadow-sm' : ''} overflow-hidden`}
            >
              {/* Group Header */}
              {isSidebarExpanded && (
                <button
                  onClick={() => toggleGroup(groupIdx)}
                  className="flex w-full items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${group.color || "bg-orange-500"
                        }`}
                    />

                    <span className="text-base font-semibold text-zinc-800 whitespace-nowrap truncate">
                      {group.title}
                    </span>
                  </div>

                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                  )}
                </button>
              )}

              {/* Links */}
              {(isOpen || !isSidebarExpanded) && (
                <div className={`${isSidebarExpanded ? 'border-t border-zinc-100 py-2' : 'flex flex-col gap-2'}`}>
                  {group.items.map((item, index) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname === item.href ||
                        pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={index}
                        href={item.href}
                        title={!isSidebarExpanded ? item.label : undefined}
                        className={`group flex items-center transition-all duration-200 ${isSidebarExpanded
                            ? 'mx-2 mb-1 justify-between rounded-lg px-4 py-3 text-base'
                            : 'justify-center mx-0 rounded-xl min-h-12 w-full text-lg'
                          } ${active
                            ? "bg-orange-100 text-orange-600 font-bold"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 font-semibold"
                          }`}
                      >
                        {isSidebarExpanded ? (
                          <div className="flex items-center gap-3">
                            {item.icon ? <item.icon className="w-5 h-5 shrink-0" /> : null}
                            <span>{item.label}</span>
                          </div>
                        ) : (
                          item.icon ? (
                            <item.icon className="w-5 h-5 shrink-0" />
                          ) : (
                            <span>{item.label.charAt(0)}</span>
                          )
                        )}

                        {active && isSidebarExpanded && (
                          <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
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