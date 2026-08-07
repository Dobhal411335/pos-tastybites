"use client";

import React from "react";

export default function SalesPaymentsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Payments</h1>
          <p className="text-sm text-zinc-500">Process and manage live table payments.</p>
        </div>
      </header>
      
      <div className="flex-1 overflow-auto bg-zinc-50 p-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          <p>Payment processing interface will be implemented here.</p>
        </div>
      </div>
    </div>
  );
}
