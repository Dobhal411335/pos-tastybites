"use client";

import Image from "next/image";
import Link from "next/link";
import { Award, Leaf, MapPin, Utensils } from "lucide-react";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import { usePublicMenu } from "@/hooks/usePublicMenu";
import { productImageSrc } from "@/lib/public/productImage";

export default function RestaurantStory() {
  const { restaurant } = useRestaurantPublic();
  const { products } = usePublicMenu();
  const brandName = restaurant?.name || "Tasty Bites";
  const address = restaurant?.address || "Exeter, ON";

  const storyImage =
    products.find(
      (p) => p.available !== false && p.imageUrl && !String(p.image || "").includes("BannerImage")
    ) || null;

  return (
    <section
      className="w-full bg-[var(--customer-surface-low)] py-14"
      id="our-story"
    >
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg">
              {storyImage ? (
                <Image
                  src={"/restaurant.jpg"}
                  alt={`${brandName} kitchen`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[var(--customer-surface-container)] text-sm text-[var(--customer-muted)]">
                  {brandName}
                </div>
              )}
              <div className="absolute right-4 bottom-4 flex items-center gap-1.5 rounded-lg bg-white/90 px-3.5 py-1.5 text-[var(--customer-ink)] shadow-md backdrop-blur-md">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold">{address}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Our Story
              </span>
              <h2 className="mt-1 text-2xl font-extrabold text-[var(--customer-ink)] sm:text-3xl">
                Made With Care. Served With Passion.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-[var(--customer-muted)] sm:text-base">
              At {brandName}, every online order is prepared fresh for same-day
              pickup. Browse the menu, customize your meal, then collect it at
              the restaurant and pay when you arrive — simple, local, and made
              to order.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Award, label: "Made to order" },
                { icon: Leaf, label: "Fresh ingredients" },
                { icon: Utensils, label: "Pickup ready" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)]/20 bg-white p-3 text-center shadow-sm"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-bold text-[var(--customer-ink)]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--ink)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[var(--ink)]/90"
              >
                Order for Pickup
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
