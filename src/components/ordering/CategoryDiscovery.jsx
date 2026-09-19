"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock3, LayoutGrid, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicMenu } from "@/hooks/usePublicMenu";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import { useCart } from "@/context/CartContext";
import OfferConfigModal from "@/components/menu/OfferConfigModal";
import {
  OFFER_CATEGORY,
  buildOfferCartModifier,
  buildOfferOptions,
  cleanOfferList,
  offerNeedsOptions,
} from "@/utils/offerDetails";
import { productImageSrc } from "@/lib/public/productImage";
import { toast } from "sonner";

function formatOfferTiming(offer) {
  const from = offer.validFrom ? new Date(offer.validFrom) : null;
  const to = offer.validTo ? new Date(offer.validTo) : null;
  const opts = { month: "short", day: "numeric", year: "numeric" };

  if (from && to) {
    return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`;
  }
  if (from) return `From ${from.toLocaleDateString(undefined, opts)}`;
  if (to) return `Until ${to.toLocaleDateString(undefined, opts)}`;
  return "Available now";
}

export default function CategoryDiscovery() {
  const { offers, loading } = usePublicMenu();
  const { restaurant } = useRestaurantPublic();
  const { addToCart } = useCart();
  const [activeOffer, setActiveOffer] = useState(null);

  const displayOffers = useMemo(() => offers.slice(0, 8), [offers]);

  const lastMinute = restaurant?.promotions?.lastMinuteDeal;
  const promo = restaurant?.promotions?.promoBanner;
  const more = restaurant?.promotions?.moreOffers;

  const addOfferDirect = (offer) => {
    const inclusions = cleanOfferList(offer.inclusions);
    const choices = cleanOfferList(offer.choices);
    const drinks = cleanOfferList(offer.drinks);
    const options = buildOfferOptions({ inclusions, choices, drinks });
    const modifier = buildOfferCartModifier({ inclusions, choices, drinks });
    const cartKey = `offer-${offer.id}`.replace(/\s+/g, "-");

    addToCart(
      {
        cartKey,
        id: offer.id,
        menuItemId: offer.id,
        name: offer.name,
        price: Number(offer.price) || 0,
        image: offer.image,
        isOffer: true,
        category: OFFER_CATEGORY,
        categoryName: OFFER_CATEGORY,
        size: "Standard",
        sizes: [],
        selectedSize: "Standard",
        selectedAddons: [],
        options,
        modifier,
        inclusions,
        choices,
        drinks,
        productType: "KITCHEN",
      },
      1,
    );
    toast.success(`${offer.name} added to cart`);
  };

  const handleAddOffer = (offer) => {
    if (offerNeedsOptions(offer)) {
      setActiveOffer(offer);
      return;
    }
    addOfferDirect(offer);
  };

  if (loading) {
    return (
      <section className="w-full bg-white py-16 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 space-y-10">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="h-4 bg-zinc-100 rounded animate-pulse" />
            <div className="h-10 bg-zinc-100 rounded animate-pulse" />
            <div className="h-4 bg-zinc-100 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[420px] rounded-3xl bg-zinc-100 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // if (!displayOffers.length) return null;

  return (
    <section
      className="w-full bg-white py-16 pt-20"
      aria-labelledby="offers-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8 space-y-12">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <p className="text-sm text-zinc-500 leading-relaxed">
            Hungry yet? Skip the kitchen stress and order online for same-day
            pickup with just a few taps.
          </p>
          <h2
            id="offers-heading"
            className="text-3xl sm:text-4xl font-bold text-zinc-900 font-[family-name:var(--font-display)] leading-tight"
          >
            Simply Delicious, Honestly Sourced.
          </h2>
          <p className="text-base text-zinc-600 leading-relaxed max-w-2xl mx-auto">
            Great food is more than just sustenance — it&apos;s made fresh to
            order, with offers crafted for real appetite.
          </p>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayOffers.map((offer) => {
            const inclusions = cleanOfferList(offer.inclusions);
            const choices = cleanOfferList(offer.choices);
            const drinks = cleanOfferList(offer.drinks);
            const chips = [
              ...inclusions.map((item) => ({ key: `i-${item}`, label: item })),
              ...choices.map((item) => ({ key: `c-${item}`, label: item })),
              ...drinks.map((item) => ({ key: `d-${item}`, label: item })),
            ];
            const visibleChips = chips.slice(0, 5);
            const extraChipCount = Math.max(0, chips.length - visibleChips.length);

            return (
              <article
                key={offer.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-100">
                  <Image
                    src={productImageSrc(offer)}
                    alt={offer.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/50 to-transparent" />
                  <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0B1B3A] shadow-sm">
                    Special Offer
                  </span>
                  <span className="absolute bottom-4 right-4 rounded-lg bg-black/60 px-3 py-1.5 text-base font-extrabold tabular-nums text-white backdrop-blur-sm">
                    ${Number(offer.price || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex-1 space-y-3">
                    <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-xl font-bold leading-snug text-zinc-950 sm:text-2xl">
                      {offer.name}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-6 text-zinc-500">
                      {offer.description ||
                        "Customize your selections and add to cart."}
                    </p>

                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                      <Clock3 className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                      <span className="truncate">{formatOfferTiming(offer)}</span>
                    </div>

                    {visibleChips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {visibleChips.map((chip) => (
                          <span
                            key={chip.key}
                            className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600"
                          >
                            {chip.label}
                          </span>
                        ))}
                        {extraChipCount > 0 && (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                            +{extraChipCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-3 border-t border-zinc-100 pt-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Offer price
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-extrabold tabular-nums text-zinc-950">
                          ${Number(offer.price || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-zinc-400">+ tax</span>
                      </div>
                    </div>
                    {offer.hasOptions && (
                      <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Options
                      </span>
                    )}
                    <Button
                      onClick={() => handleAddOffer(offer)}
                      className="h-12 shrink-0 rounded-xl bg-primary px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-hover"
                    >
                      <ShoppingBag className="mr-1.5 h-4 w-4" />
                      {offer.hasOptions ? "Select" : "Add"}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Promo banners from configured offer details */}
        <div className="space-y-3 max-w-7xl mx-auto">
          {(lastMinute?.heading || lastMinute?.description || more?.title) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-orange-50 border border-orange-100 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                <Clock3 className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-bold text-zinc-900">
                  {lastMinute?.heading || more?.title || "Limited-time deal"}
                </p>
                <p className="text-sm text-zinc-600 line-clamp-2">
                  {lastMinute?.description || more?.description || ""}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="shrink-0 rounded-full border-orange-200 text-orange-800 hover:bg-orange-100 h-10 text-xs font-bold uppercase tracking-widest"
              >
                <Link href={lastMinute?.link || more?.knowMoreLink || "/menu"}>
                  Know More
                </Link>
              </Button>
            </div>
          )}

          {promo?.description && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-violet-50 border border-violet-100 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-700 leading-relaxed">
                  {promo.description}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="shrink-0 rounded-full border-violet-200 text-violet-800 hover:bg-violet-100 h-10 text-xs font-bold uppercase tracking-widest"
              >
                <Link href={promo?.link || "/menu"}>Apply</Link>
              </Button>
            </div>
          )}
        </div>
{/* 
        <div className="text-center space-y-2 pt-2">
          <p className="text-2xl sm:text-3xl font-bold text-zinc-900 font-[family-name:var(--font-display)]">
            Ready when you are
          </p>
          <p className="text-base text-zinc-500 italic font-[family-name:var(--font-display)]">
            same-day pickup · pay at the restaurant
          </p>
        </div> */}
      </div>

      {activeOffer && (
        <OfferConfigModal
          isOpen={!!activeOffer}
          onClose={() => setActiveOffer(null)}
          offer={activeOffer}
        />
      )}
    </section>
  );
}
