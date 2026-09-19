"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FinalOrderCta() {
  return (
    <section className="relative w-full overflow-hidden bg-[var(--customer-surface-low)] py-16">
      <div className="relative z-10 mx-auto max-w-[1320px] px-5 text-center lg:px-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span>Same-day pickup · Pay at the restaurant</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--customer-ink)] sm:text-4xl">
            Ready to Eat?
          </h2>
          <p className="max-w-lg text-sm text-[var(--customer-muted)] sm:text-base">
            Your next favorite meal is only a few clicks away — order online and
            pick it up fresh.
          </p>
          <div className="flex w-full flex-wrap items-center justify-center gap-3 pt-2 sm:w-auto">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-primary-hover"
            >
              <span>Order Online</span>
              <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="#browse-menu"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)]/30 bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--customer-ink)] shadow-sm transition-all hover:bg-[var(--customer-surface-container)]"
            >
              View Full Menu
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
