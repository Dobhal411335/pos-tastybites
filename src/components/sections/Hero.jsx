"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Store, Star } from "lucide-react";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import { usePublicMenu } from "@/hooks/usePublicMenu";
import { lowestMenuPrice } from "@/lib/public/landingMenu";
import { productImageSrc } from "@/lib/public/productImage";

export default function Hero() {
  const { restaurant } = useRestaurantPublic();
  const { products, loading } = usePublicMenu();
  const brandName = restaurant?.name || "Tasty Bites";
  const fromPrice = lowestMenuPrice(products);

  const heroProduct =
    products.find(
      (p) => p.available !== false && p.imageUrl && !String(p.image || "").includes("BannerImage")
    ) || products.find((p) => p.available !== false);

  return (
    <section className="relative w-full overflow-hidden bg-[var(--customer-surface)] py-10 lg:py-20">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="z-10 flex flex-col items-start gap-4 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
              <Leaf className="h-4 w-4" />
              <span>Fresh · Local · Made to Order</span>
            </div>

            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--customer-ink)] sm:text-5xl lg:text-[56px]">
              Good Food, Ready for Pickup.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[var(--customer-muted)] sm:text-lg">
              Freshly prepared favorites from {brandName}, made to order for
              same-day restaurant pickup. Pay when you arrive.
            </p>

            <div className="flex w-full flex-wrap items-center gap-4 pt-2 sm:w-auto">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
              >
                <span>Order Online</span>
                <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
              <Link
                href="#browse-menu"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)]/30 bg-white px-5 py-3.5 text-sm font-semibold text-[var(--customer-ink)] shadow-sm transition-all hover:bg-[var(--customer-surface-container)]"
              >
                <span>View Menu</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-medium text-[var(--customer-muted)]">
              <div className="flex items-center gap-1">
                <Star className="h-[18px] w-[18px] fill-primary text-primary" />
                <span className="font-bold text-[var(--customer-ink)]">Same-day pickup</span>
                <span>· Pay at restaurant</span>
              </div>
              <span className="hidden text-[var(--border)] sm:inline">•</span>
              <div className="flex items-center gap-1">
                <Store className="h-[18px] w-[18px] text-primary" />
                <span>
                  Pickup only —{" "}
                  <strong className="font-semibold text-[var(--customer-ink)]">
                    no delivery
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-8 lg:col-span-5 lg:mt-0">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--customer-surface-container)] shadow-xl sm:aspect-[5/4]">
              {heroProduct ? (
                <Image
                  src={"/burger.jpg"}
                  alt={heroProduct.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover object-center"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--customer-muted)]">
                  Menu coming soon
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/30 via-transparent to-transparent" />
            </div>

            <div className="absolute -bottom-5 -left-3 flex max-w-[280px] items-center gap-3 rounded-xl border border-[var(--border)]/20 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md sm:left-4">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Store className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2.5 w-2.5 animate-ping rounded-full bg-primary" />
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-primary" />
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Pickup
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--customer-muted)]">
                    Same day
                  </span>
                </div>
                <span className="truncate text-[13px] font-bold text-[var(--customer-ink)]">
                  Ready at the restaurant
                </span>
                <span className="text-[10px] text-[var(--customer-muted)]">
                  Order online · Pay when you arrive
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
