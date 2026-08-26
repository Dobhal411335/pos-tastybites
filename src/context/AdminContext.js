"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const AdminContext = createContext(null);

function isAdminLoginPath(pathname) {
  return pathname === "/admin/login" || pathname === "/login";
}

export function AdminProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [ready, setReady] = useState(false);
  const isLoginPage = isAdminLoginPath(pathname);

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }

    const init = async () => {
      try {
        // Run auth + company info fetch in parallel — single round trip per session
        const [authRes, companyRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/web/company-information"),
        ]);

        if (!authRes.ok) {
          router.replace("/admin/login");
          return;
        }

        const authData = await authRes.json();
        if (authData.success && authData.data) {
          setAdminUser(authData.data);
        } else {
          router.replace("/admin/login");
          return;
        }

        if (companyRes.ok) {
          const companyData = await companyRes.json();
          if (companyData.success && companyData.data) {
            setCompanyInfo(companyData.data);
          }
        }
      } catch {
        router.replace("/admin/login");
      } finally {
        setReady(true);
      }
    };

    init();
  }, [router, isLoginPage]);

  return (
    <AdminContext.Provider value={{ adminUser, companyInfo, ready }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};
