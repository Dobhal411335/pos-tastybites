"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export const EmployeeFooter = () => {
  return (
    <footer className="mt-8 border-t border-zinc-800 bg-zinc-900">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-center px-6">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-[#F97316]"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </footer>
  );
};