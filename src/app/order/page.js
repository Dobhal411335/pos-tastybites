"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TrackOrderLookupPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    const ticket = String(orderNumber || "").trim().replace(/^#/, "");

    if (!ticket) {
      setError("Enter your order number from the confirmation email or receipt.");
      return;
    }

    setError("");
    router.push(`/order/${encodeURIComponent(ticket)}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--customer-surface)] text-[var(--customer-ink)]">
      <Navbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-12 sm:px-8">
        <div className="mb-8 flex flex-col items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-primary">
            <PackageSearch className="h-6 w-6" />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            Pickup status
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Track your order
          </h1>
          <p className="text-sm text-[var(--customer-muted)]">
            Enter your order number to see live kitchen status for your pickup.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-[var(--border)]/40 bg-white p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="track-order-number">Order number</Label>
            <Input
              id="track-order-number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. 0021"
              className="h-11"
              autoComplete="off"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            type="submit"
            className="h-11 w-full bg-primary text-xs font-bold uppercase tracking-widest text-white hover:bg-primary-hover"
          >
            Track Order
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--customer-muted)]">
          Need to place a new order?{" "}
          <Link href="/menu" className="font-semibold text-primary hover:underline">
            Browse the menu
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
