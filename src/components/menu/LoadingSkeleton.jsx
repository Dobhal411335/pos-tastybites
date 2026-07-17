"use client";

import React from "react";

export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div
          key={idx}
          className="flex flex-col justify-between rounded-xl bg-white border border-[#ECECEC] shadow-sm overflow-hidden h-[360px] animate-pulse"
        >
          {/* Mock Image */}
          <div className="w-full h-[200px] bg-zinc-150"></div>

          {/* Mock Content */}
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-zinc-150 rounded-sm w-3/4"></div>
              <div className="space-y-1">
                <div className="h-3 bg-zinc-150 rounded-sm w-full"></div>
                <div className="h-3 bg-zinc-150 rounded-sm w-5/6"></div>
              </div>
            </div>

            {/* Mock Action */}
            <div className="pt-3 border-t border-[#ECECEC] flex items-center justify-between gap-4">
              <div className="h-5 bg-zinc-150 rounded-sm w-12"></div>
              <div className="h-9 bg-zinc-150 rounded-sm w-20"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
