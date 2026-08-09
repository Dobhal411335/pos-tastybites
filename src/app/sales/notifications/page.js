"use client";

import React from "react";
import { ArrowLeft, BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push("/sales/floor")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <BellRing className="w-6 h-6 text-orange-500" /> Notifications
          </h1>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500">
          <p>No new notifications.</p>
        </div>
      </div>
    </div>
  );
}
