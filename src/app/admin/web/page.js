"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsersIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/web/company-information");
  }, [router]);
  return null;
}
