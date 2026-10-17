"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import {
  OFFER_CATEGORY,
  buildOfferCartModifier,
  buildOfferOptions,
  cleanOfferList,
} from "@/utils/offerDetails";
import { productImageSrc } from "@/lib/public/productImage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function toggleValue(list, value) {
  if (list.includes(value)) return list.filter((v) => v !== value);
  return [...list, value];
}

export default function OfferConfigModal({ isOpen, onClose, offer }) {
  const { addToCart } = useCart();
  const inclusions = cleanOfferList(offer?.inclusions);
  const choices = cleanOfferList(offer?.choices);
  const drinks = cleanOfferList(offer?.drinks);

  const [selectedInclusions, setSelectedInclusions] = useState(inclusions);
  // Single-select for choices / drinks (radio) — store as string or ""
  const [selectedChoice, setSelectedChoice] = useState("");
  const [selectedDrink, setSelectedDrink] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (!offer) return;
    const nextChoices = cleanOfferList(offer.choices);
    const nextDrinks = cleanOfferList(offer.drinks);
    setSelectedInclusions(cleanOfferList(offer.inclusions));
    setSelectedChoice(nextChoices.length === 1 ? nextChoices[0] : "");
    setSelectedDrink(nextDrinks.length === 1 ? nextDrinks[0] : "");
    setItemNotes("");
    setShowFullDescription(false);
  }, [offer]);

  if (!offer) return null;

  const handleAdd = () => {
    const hasAnyOptions = inclusions.length > 0 || choices.length > 0 || drinks.length > 0;
    const hasAnySelection =
      selectedInclusions.length > 0 || Boolean(selectedChoice) || Boolean(selectedDrink);

    if (hasAnyOptions && !hasAnySelection) {
      toast.error("Please select at least one option.");
      return;
    }

    const inc = selectedInclusions;
    // Send only one choice / drink each
    const ch = selectedChoice ? [selectedChoice] : [];
    const dr = selectedDrink ? [selectedDrink] : [];
    const notes = String(itemNotes || "").trim();
    const noteKey = notes
      ? notes.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)
      : "";
    const options = buildOfferOptions({ inclusions: inc, choices: ch, drinks: dr });
    const modifier = buildOfferCartModifier({ inclusions: inc, choices: ch, drinks: dr });
    const cartKey = [
      "offer",
      offer.id,
      inc.join("+"),
      ch[0] || "",
      dr[0] || "",
      noteKey ? `note-${noteKey}` : "",
    ]
      .filter(Boolean)
      .join("-")
      .replace(/\s+/g, "-");

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
        inclusions: inc,
        choices: ch,
        drinks: dr,
        notes,
        productType: "KITCHEN",
        validFrom: offer.validFrom || null,
        validTo: offer.validTo || null,
      },
      1
    );
    toast.success(`${offer.name} added to cart`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl"
      >
        <div className="relative h-48 shrink-0 bg-[var(--customer-surface-container)] sm:h-56">
          <Image
            src={productImageSrc(offer)}
            alt={offer.name}
            fill
            className="object-cover"
            sizes="512px"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-md"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-3 rounded-full bg-[var(--customer-ink)]/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            Special Offer
          </div>
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <DialogTitle className="text-lg font-bold text-[var(--customer-ink)]">
              {offer.name}
            </DialogTitle>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-primary">
              ${Number(offer.price || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-1">
          {offer.description ? (
            <>
              <p
                className={cn(
                  "text-sm leading-relaxed text-[var(--customer-muted)]",
                  !showFullDescription ? "line-clamp-3" : ""
                )}
              >
                {offer.description}
              </p>
              {offer.description.length > 120 && (
                <button
                  type="button"
                  onClick={() => setShowFullDescription((prev) => !prev)}
                  className="mt-1 text-xs font-semibold text-primary underline"
                >
                  {showFullDescription ? "Show less" : "Read more"}
                </button>
              )}
            </>
          ) : null}
     

          {inclusions.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Includes
              </legend>
              <div className="space-y-2">
                {inclusions.map((item) => {
                  const checked = selectedInclusions.includes(item);
                  return (
                    <label
                      key={item}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold",
                        checked ? "border-primary bg-primary/5" : "border-zinc-200"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedInclusions((prev) => toggleValue(prev, item))
                        }
                        className="h-4 w-4 accent-orange-600"
                      />
                      {item}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {choices.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Choices (pick one)
              </legend>
              <div className="space-y-2" role="radiogroup" aria-label="Offer choices">
                {choices.map((item) => {
                  const checked = selectedChoice === item;
                  return (
                    <label
                      key={item}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold",
                        checked ? "border-primary bg-primary/5" : "border-zinc-200"
                      )}
                    >
                      <input
                        type="radio"
                        name="offer-config-choice"
                        checked={checked}
                        onChange={() => setSelectedChoice(item)}
                        className="h-4 w-4 accent-orange-600"
                      />
                      {item}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {drinks.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Drinks (pick one)
              </legend>
              <div className="space-y-2" role="radiogroup" aria-label="Offer drinks">
                {drinks.map((item) => {
                  const checked = selectedDrink === item;
                  return (
                    <label
                      key={item}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold",
                        checked ? "border-primary bg-primary/5" : "border-zinc-200"
                      )}
                    >
                      <input
                        type="radio"
                        name="offer-config-drink"
                        checked={checked}
                        onChange={() => setSelectedDrink(item)}
                        className="h-4 w-4 accent-orange-600"
                      />
                      {item}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {inclusions.length === 0 && choices.length === 0 && drinks.length === 0 ? (
            <p className="text-sm text-[var(--customer-muted)]">
              No customization required — add this offer as packaged.
            </p>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="offer-item-notes"
              className="text-xs font-bold uppercase tracking-widest text-zinc-500"
            >
              Special request / remark
            </label>
            <textarea
              id="offer-item-notes"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="e.g. No onions, sauce on the side…"
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-zinc-100 px-5 py-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12 flex-1 border-zinc-300 text-xs font-bold uppercase tracking-widest text-zinc-700"
          >
            Close
          </Button>
          <Button
            onClick={handleAdd}
            className="h-12 flex-[1.4] bg-primary text-xs font-bold uppercase tracking-widest text-white hover:bg-primary-hover"
          >
            Add · ${Number(offer.price || 0).toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
