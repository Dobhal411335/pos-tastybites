"use client";

import React, { useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import {
  normalizeChoiceOptions,
  cartChoiceSelectionsKey,
} from "@/utils/productChoices";
import { cn } from "@/lib/utils";

function buildCartKey(parts) {
  return parts
    .map((part) => String(part ?? "").trim())
    .join("-")
    .replace(/\s+/g, "-");
}

function QtyStepper({ value, onChange, min = 0, max = 99 }) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function addonKey(addon, index) {
  return String(addon?._id || addon?.id || addon?.name || index);
}

export default function ProductConfigModal({ isOpen, onClose, product }) {
  const { addToCart } = useCart();

  const variants = useMemo(() => {
    if (product?.variants?.length) return product.variants;
    if (product?.sizes?.length) {
      return product.sizes.map((s) => ({
        size: s.name,
        price:
          s.absolutePrice != null
            ? s.absolutePrice
            : (product.price || 0) + (s.price || 0),
      }));
    }
    return [{ size: "Standard", price: Number(product?.price) || 0 }];
  }, [product]);

  const addons = useMemo(
    () => (Array.isArray(product?.addons) ? product.addons : []),
    [product],
  );
  const choiceOptions = useMemo(
    () => normalizeChoiceOptions(product?.choiceOptions),
    [product],
  );
  const prepStyles = useMemo(
    () => (Array.isArray(product?.preparationStyles) ? product.preparationStyles : []),
    [product],
  );

  const [variantQtyBySize, setVariantQtyBySize] = useState({});
  const [addonQtyById, setAddonQtyById] = useState({});
  const [choiceSelections, setChoiceSelections] = useState({});
  const [preparationStyle, setPreparationStyle] = useState("");
  const [configuredProductId, setConfiguredProductId] = useState(null);

  const productId = product?.id || product?._id || null;
  if (productId && productId !== configuredProductId) {
    const initialVariantQty = {};
    variants.forEach((_, idx) => {
      initialVariantQty[String(idx)] = variants.length === 1 ? 1 : 0;
    });
    setConfiguredProductId(productId);
    setVariantQtyBySize(initialVariantQty);
    setAddonQtyById({});
    setChoiceSelections({});
    setPreparationStyle(prepStyles[0] || "");
  }

  const variantEntries = Object.entries(variantQtyBySize).filter(
    ([, qty]) => Number(qty) > 0,
  );
  const addonEntries = Object.entries(addonQtyById).filter(
    ([, entry]) => entry?.qty > 0 && entry?.addon,
  );

  const productChoicePayload = choiceOptions
    .map((group) => ({
      name: group.name,
      subChoices: choiceSelections[group.name] || [],
    }))
    .filter((group) => group.subChoices.length > 0);

  const previewTotal = useMemo(() => {
    let total = 0;
    for (const [key, qty] of Object.entries(variantQtyBySize)) {
      if (!(Number(qty) > 0)) continue;
      const variant = variants[Number(key)];
      total += (Number(variant?.price) || 0) * Number(qty);
    }
    for (const entry of Object.values(addonQtyById)) {
      if (!(entry?.qty > 0) || !entry?.addon) continue;
      total += (Number(entry.addon?.price) || 0) * Number(entry.qty);
    }
    return total;
  }, [variantQtyBySize, addonQtyById, variants]);

  if (!product) return null;

  const setVariantQty = (key, qty) => {
    setVariantQtyBySize((prev) => ({ ...prev, [key]: Math.max(0, qty) }));
  };

  const setAddonQty = (key, addon, qty) => {
    setAddonQtyById((prev) => ({
      ...prev,
      [key]: {
        addon,
        qty: Math.max(0, qty),
        choicesByGroup: prev[key]?.choicesByGroup || {},
      },
    }));
  };

  const toggleChoice = (groupName, subChoice, multi) => {
    setChoiceSelections((prev) => {
      const current = prev[groupName] || [];
      if (!multi) return { ...prev, [groupName]: [subChoice] };
      if (current.includes(subChoice)) {
        return { ...prev, [groupName]: current.filter((c) => c !== subChoice) };
      }
      return { ...prev, [groupName]: [...current, subChoice] };
    });
  };

  const toggleAddonSubChoice = (key, addon, groupIndex, subChoice, multi) => {
    setAddonQtyById((prev) => {
      const entry = prev[key] || { addon, qty: 0, choicesByGroup: {} };
      const current = entry.choicesByGroup?.[groupIndex] || [];
      let next;
      if (!multi) {
        next = current.includes(subChoice) ? [] : [subChoice];
      } else if (current.includes(subChoice)) {
        next = current.filter((c) => c !== subChoice);
      } else {
        next = [...current, subChoice];
      }
      return {
        ...prev,
        [key]: {
          ...entry,
          addon,
          choicesByGroup: {
            ...(entry.choicesByGroup || {}),
            [groupIndex]: next,
          },
        },
      };
    });
  };

  const handleAddToCart = () => {
    if (variants.length > 0 && variantEntries.length === 0) {
      toast.error("Select at least one variant quantity.");
      return;
    }
    if (variantEntries.length === 0 && addonEntries.length === 0) {
      toast.error("Select a variant or extra.");
      return;
    }

    const choiceKey = cartChoiceSelectionsKey(productChoicePayload);
    const prep = preparationStyle || "";

    variantEntries.forEach(([key, qty]) => {
      const variant = variants[Number(key)];
      if (!variant) return;
      const sizeName = variant.size || "Standard";
      const cartKey = buildCartKey([
        product.id,
        sizeName,
        choiceKey,
        prep,
      ]);

      addToCart(
        {
          cartKey,
          id: product.id,
          menuItemId: product.id,
          name: product.name,
          price: Number(variant.price) || 0,
          image: product.image,
          selectedSize: sizeName,
          size: sizeName,
          sizes: sizeName && !/^standard$/i.test(sizeName) ? [sizeName] : [],
          selectedAddons: [],
          options: prep ? [prep] : [],
          choiceSelections: productChoicePayload,
          addonChoiceSelections: [],
          preparationStyle: prep || null,
          category: product.category,
          categoryName: product.categoryName,
          productType: product.productType,
          modifier: [
            sizeName !== "Standard" ? `Size: ${sizeName}` : null,
            prep || null,
          ]
            .filter(Boolean)
            .join(" | "),
        },
        qty,
      );
    });

    addonEntries.forEach(([key, entry]) => {
      const addon = entry.addon;
      const addonChoices = normalizeChoiceOptions(addon.choiceOptions)
        .map((group, index) => ({
          name: group.name,
          subChoices: entry.choicesByGroup?.[index] || [],
        }))
        .filter((group) => group.subChoices.length > 0);
      const addonChoiceKey = cartChoiceSelectionsKey(addonChoices);
      const cartKey = buildCartKey([
        product.id,
        "Extra",
        addon.name,
        addonChoiceKey,
      ]);

      addToCart(
        {
          cartKey,
          id: product.id,
          menuItemId: product.id,
          name: addon.name || product.name,
          price: Number(addon.price) || 0,
          image: product.image,
          selectedSize: "Extra",
          size: "Extra",
          sizes: [],
          selectedAddons: [addon.name],
          options: [addon.name],
          choiceSelections: [],
          addonChoiceSelections: addonChoices,
          preparationStyle: null,
          category: product.category,
          categoryName: product.categoryName,
          productType: product.productType,
          modifier: `Addons: ${addon.name}`,
          parentProductName: product.name,
        },
        entry.qty,
      );
    });

    toast.success(`${product.name} added to cart`);
    onClose();
  };

  const codeMatch = String(product.name || "").match(/^([A-Z]?\d+)\s+(.+)$/);
  const productCode = product.productCode || codeMatch?.[1] || "";
  const productTitle = codeMatch?.[2] || product.name;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-4">
          <div className="min-w-0 pr-4">
            <DialogTitle className="text-xl font-bold text-zinc-900">
              {productCode ? (
                <span className="mr-2 text-primary">{productCode}</span>
              ) : null}
              {productTitle}
            </DialogTitle>
            <p className="mt-0.5 text-sm font-medium text-zinc-500">
              Select variations and extras
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {product.description ? (
            <p className="text-sm leading-relaxed text-zinc-600">
              {product.description}
            </p>
          ) : null}

          <div className="hidden gap-1 border-b border-zinc-100 px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 sm:flex">
            <div className="min-w-[100px] flex-1">Option</div>
            <div className="w-28 text-center">Qty</div>
            <div className="w-20 text-right">Price</div>
          </div>

          {variants.length > 0 ? (
            <div className="space-y-2">
              <span className="mb-1 block text-[13px] font-bold text-zinc-900">
                Variants
              </span>
              <div className="grid gap-2">
                {variants.map((v, idx) => {
                  const key = String(idx);
                  const qty = Number(variantQtyBySize[key]) || 0;
                  const price = Number(v.price) || 0;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                        qty > 0
                          ? "border-primary bg-primary/5"
                          : "border-zinc-200",
                      )}
                    >
                      <div className="text-sm font-bold text-zinc-800">
                        {v.size || "Standard"}
                      </div>
                      <div className="flex items-center gap-3">
                        <QtyStepper
                          value={qty}
                          onChange={(next) => setVariantQty(key, next)}
                        />
                        <div className="w-16 text-right text-sm font-bold tabular-nums text-zinc-900">
                          ${price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {choiceOptions.map((group) => {
            const multi = (group.subChoices || []).length > 2;
            const selected = choiceSelections[group.name] || [];
            return (
              <div key={group.name} className="space-y-2">
                <span className="mb-1 block text-[13px] font-bold text-zinc-900">
                  {group.name}{" "}
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(group.subChoices || []).map((sub) => {
                    const checked = selected.includes(sub);
                    return (
                      <label
                        key={sub}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-semibold",
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-zinc-200",
                        )}
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
              </div>
            );
          })}

          {prepStyles.length > 0 ? (
            <div className="space-y-2">
              <span className="mb-1 block text-[13px] font-bold text-zinc-900">
                Preparation
              </span>
              <div className="flex flex-wrap gap-2">
                {prepStyles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setPreparationStyle(style)}
                    className={cn(
                      "min-h-10 rounded-full border px-4 py-2 text-xs font-bold",
                      preparationStyle === style
                        ? "border-primary bg-primary text-white"
                        : "border-zinc-200 bg-white text-zinc-700",
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {addons.length > 0 ? (
            <div className="space-y-2">
              <span className="mb-1 block text-[13px] font-bold text-zinc-900">
                Addons
              </span>
              <div className="grid gap-2">
                {addons.map((addon, index) => {
                  const key = addonKey(addon, index);
                  const entry = addonQtyById[key];
                  const qty = Number(entry?.qty) || 0;
                  const price = Number(addon.price) || 0;
                  const nested = normalizeChoiceOptions(addon.choiceOptions);
                  return (
                    <div
                      key={key}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        qty > 0
                          ? "border-primary bg-primary/5"
                          : "border-zinc-200",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-bold text-zinc-800">
                          {addon.name}
                        </div>
                        <div className="flex items-center gap-3">
                          <QtyStepper
                            value={qty}
                            onChange={(next) => setAddonQty(key, addon, next)}
                          />
                          <div className="w-16 text-right text-sm font-bold tabular-nums text-zinc-900">
                            +${price.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {nested.length > 0 && qty > 0 ? (
                        <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
                          {nested.map((group, groupIndex) => {
                            const multi = group.subChoices.length > 2;
                            const selected =
                              entry?.choicesByGroup?.[groupIndex] || [];
                            return (
                              <div key={group.name} className="space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                  {group.name}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {group.subChoices.map((sub) => {
                                    const checked = selected.includes(sub);
                                    return (
                                      <label
                                        key={sub}
                                        className={cn(
                                          "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-semibold",
                                          checked
                                            ? "border-primary bg-white text-zinc-900"
                                            : "border-zinc-200 bg-white text-zinc-700",
                                        )}
                                      >
                                        <input
                                          type={multi ? "checkbox" : "radio"}
                                          name={`addon-${key}-${groupIndex}`}
                                          checked={checked}
                                          onChange={() =>
                                            toggleAddonSubChoice(
                                              key,
                                              addon,
                                              groupIndex,
                                              sub,
                                              multi,
                                            )
                                          }
                                          className="h-3.5 w-3.5 accent-orange-600"
                                        />
                                        {sub}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50 px-5 py-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase text-zinc-500">
              Selected total
            </span>
            <span className="text-2xl font-bold tabular-nums text-zinc-900">
              ${previewTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-xl border-zinc-200 px-5 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddToCart}
              disabled={variantEntries.length === 0 && addonEntries.length === 0}
              className="h-11 rounded-xl bg-primary px-6 font-bold text-white hover:bg-primary-hover"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
