"use client";

import Link from "next/link";
import { SlidersHorizontal, Store, UtensilsCrossed } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: UtensilsCrossed,
    title: "Choose Your Food",
    text: "Explore our menu and add the dishes you want for same-day pickup.",
  },
  {
    step: "02",
    icon: SlidersHorizontal,
    title: "Customize Your Order",
    text: "Pick sizes, add-ons, and extras so everything is made the way you like it.",
  },
  {
    step: "03",
    icon: Store,
    title: "Pick Up & Pay",
    text: "Collect your order at the restaurant and pay when you arrive. Pickup only — no delivery.",
  },
];

export default function PickupHowItWorks() {
  return (
    <section className="w-full bg-[var(--customer-surface)] py-14" aria-labelledby="how-heading">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Effortless Ordering
          </span>
          <h2
            id="how-heading"
            className="mt-1 text-2xl font-extrabold text-[var(--customer-ink)] sm:text-3xl"
          >
            How It Works
          </h2>
          <p className="text-sm text-[var(--customer-muted)]">
            Three simple steps from our kitchen to your hands — restaurant pickup only.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map(({ step, icon: Icon, title, text }) => (
            <div
              key={step}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--border)]/20 bg-white p-6 shadow-sm"
            >
              <span className="text-3xl font-black leading-none text-primary/40">
                {step}
              </span>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <h4 className="text-base font-bold text-[var(--customer-ink)]">
                  {title}
                </h4>
              </div>
              <p className="text-xs leading-relaxed text-[var(--customer-muted)]">
                {text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/menu"
            className="inline-flex h-12 items-center rounded-lg bg-primary px-8 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary-hover"
          >
            Start Pickup Order
          </Link>
        </div>
      </div>
    </section>
  );
}
