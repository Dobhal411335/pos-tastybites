"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PromotionsModuleIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/promotions/coupons");
  }, [router]);

  return null;
}