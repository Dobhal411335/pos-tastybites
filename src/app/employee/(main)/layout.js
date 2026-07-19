"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import EmployeeSidebar from "@/components/employee/EmployeeSidebar";
import EmployeeTopNav from "@/components/employee/EmployeeTopNav";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

export default function EmployeeMainLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [employeeUser, setEmployeeUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/employee/auth/me");
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        if (data.success && data.data) {
          setEmployeeUser(data.data);
        } else {
          throw new Error("Unauthorized");
        }
      } catch (err) {
        router.replace("/employee/login");
      } finally {
        setLoading(false);
      }
    };
    verifyAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col antialiased text-zinc-900 font-sans">
      <Toaster position="top-right" richColors />
      
      <EmployeeTopNav
        employeeName={employeeUser?.name || employeeUser?.firstName || "Employee"}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <div className="hidden md:block">
          <EmployeeSidebar />
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative flex w-72 max-w-xs flex-col bg-white">
              <EmployeeSidebar />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
