
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FloorPlanRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/employee/lists");
  }, [router]);
  return null;
}
