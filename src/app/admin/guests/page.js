"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuestsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/guests/detail");
  }, [router]);
  return null;
}
