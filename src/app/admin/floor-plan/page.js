"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FloorPlanRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/floor-plan/new");
  }, [router]);
  return null;
}
