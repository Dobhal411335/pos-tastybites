"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Clock3, Eye, ShoppingBag, Tag } from "lucide-react";
import { usePublicMenu } from "@/hooks/usePublicMenu";
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
  const opts = { month: "short", day: "numeric" };

  if (from && to) {
    return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`;
  }
  if (from) return `From ${from.toLocaleDateString(undefined, opts)}`;
  if (to) return `Until ${to.toLocaleDateString(undefined, opts)}`;
  return "Available now";
}

function optionPreview(offer) {
  const parts = [];
  const inclusions = cleanOfferList(offer.inclusions);
  const choices = cleanOfferList(offer.choices);
  const drinks = cleanOfferList(offer.drinks);
  if (inclusions.length) parts.push(`${inclusions.length} included`);
  if (choices.length) parts.push(`${choices.length} choice${choices.length > 1 ? "s" : ""}`);
  if (drinks.length) parts.push(`${drinks.length} drink${drinks.length > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

export default function SpecialOfferBanner() {
  const { offers, loading } = usePublicMenu();
  const { addToCart } = useCart();
  const [activeOffer, setActiveOffer] = useState(null);

  const list = useMemo(() => (Array.isArray(offers) ? offers : []), [offers]);

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
      1
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

  if (!loading && list.length === 0) return null;

  return (
    <section className="w-full bg-[var(--customer-surface-low)] py-14" id="special-offers">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="mb-8 flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Limited Time
          </span>
          <h2 className="text-2xl font-extrabold text-[var(--customer-ink)] sm:text-3xl">
            Special Offers
          </h2>
          <p className="text-sm text-[var(--customer-muted)]">
            Bundle deals from our kitchen — customize inclusions, choices, and drinks, then add to
            your pickup bag.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl bg-[var(--customer-surface-container)]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((offer) => {
              const preview = optionPreview(offer);
              const needsConfig = offerNeedsOptions(offer);
              const price = Number(offer.price || 0);

              return (
                <article
                  key={offer.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)]/20 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative h-48 overflow-hidden bg-[var(--customer-surface-container)]">
                    <Image
                      src={productImageSrc(offer)}
                      alt={offer.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      <Tag className="h-3 w-3" />
                      Offer
                    </span>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label={`View ${offer.name}`}
                        onClick={() => setActiveOffer(offer)}
                        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[var(--customer-ink)] shadow-md transition-transform hover:scale-105"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-[var(--customer-ink)]">
                        {offer.name}
                      </h3>
                      <span className="shrink-0 text-lg font-extrabold tabular-nums text-primary">
                        ${price.toFixed(2)}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-xs leading-relaxed text-[var(--customer-muted)]">
                      {offer.description || ""}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--customer-muted)]">
                      <Clock3 className="h-3.5 w-3.5 text-primary" />
                      {formatOfferTiming(offer)}
                    </div>

                    {preview ? (
                      <p className="text-[11px] font-semibold text-[var(--customer-ink)]">
                        {preview}
                      </p>
                    ) : null}

                    {(cleanOfferList(offer.inclusions).length > 0 ||
                      cleanOfferList(offer.choices).length > 0 ||
                      cleanOfferList(offer.drinks).length > 0) && (
                      <div className="space-y-1.5 rounded-xl bg-[var(--customer-surface-low)] p-3 text-[11px] text-[var(--customer-muted)]">
                        {cleanOfferList(offer.inclusions).length > 0 ? (
                          <div>
                            <span className="font-bold text-[var(--customer-ink)]">Includes: </span>
                            {cleanOfferList(offer.inclusions).slice(0, 3).join(", ")}
                            {cleanOfferList(offer.inclusions).length > 3 ? "…" : ""}
                          </div>
                        ) : null}
                        {cleanOfferList(offer.choices).length > 0 ? (
                          <div>
                            <span className="font-bold text-[var(--customer-ink)]">Choices: </span>
                            {cleanOfferList(offer.choices).slice(0, 3).join(", ")}
                            {cleanOfferList(offer.choices).length > 3 ? "…" : ""}
                          </div>
                        ) : null}
                        {cleanOfferList(offer.drinks).length > 0 ? (
                          <div>
                            <span className="font-bold text-[var(--customer-ink)]">Drinks: </span>
                            {cleanOfferList(offer.drinks).slice(0, 3).join(", ")}
                            {cleanOfferList(offer.drinks).length > 3 ? "…" : ""}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAddOffer(offer)}
                      className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {needsConfig ? "Customize & Add" : "Add to Cart"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <OfferConfigModal
        isOpen={!!activeOffer}
        onClose={() => setActiveOffer(null)}
        offer={activeOffer}
      />
    </section>
  );
}
