"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import EmployeeSidebar from "@/components/employee/EmployeeSidebar";
import EmployeeTopNav from "@/components/employee/EmployeeTopNav";
import { Loader2 } from "lucide-react";
import { EmployeeFooter } from "@/components/employee/EmployeeFooter";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

export default function SalesMainLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [employeeUser, setEmployeeUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        if (data.success && data.data) {
          setEmployeeUser(data.data);
        } else {
          throw new Error("Unauthorized");
        }
      } catch (err) {
        router.replace("/login");
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
    <SocketProvider 
      employeeId={(employeeUser?.employee || employeeUser)?._id || (employeeUser?.employee || employeeUser)?.id}
      restaurantId={(employeeUser?.employee || employeeUser)?.restaurant}
    >
      <AuthProvider user={employeeUser?.employee || employeeUser}>
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col antialiased text-zinc-900 font-sans">
          <EmployeeTopNav
            employeeName={
              (employeeUser?.employee || employeeUser)?.firstName && (employeeUser?.employee || employeeUser)?.lastName
                ? `${(employeeUser?.employee || employeeUser).firstName} ${(employeeUser?.employee || employeeUser).lastName}`
                : (employeeUser?.employee || employeeUser)?.name || (employeeUser?.employee || employeeUser)?.firstName || ""
            }
            employeeRole={(employeeUser?.employee || employeeUser)?.role || "Server"}
            onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
          <div className="flex-1 flex overflow-hidden relative">
            <main className="flex-1 overflow-y-auto p-1">
              <div className="mx-auto max-w-8xl">
                {children}
              </div>
            </main>
          </div>
          <EmployeeFooter />
        </div>
      </AuthProvider>
    </SocketProvider>
  );
}
