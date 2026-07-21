"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/employee/create");
  }, [router]);
  return null;
}
