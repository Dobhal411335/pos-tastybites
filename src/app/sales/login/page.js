"use client";

import React from "react";
import Link from "next/link";

export default function SalesLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Tasty Bites Sales</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to access floor operations.</p>
        </div>
        
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-[#1e40af]">
          <p>This is a placeholder for the specialized Sales login flow.</p>
          <p className="mt-2">
            Currently, please use the <Link href="/login" className="font-semibold underline">main login page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
