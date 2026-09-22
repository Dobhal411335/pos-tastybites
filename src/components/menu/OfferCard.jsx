"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock3, Eye, ShoppingBag, Tag } from "lucide-react";
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
import { cn } from "@/lib/utils";

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

export default function OfferCard({ offer, highlighted = false }) {
  const { addToCart } = useCart();
  const [activeOffer, setActiveOffer] = useState(null);
  const preview = optionPreview(offer);
  const needsConfig = offerNeedsOptions(offer);
  const price = Number(offer.price || 0);
  const inclusions = cleanOfferList(offer.inclusions);
  const choices = cleanOfferList(offer.choices);
  const drinks = cleanOfferList(offer.drinks);

  const addOfferDirect = () => {
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

  const handleAddOffer = () => {
    if (needsConfig) {
      setActiveOffer(offer);
      return;
    }
    addOfferDirect();
  };

  return (
    <>
      <article
        id={offer.slug ? `offer-${offer.slug}` : `offer-${offer.id}`}
        className={cn(
          "group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md",
          highlighted
            ? "border-primary/50 ring-2 ring-primary/20"
            : "border-[var(--border)]/20"
        )}
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
            <h3 className="text-base font-bold text-[var(--customer-ink)]">{offer.name}</h3>
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
            <p className="text-[11px] font-semibold text-[var(--customer-ink)]">{preview}</p>
          ) : null}

          {(inclusions.length > 0 || choices.length > 0 || drinks.length > 0) && (
            <div className="space-y-1.5 rounded-xl bg-[var(--customer-surface-low)] p-3 text-[11px] text-[var(--customer-muted)]">
              {inclusions.length > 0 ? (
                <div>
                  <span className="font-bold text-[var(--customer-ink)]">Includes: </span>
                  {inclusions.slice(0, 3).join(", ")}
                  {inclusions.length > 3 ? "…" : ""}
                </div>
              ) : null}
              {choices.length > 0 ? (
                <div>
                  <span className="font-bold text-[var(--customer-ink)]">Choices: </span>
                  {choices.slice(0, 3).join(", ")}
                  {choices.length > 3 ? "…" : ""}
                </div>
              ) : null}
              {drinks.length > 0 ? (
                <div>
                  <span className="font-bold text-[var(--customer-ink)]">Drinks: </span>
                  {drinks.slice(0, 3).join(", ")}
                  {drinks.length > 3 ? "…" : ""}
                </div>
              ) : null}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddOffer}
            className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
          >
            <ShoppingBag className="h-4 w-4" />
            {needsConfig ? "Customize & Add" : "Add to Cart"}
          </button>
        </div>
      </article>

      <OfferConfigModal
        isOpen={!!activeOffer}
        onClose={() => setActiveOffer(null)}
        offer={activeOffer}
      />
    </>
  );
}
