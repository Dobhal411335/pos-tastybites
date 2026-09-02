"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import EmployeeTopNav from "@/components/employee/EmployeeTopNav";
import { Loader2 } from "lucide-react";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { employeeFetch } from "@/lib/employeeFetch";
import { useEmployeeSessionRefresh } from "@/hooks/useEmployeeSessionRefresh";
import NotificationSoundPrompt from "@/components/common/NotificationSoundPrompt";
import ElectronPrintAgent from "@/components/printing/ElectronPrintAgent";

export default function SalesAppShell({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/sales/login" || pathname === "/login";
  const isFloorPage = pathname === "/floor";
  const isTodayOrdersPage = pathname === "/sales/today" || pathname === "/today";
  const lockViewport = isFloorPage || isTodayOrdersPage;
  const [employeeUser, setEmployeeUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(!isLoginPage);

  useEmployeeSessionRefresh({ enabled: !isLoginPage && !loading && Boolean(employeeUser) });

  useEffect(() => {
    if (isLoginPage) return;

    const verifyAuth = async () => {
      try {
        const res = await employeeFetch("/api/auth/me");
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        const user = data.data?.employee || data.data;
        if (data.success && user) {
          setEmployeeUser(user);
        } else {
          throw new Error("Unauthorized");
        }
      } catch (err) {
        window.location.assign("/sales/login");
      } finally {
        setLoading(false);
      }
    };
    verifyAuth();
  }, [pathname, isLoginPage]);

  const restaurantId = useMemo(() => {
    const user = employeeUser?.employee || employeeUser;
    const raw = user?.restaurant;
    if (!raw) return null;
    if (typeof raw === "string") return raw;
    if (typeof raw === "object") {
      return String(raw._id || raw.id || "") || null;
    }
    return String(raw);
  }, [employeeUser]);

  const employeeId = useMemo(() => {
    const user = employeeUser?.employee || employeeUser;
    return user?._id || user?.id || null;
  }, [employeeUser]);

  if (isLoginPage) {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <SocketProvider employeeId={employeeId} restaurantId={restaurantId}>
      <AuthProvider user={employeeUser?.employee || employeeUser}>
        <div className="h-dvh max-h-dvh overflow-hidden bg-[#FAFAFA] flex flex-col antialiased text-zinc-900 font-sans">
          <EmployeeTopNav
            employeeName={
              (employeeUser?.employee || employeeUser)?.firstName &&
              (employeeUser?.employee || employeeUser)?.lastName
                ? `${(employeeUser?.employee || employeeUser).firstName} ${(employeeUser?.employee || employeeUser).lastName}`
                : (employeeUser?.employee || employeeUser)?.name ||
                  (employeeUser?.employee || employeeUser)?.firstName ||
                  ""
            }
            employeeRole={(employeeUser?.employee || employeeUser)?.role || "Server"}
            onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
          <div className="flex-1 flex overflow-hidden relative min-h-0">
            <main
              className={`flex-1 min-h-0 ${lockViewport ? "overflow-hidden" : "overflow-y-auto"}`}
            >
              <div className="mx-auto max-w-8xl h-full min-h-0">{children}</div>
            </main>
          </div>
          <NotificationSoundPrompt />
          <ElectronPrintAgent />
        </div>
      </AuthProvider>
    </SocketProvider>
  );
}
