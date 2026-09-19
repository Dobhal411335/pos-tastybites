"use client";

import { BadgeCheck, Star } from "lucide-react";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";

const REVIEWS = [
  {
    quote:
      "Ordering online for pickup was effortless. Food was hot and ready right when we arrived — we’ll be back.",
    name: "Sarah M.",
    meta: "Local diner · Pickup regular",
  },
  {
    quote:
      "Customizing everyone’s meals took under two minutes. Same-day pickup is perfect for busy weeknights.",
    name: "David K.",
    meta: "Family orders · Exeter area",
  },
  {
    quote:
      "Fresh, made-to-order, and no delivery fees. Pay at the restaurant and you’re done. Best dinner decision.",
    name: "Elena R.",
    meta: "Verified pickup guest",
  },
];

export default function CustomerReviews() {
  const { restaurant } = useRestaurantPublic();
  const brandName = restaurant?.name || "Tasty Bites";

  return (
    <section className="w-full bg-[var(--customer-surface-low)] py-14">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="mb-8 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Community Voices
            </span>
            <h2 className="text-2xl font-extrabold text-[var(--customer-ink)] sm:text-3xl">
              What Our Customers Say
            </h2>
          </div>
          <span className="text-xs font-medium text-[var(--customer-muted)]">
            Guests who ordered online for pickup at {brandName}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {REVIEWS.map((review) => (
            <article
              key={review.name}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--border)]/20 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary" />
                  ))}
                </div>
                <p className="text-xs italic leading-relaxed text-[var(--customer-ink)] sm:text-sm">
                  “{review.quote}”
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)]/20 pt-2">
                <div>
                  <span className="block text-xs font-bold text-[var(--customer-ink)]">
                    {review.name}
                  </span>
                  <span className="text-[11px] text-[var(--customer-muted)]">
                    {review.meta}
                  </span>
                </div>
                <BadgeCheck className="h-[18px] w-[18px] text-primary" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
