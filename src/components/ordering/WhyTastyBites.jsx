"use client";

import { Leaf, Clock3, MapPin, UtensilsCrossed } from "lucide-react";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";

const POINTS = [
  {
    icon: Leaf,
    title: "Made fresh",
    text: "Prepared to order with care — not sitting under a heat lamp.",
  },
  {
    icon: UtensilsCrossed,
    title: "Your way",
    text: "Choose sizes, add-ons, and extras that match how you like it.",
  },
  {
    icon: Clock3,
    title: "Same-day pickup",
    text: "Order online, pick a pickup time, and we’ll have it ready.",
  },
  {
    icon: MapPin,
    title: "Local restaurant",
    text: "Support your neighborhood kitchen — pay when you arrive.",
  },
];

export default function WhyTastyBites() {
  const { restaurant } = useRestaurantPublic();
  const brandName = restaurant?.name || "Tasty Bites";

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-8 py-14" aria-labelledby="why-heading">
      <div className="mb-10 space-y-2 max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Why us</p>
        <h2
          id="why-heading"
          className="text-3xl md:text-4xl font-[family-name:var(--font-display)] text-zinc-900"
        >
          Why {brandName}
        </h2>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Simple ordering, real food, and a pickup experience that respects your time.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="space-y-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="font-bold text-zinc-900 font-[family-name:var(--font-display)]">{title}</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
