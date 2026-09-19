"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";

export default function PromotionsSection() {
  const { restaurant } = useRestaurantPublic();
  const lastMinute = restaurant?.promotions?.lastMinuteDeal;
  const promo = restaurant?.promotions?.promoBanner;
  const more = restaurant?.promotions?.moreOffers;

  const title =
    lastMinute?.heading || more?.title || "Special offer";
  const body =
    lastMinute?.description || promo?.description || more?.description || "";
  const hasPromo = Boolean(
    lastMinute?.heading ||
      lastMinute?.description ||
      promo?.description ||
      more?.title ||
      more?.description
  );

  if (!hasPromo) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-8 py-10">
      <div className="rounded-2xl bg-zinc-950 text-white px-6 py-10 md:px-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Offer</p>
          <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-display)]">{title}</h2>
          {body && <p className="text-sm text-zinc-300 leading-relaxed">{body}</p>}
        </div>
        <Button
          asChild
          className="bg-primary hover:bg-primary-hover text-white h-12 px-8 text-xs font-bold uppercase tracking-widest shrink-0"
        >
          <Link href="/menu">Order Now</Link>
        </Button>
      </div>
    </section>
  );
}
