"use client";

import React, { useMemo, useState, useEffect } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function ProductConfigModal({ isOpen, onClose, product }) {
  const { addToCart } = useCart();

  const variants = useMemo(() => {
    if (product?.variants?.length) return product.variants;
    if (product?.sizes?.length) {
      return product.sizes.map((s) => ({
        size: s.name,
        price: s.absolutePrice != null ? s.absolutePrice : (product.price || 0) + (s.price || 0),
      }));
    }
    return [{ size: "Standard", price: Number(product?.price) || 0 }];
  }, [product]);

  const addons = product?.addons || [];
  const choiceOptions = product?.choiceOptions || [];
  const prepStyles = product?.preparationStyles || [];

  const [selectedVariant, setSelectedVariant] = useState(variants[0]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [choiceSelections, setChoiceSelections] = useState({});
  const [preparationStyle, setPreparationStyle] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!product) return;
    setSelectedVariant(variants[0]);
    setSelectedAddons([]);
    setChoiceSelections({});
    setPreparationStyle(prepStyles[0] || "");
    setQty(1);
  }, [product, variants, prepStyles]);

  if (!product) return null;

  const requiredChoicesMissing = choiceOptions.some((group) => {
    const selected = choiceSelections[group.name];
    return !selected || selected.length === 0;
  });

  const variantRequired = variants.length > 1 && !selectedVariant;

  const unitPrice =
    (Number(selectedVariant?.price) || 0) +
    selectedAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const handleAddonToggle = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.name === addon.name);
      if (exists) return prev.filter((a) => a.name !== addon.name);
      return [...prev, addon];
    });
  };

  const toggleChoice = (groupName, subChoice, multi) => {
    setChoiceSelections((prev) => {
      const current = prev[groupName] || [];
      if (!multi) {
        return { ...prev, [groupName]: [subChoice] };
      }
      if (current.includes(subChoice)) {
        return { ...prev, [groupName]: current.filter((c) => c !== subChoice) };
      }
      return { ...prev, [groupName]: [...current, subChoice] };
    });
  };

  const handleAddToCart = () => {
    if (variantRequired || requiredChoicesMissing) {
      toast.error("Please complete required options before adding.");
      return;
    }

    const sizeName = selectedVariant?.size || "Standard";
    const addonNames = selectedAddons.map((a) => a.name);
    const choicePayload = Object.entries(choiceSelections).map(([name, subChoices]) => ({
      name,
      subChoices,
    }));

    const cartKey = [
      product.id,
      sizeName,
      addonNames.join("+"),
      choicePayload.map((c) => `${c.name}:${c.subChoices.join(",")}`).join("|"),
      preparationStyle || "",
    ]
      .join("-")
      .replace(/\s+/g, "-");

    addToCart(
      {
        cartKey,
        id: product.id,
        menuItemId: product.id,
        name: product.name,
        price: unitPrice,
        image: product.image,
        selectedSize: sizeName,
        size: sizeName,
        sizes: sizeName && !/^standard$/i.test(sizeName) ? [sizeName] : [],
        selectedAddons: addonNames,
        options: addonNames,
        choiceSelections: choicePayload,
        preparationStyle: preparationStyle || null,
        category: product.category,
        categoryName: product.categoryName,
        productType: product.productType,
      },
      qty
    );

    toast.success(`${product.name} added to cart`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] max-w-xl flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between bg-[var(--customer-surface-low)] px-5 py-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Customize Item
            </span>
            <DialogTitle className="pr-6 text-lg font-semibold text-[var(--customer-ink)]">
              {product.name}
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--customer-surface-container)] text-[var(--customer-ink)] hover:bg-[var(--customer-surface-low)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-6 overflow-y-auto flex-1">
          {product.description && (
            <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>
          )}

          {variants.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Size {variants.length > 1 && <span className="text-primary">* Required</span>}
              </legend>
              <div className="space-y-2">
                {variants.map((v) => {
                  const checked = selectedVariant?.size === v.size;
                  return (
                    <label
                      key={v.size}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 cursor-pointer min-h-11 ${
                        checked ? "border-primary bg-primary/5" : "border-zinc-200"
                      }`}
                    >
                      <span className="flex items-center gap-3 text-sm font-semibold text-zinc-900">
                        <input
                          type="radio"
                          name="product-size"
                          checked={checked}
                          onChange={() => setSelectedVariant(v)}
                          className="h-4 w-4 accent-orange-600"
                        />
                        {v.size}
                      </span>
                      <span className="text-sm font-bold tabular-nums">${Number(v.price).toFixed(2)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {choiceOptions.map((group) => {
            const multi = (group.subChoices || []).length > 2;
            const selected = choiceSelections[group.name] || [];
            return (
              <fieldset key={group.name} className="space-y-3">
                <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  {group.name} <span className="text-primary">* Required</span>
                </legend>
                <div className="space-y-2">
                  {(group.subChoices || []).map((sub) => {
                    const checked = selected.includes(sub);
                    return (
                      <label
                        key={sub}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer min-h-11 text-sm font-semibold ${
                          checked ? "border-primary bg-primary/5" : "border-zinc-200"
                        }`}
                      >
                        <input
                          type={multi ? "checkbox" : "radio"}
                          name={`choice-${group.name}`}
                          checked={checked}
                          onChange={() => toggleChoice(group.name, sub, multi)}
                          className="h-4 w-4 accent-orange-600"
                        />
                        {sub}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {prepStyles.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Preparation
              </legend>
              <div className="flex flex-wrap gap-2">
                {prepStyles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setPreparationStyle(style)}
                    className={`px-4 py-2.5 rounded-full text-xs font-bold border min-h-11 ${
                      preparationStyle === style
                        ? "bg-primary border-primary text-white"
                        : "bg-white border-zinc-200 text-zinc-700"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {addons.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Add-ons <span className="text-zinc-400 font-medium normal-case tracking-normal">(optional)</span>
              </legend>
              <div className="space-y-2">
                {addons.map((addon) => {
                  const checked = !!selectedAddons.find((a) => a.name === addon.name);
                  return (
                    <label
                      key={addon.name}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 cursor-pointer min-h-11 ${
                        checked ? "border-primary bg-primary/5" : "border-zinc-200"
                      }`}
                    >
                      <span className="flex items-center gap-3 text-sm font-semibold text-zinc-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleAddonToggle(addon)}
                          className="h-4 w-4 accent-orange-600"
                        />
                        {addon.name}
                      </span>
                      <span className="text-sm font-bold tabular-nums">+${Number(addon.price).toFixed(2)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Quantity</span>
            <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
              <button
                type="button"
                className="h-11 w-11 text-zinc-600 hover:bg-zinc-50"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center font-bold tabular-nums">{qty}</span>
              <button
                type="button"
                className="h-11 w-11 text-zinc-600 hover:bg-zinc-50"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 bg-[var(--customer-surface-low)] px-5 py-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase text-[var(--customer-muted)]">
              Total Price
            </span>
            <span className="text-2xl font-bold tabular-nums text-[var(--customer-ink)]">
              ${(unitPrice * qty).toFixed(2)}
            </span>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={requiredChoicesMissing || variantRequired}
            className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-hover"
          >
            Add to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
