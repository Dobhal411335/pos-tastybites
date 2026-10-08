"use client";

import React, { useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import {
  normalizeChoiceOptions,
  normalizeCustomData,
  cartChoiceSelectionsKey,
  cartCustomDataSelectionsKey,
  normalizeAddonChoiceQtyMap,
  sumAddonChoiceQtyMap,
  buildAddonChoiceSelectionsFromQtyMaps,
  validateAddonNestedChoiceQtys,
} from "@/utils/productChoices";
import { cn } from "@/lib/utils";
import IngredientChips from "@/components/menu/IngredientChips";

const accordionItemClass =
  "overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-none";
const accordionTriggerClass =
  "px-3 py-3 text-[13px] font-bold text-zinc-900 hover:no-underline hover:bg-zinc-50";
const accordionContentClass = "px-3 pt-3 pb-3";

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
        ingredients: Array.isArray(s.ingredients) ? s.ingredients : [],
      }));
    }
    return [{ size: "Standard", price: Number(product?.price) || 0, ingredients: [] }];
  }, [product]);

  const addons = useMemo(
    () => (Array.isArray(product?.addons) ? product.addons : []),
    [product],
  );
  const customDataGroups = useMemo(
    () => normalizeCustomData(product?.customData),
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
  /** { [groupName]: { [optionName]: string[] } } */
  const [customDataSelections, setCustomDataSelections] = useState({});
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
    setCustomDataSelections({});
    setChoiceSelections({});
    setPreparationStyle(prepStyles[0] || "");
  }

  const variantEntries = Object.entries(variantQtyBySize).filter(
    ([, qty]) => Number(qty) > 0,
  );
  const addonEntries = Object.entries(addonQtyById).filter(
    ([, entry]) => entry?.qty > 0 && entry?.addon,
  );

  const addonChoiceErrors = useMemo(() => {
    const errors = [];
    for (const [, entry] of Object.entries(addonQtyById)) {
      if (!(entry?.qty > 0) || !entry?.addon) continue;
      const nested = normalizeChoiceOptions(entry.addon?.choiceOptions);
      if (!nested.length) continue;
      const check = validateAddonNestedChoiceQtys(
        entry.addon,
        entry.qty,
        entry.choicesByGroup || {},
      );
      if (!check.ok) {
        errors.push(
          ...(check.errors || []).map((err) => ({
            addonName: entry.addon?.name,
            ...err,
          })),
        );
      }
    }
    return errors;
  }, [addonQtyById]);

  const productCustomDataPayload = customDataGroups
    .map((group) => ({
      name: group.name,
      subChoices: group.subChoices
        .map((option) => ({
          name: option.name,
          choices: customDataSelections[group.name]?.[option.name] || [],
        }))
        .filter((option) => option.choices.length > 0),
    }))
    .filter((group) => group.subChoices.length > 0);

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
    const nextQty = Math.max(0, qty);
    setAddonQtyById((prev) => {
      const prevEntry = prev[key] || { addon, qty: 0, choicesByGroup: {} };
      const nested = normalizeChoiceOptions(addon?.choiceOptions);
      let choicesByGroup = prevEntry.choicesByGroup || {};

      if (nextQty === 0) {
        choicesByGroup = {};
      } else if (nested.length > 0) {
        // Clamp each nested group so totals never exceed the new addon qty
        const clamped = {};
        for (let groupIndex = 0; groupIndex < nested.length; groupIndex += 1) {
          const map = normalizeAddonChoiceQtyMap(choicesByGroup[groupIndex]);
          let remaining = nextQty;
          const nextMap = {};
          for (const [sub, count] of Object.entries(map)) {
            if (remaining <= 0) break;
            const take = Math.min(count, remaining);
            if (take > 0) {
              nextMap[sub] = take;
              remaining -= take;
            }
          }
          clamped[groupIndex] = nextMap;
        }
        choicesByGroup = clamped;
      }

      return {
        ...prev,
        [key]: {
          addon,
          qty: nextQty,
          choicesByGroup,
        },
      };
    });
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

  const toggleCustomDataChoice = (groupName, optionName, choice) => {
    setCustomDataSelections((prev) => {
      const group = prev[groupName] || {};
      const current = group[optionName] || [];
      const next = current.includes(choice)
        ? current.filter((value) => value !== choice)
        : [...current, choice];
      return {
        ...prev,
        [groupName]: { ...group, [optionName]: next },
      };
    });
  };

  const setAddonSubChoiceQty = (key, addon, groupIndex, subChoice, nextQty) => {
    setAddonQtyById((prev) => {
      const entry = prev[key] || { addon, qty: 0, choicesByGroup: {} };
      const addonQty = Number(entry.qty) || 0;
      if (addonQty <= 0) return prev;

      const groupMap = normalizeAddonChoiceQtyMap(
        entry.choicesByGroup?.[groupIndex],
      );
      const current = Number(groupMap[subChoice]) || 0;
      const others = sumAddonChoiceQtyMap(groupMap) - current;
      const capped = Math.max(
        0,
        Math.min(Math.floor(Number(nextQty) || 0), Math.max(0, addonQty - others)),
      );

      const nextMap = { ...groupMap };
      if (capped <= 0) delete nextMap[subChoice];
      else nextMap[subChoice] = capped;

      return {
        ...prev,
        [key]: {
          ...entry,
          addon,
          choicesByGroup: {
            ...(entry.choicesByGroup || {}),
            [groupIndex]: nextMap,
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

    for (const [, entry] of addonEntries) {
      const nested = normalizeChoiceOptions(entry.addon?.choiceOptions);
      if (!nested.length) continue;
      const check = validateAddonNestedChoiceQtys(
        entry.addon,
        entry.qty,
        entry.choicesByGroup || {},
      );
      if (!check.ok) {
        toast.error(
          check.errors[0]?.message ||
            `Nested choices for ${entry.addon?.name || "addon"} must equal addon quantity.`,
        );
        return;
      }
    }

    const choiceKey = cartChoiceSelectionsKey(productChoicePayload);
    const customDataKey = cartCustomDataSelectionsKey(productCustomDataPayload);
    const prep = preparationStyle || "";

    variantEntries.forEach(([key, qty]) => {
      const variant = variants[Number(key)];
      if (!variant) return;
      const sizeName = variant.size || "Standard";
      const cartKey = buildCartKey([
        product.id,
        sizeName,
        choiceKey,
        customDataKey,
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
          customDataSelections: productCustomDataPayload,
          addonChoiceSelections: [],
          preparationStyle: prep || null,
          noteWithout: "",
          noteAdd: "",
          notes: "",
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

    addonEntries.forEach(([, entry]) => {
      const addon = entry.addon;
      const addonChoices = buildAddonChoiceSelectionsFromQtyMaps(
        addon,
        entry.choicesByGroup || {},
      );
      const addonChoiceKey = cartChoiceSelectionsKey(addonChoices);
      const choiceSummary = addonChoices
        .map((group) => `${group.name}: ${group.subChoices.join(", ")}`)
        .join(" · ");
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
          // Kept for pricing; receipt/cart UI filters the duplicate name
          options: [addon.name],
          choiceSelections: [],
          customDataSelections: [],
          addonChoiceSelections: addonChoices,
          preparationStyle: null,
          noteWithout: "",
          noteAdd: "",
          notes: "",
          category: product.category,
          categoryName: product.categoryName,
          productType: product.productType,
          modifier: choiceSummary || undefined,
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

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {product.description ? (
            <p className="text-sm leading-relaxed text-zinc-600">
              {product.description}
            </p>
          ) : null}

          {(() => {
            const sectionIds = [
              ...(variants.length > 0 ? ["variants"] : []),
              ...customDataGroups.map(
                (group, i) => `custom-${i}-${group.name}`,
              ),
              ...choiceOptions.map((group, i) => `choice-${i}-${group.name}`),
              ...(prepStyles.length > 0 ? ["preparation"] : []),
              ...(addons.length > 0 ? ["addons"] : []),
            ];
            const defaultOpen = sectionIds[0] ? [sectionIds[0]] : [];

            return (
              <Accordion
                key={productId || "product-config"}
                type="multiple"
                defaultValue={defaultOpen}
                className="space-y-3"
              >
                {variants.length > 0 ? (
                  <AccordionItem value="variants" className={accordionItemClass}>
                    <AccordionTrigger className={accordionTriggerClass}>
                      Variants
                    </AccordionTrigger>
                    <AccordionContent className={accordionContentClass}>
                      <div className="hidden gap-1 border-b border-zinc-100 px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 sm:flex">
                        <div className="min-w-[100px] flex-1">Option</div>
                        <div className="w-28 text-center">Qty</div>
                        <div className="w-20 text-right">Price</div>
                      </div>
                      <div className="mt-2 grid gap-2">
                        {variants.map((v, idx) => {
                          const key = String(idx);
                          const qty = Number(variantQtyBySize[key]) || 0;
                          const price = Number(v.price) || 0;
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
                              <IngredientChips
                                ingredients={v.ingredients}
                                label="Includes"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}

                {customDataGroups.map((group, groupIndex) => {
                  const value = `custom-${groupIndex}-${group.name}`;
                  return (
                    <AccordionItem
                      key={value}
                      value={value}
                      className={accordionItemClass}
                    >
                      <AccordionTrigger className={accordionTriggerClass}>
                        {group.name}
                      </AccordionTrigger>
                      <AccordionContent className={accordionContentClass}>
                        <div className="space-y-4">
                          {group.subChoices.map((option) => {
                            const selected =
                              customDataSelections[group.name]?.[option.name] ||
                              [];
                            return (
                              <div
                                key={`${group.name}-${option.name}`}
                                className="space-y-2"
                              >
                                <p className="text-[12px] font-bold uppercase tracking-wide text-zinc-500">
                                  {option.name}
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  {(option.choices || []).map((choice) => {
                                    const checked = selected.includes(choice);
                                    return (
                                      <label
                                        key={`${group.name}-${option.name}-${choice}`}
                                        className={cn(
                                          "flex cursor-pointer items-center rounded-lg border p-3 transition-colors",
                                          checked
                                            ? "border-violet-500 bg-violet-50/30"
                                            : "border-zinc-200 hover:border-violet-300",
                                        )}
                                      >
                                        <div className="flex flex-1 items-center gap-3 text-[14px] font-bold text-zinc-800">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                              toggleCustomDataChoice(
                                                group.name,
                                                option.name,
                                                choice,
                                              )
                                            }
                                            className="h-4 w-4 accent-violet-500"
                                          />
                                          <span>{choice}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}

                {choiceOptions.map((group, groupIndex) => {
                  const multi = (group.subChoices || []).length > 2;
                  const selected = choiceSelections[group.name] || [];
                  const value = `choice-${groupIndex}-${group.name}`;
                  return (
                    <AccordionItem
                      key={value}
                      value={value}
                      className={accordionItemClass}
                    >
                      <AccordionTrigger className={accordionTriggerClass}>
                        {group.name}
                      </AccordionTrigger>
                      <AccordionContent className={accordionContentClass}>
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
                                  onChange={() =>
                                    toggleChoice(group.name, sub, multi)
                                  }
                                  className="h-4 w-4 accent-orange-600"
                                />
                                {sub}
                              </label>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}

                {prepStyles.length > 0 ? (
                  <AccordionItem
                    value="preparation"
                    className={accordionItemClass}
                  >
                    <AccordionTrigger className={accordionTriggerClass}>
                      Preparation
                    </AccordionTrigger>
                    <AccordionContent className={accordionContentClass}>
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
                    </AccordionContent>
                  </AccordionItem>
                ) : null}

                {addons.length > 0 ? (
                  <AccordionItem value="addons" className={accordionItemClass}>
                    <AccordionTrigger className={accordionTriggerClass}>
                      Addons
                    </AccordionTrigger>
                    <AccordionContent className={accordionContentClass}>
                      <div className="grid gap-2">
                        {addons.map((addon, index) => {
                          const key = addonKey(addon, index);
                          const entry = addonQtyById[key];
                          const qty = Number(entry?.qty) || 0;
                          const price = Number(addon.price) || 0;
                          const nested = normalizeChoiceOptions(
                            addon.choiceOptions,
                          );
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
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold text-zinc-800">
                                    {addon.name}
                                  </div>
                                  {addon.fromCategory ? (
                                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                      Linked from category
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-3">
                                  <QtyStepper
                                    value={qty}
                                    onChange={(next) =>
                                      setAddonQty(key, addon, next)
                                    }
                                  />
                                  <div className="w-16 text-right text-sm font-bold tabular-nums text-zinc-900">
                                    +${price.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <IngredientChips
                                ingredients={addon.ingredients}
                                label="Addon includes"
                              />

                              {nested.length > 0 ? (
                                <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
                                  {qty <= 0 ? (
                                    <p className="text-[11px] font-semibold text-zinc-400">
                                      Set addon quantity above to choose options
                                    </p>
                                  ) : null}
                                  {nested.map((group, groupIndex) => {
                                    const qtyMap = normalizeAddonChoiceQtyMap(
                                      entry?.choicesByGroup?.[groupIndex],
                                    );
                                    const selectedTotal =
                                      sumAddonChoiceQtyMap(qtyMap);
                                    const mismatch =
                                      qty > 0 && selectedTotal !== qty;
                                    const over = selectedTotal > qty;
                                    return (
                                      <div
                                        key={group.name}
                                        className="space-y-2"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                            {group.name}
                                          </p>
                                          <p
                                            className={cn(
                                              "text-[11px] font-bold tabular-nums",
                                              mismatch
                                                ? "text-red-600"
                                                : selectedTotal === qty &&
                                                    qty > 0
                                                  ? "text-emerald-600"
                                                  : "text-zinc-400",
                                            )}
                                          >
                                            {selectedTotal} / {qty} selected
                                          </p>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                          {group.subChoices.map((sub) => {
                                            const subQty =
                                              Number(qtyMap[sub]) || 0;
                                            const others =
                                              selectedTotal - subQty;
                                            const maxForSub = Math.max(
                                              0,
                                              qty - Math.max(0, others),
                                            );
                                            return (
                                              <div
                                                key={sub}
                                                className={cn(
                                                  "flex flex-wrap items-center justify-between gap-3 rounded-md border px-2.5 py-2",
                                                  subQty > 0
                                                    ? "border-primary bg-white"
                                                    : "border-zinc-200 bg-white",
                                                  qty <= 0 && "opacity-50",
                                                )}
                                              >
                                                <span className="text-xs font-semibold text-zinc-800">
                                                  {sub}
                                                </span>
                                                <QtyStepper
                                                  value={subQty}
                                                  min={0}
                                                  max={maxForSub}
                                                  onChange={(next) =>
                                                    setAddonSubChoiceQty(
                                                      key,
                                                      addon,
                                                      groupIndex,
                                                      sub,
                                                      next,
                                                    )
                                                  }
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                        {mismatch ? (
                                          <p className="text-[11px] font-semibold text-red-600">
                                            {over
                                              ? `Too many selections (${selectedTotal}). Must equal addon qty (${qty}).`
                                              : `Select more options (${selectedTotal} of ${qty}). Nested choices must match addon quantity.`}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}

              </Accordion>
            );
          })()}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-zinc-50 px-5 py-4">
          {addonChoiceErrors.length > 0 ? (
            <p className="text-[12px] font-semibold text-red-600">
              {addonChoiceErrors[0].message}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
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
                disabled={
                  (variantEntries.length === 0 && addonEntries.length === 0) ||
                  addonChoiceErrors.length > 0
                }
                className="h-11 rounded-xl bg-primary px-6 font-bold text-white hover:bg-primary-hover"
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
