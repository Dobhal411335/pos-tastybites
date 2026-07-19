"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Simply redirect /admin directly to /admin/login by default
    router.replace("/employee/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-serif text-[#1F2937]">
      Redirecting to login...
    </div>
  );
}
