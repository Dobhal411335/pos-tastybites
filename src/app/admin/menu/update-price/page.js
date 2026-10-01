"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PALETTE } from "@/utils/paletteeColor";

function getCategoryId(product) {
  if (!product?.category) return "";
  return typeof product.category === "object"
    ? String(product.category._id || "")
    : String(product.category);
}

function formatPreviewPrices(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return "No sizes priced yet";
  return variants
    .map((v) => `${v.size || "Size"}: $${Number(v.price || 0).toFixed(2)}`)
    .join(" · ");
}

export default function UpdateProductPricePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [activeTab, setActiveTab] = useState("category");
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [percent, setPercent] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingPercent, setPendingPercent] = useState(null);

  const fetchInitialData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/products"),
      ]);
      const catJson = await catRes.json();
      const prodJson = await prodRes.json();

      if (catJson.success) setCategories(catJson.data || []);
      if (prodJson.success) setProducts(prodJson.data || []);
      if (!catJson.success || !prodJson.success) {
        toast.error("Failed to load menu data.");
      }
    } catch {
      toast.error("Failed to load menu data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const productsInCategory = useMemo(() => {
    if (!categoryId) return [];
    return products.filter((p) => getCategoryId(p) === categoryId);
  }, [products, categoryId]);

  const selectedProduct = useMemo(
    () => productsInCategory.find((p) => String(p._id) === productId) || null,
    [productsInCategory, productId]
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c._id) === categoryId) || null,
    [categories, categoryId]
  );

  const previewProducts = useMemo(() => {
    if (activeTab === "product") {
      return selectedProduct ? [selectedProduct] : [];
    }
    return productsInCategory;
  }, [activeTab, selectedProduct, productsInCategory]);

  const confirmScopeLabel = useMemo(() => {
    if (activeTab === "product") {
      return `product "${selectedProduct?.name || "selected"}"`;
    }
    return `all products in "${selectedCategory?.name || "selected category"}" (${productsInCategory.length})`;
  }, [activeTab, selectedProduct, selectedCategory, productsInCategory.length]);

  const handleCategoryChange = (value) => {
    setCategoryId(value);
    setProductId("");
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setProductId("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const percentValue = Number(percent);
    if (!Number.isFinite(percentValue) || percentValue === 0) {
      toast.error("Enter a non-zero percent value (e.g. 10 or -5).");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category.");
      return;
    }
    if (activeTab === "product" && !productId) {
      toast.error("Please select a product.");
      return;
    }

    setPendingPercent(percentValue);
    setIsConfirmOpen(true);
  };

  const applyPriceUpdate = async () => {
    const percentValue = pendingPercent;
    if (!Number.isFinite(percentValue) || percentValue === 0) {
      setIsConfirmOpen(false);
      return;
    }

    setIsConfirmOpen(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/menu/products/update-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percent: percentValue,
          mode: activeTab === "product" ? "product" : "category",
          categoryId,
          productId: activeTab === "product" ? productId : undefined,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Failed to update prices.");
        return;
      }

      const updated = json.data?.updatedCount ?? 0;
      const skipped = json.data?.skippedCount ?? 0;
      toast.success(
        skipped > 0
          ? `Updated ${updated} product(s). Skipped ${skipped} with no size prices.`
          : `Updated ${updated} product(s).`
      );

      await fetchInitialData();
    } catch {
      toast.error("Failed to update prices.");
    } finally {
      setSubmitting(false);
      setPendingPercent(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-[32px] font-bold leading-tight"
          style={{ color: PALETTE.ink }}
        >
          Update Product Price
        </h1>
        <p className="text-[15px] mt-1" style={{ color: PALETTE.inkMuted }}>
          Increase or decrease variant prices by percent for a whole category or a
          single product. Changes apply to online orders and POS.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md bg-white border border-zinc-500 p-1 h-12 rounded-lg">
            <TabsTrigger
              value="category"
              className="rounded-md font-bold text-[14px] data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-900"
            >
              By Category
            </TabsTrigger>
            <TabsTrigger
              value="product"
              className="rounded-md font-bold text-[14px] data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-900"
            >
              By Product
            </TabsTrigger>
          </TabsList>

          <TabsContent value="category" className="pt-6 space-y-4">
            <div className="space-y-2 max-w-md">
              <label className="text-[14px] font-semibold text-zinc-900">
                Category <span className="text-red-500">*</span>
              </label>
              <Select value={categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60 overflow-y-auto">
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={String(cat._id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryId && (
                <p className="text-sm text-zinc-500">
                  {productsInCategory.length} product(s) in this category will be
                  updated.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="product" className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-zinc-900">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select value={categoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60 overflow-y-auto">
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={String(cat._id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-zinc-900">
                  Product <span className="text-red-500">*</span>
                </label>
                <Select
                  value={productId}
                  onValueChange={setProductId}
                  disabled={!categoryId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue
                      placeholder={
                        categoryId ? "Select product" : "Select a category first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60 overflow-y-auto">
                    {productsInCategory.map((product) => (
                      <SelectItem key={product._id} value={String(product._id)}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2 max-w-md">
          <label className="text-[14px] font-semibold text-zinc-900">
            Percent change (%) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 10 or -5"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className="h-11 pl-9"
            />
          </div>
          <p className="text-sm text-zinc-500">
            Positive = increase, negative = decrease by the same factor (so +10 then
            -10 restores the prior price). Applies to size/variant prices only.
          </p>
        </div>

        {previewProducts.length > 0 && (
          <Card className="border-zinc-200 shadow-none max-w-3xl">
            <CardContent className="pt-6 space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                Current prices preview
              </h3>
              <ul className="space-y-2">
                {previewProducts.slice(0, 8).map((product) => (
                  <li
                    key={product._id}
                    className="text-sm text-zinc-700 flex flex-col sm:flex-row sm:gap-2"
                  >
                    <span className="font-semibold min-w-40">{product.name}</span>
                    <span className="text-zinc-500">
                      {formatPreviewPrices(product)}
                    </span>
                  </li>
                ))}
              </ul>
              {previewProducts.length > 8 && (
                <p className="text-xs text-zinc-400">
                  Showing 8 of {previewProducts.length} products.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="h-11 px-6 font-bold text-white"
          style={{ backgroundColor: PALETTE.accent }}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating…
            </>
          ) : (
            "Update Prices"
          )}
        </Button>
      </form>

      <Dialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);
          if (!open) setPendingPercent(null);
        }}
      >
        <DialogContent className="rounded-3xl p-6 border-slate-100 shadow-xl bg-white max-w-md font-sans gap-0">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-slate-800">
              Confirm Price Update
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              Apply{" "}
              <span className="font-semibold text-slate-800">
                {pendingPercent}%
              </span>{" "}
              to {confirmScopeLabel}? Positive values increase; negative values
              reverse by the same factor. This updates online and POS prices.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsConfirmOpen(false)}
              disabled={submitting}
              className="h-11 rounded-xl border text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={applyPriceUpdate}
              disabled={submitting}
              className="h-11 rounded-xl text-white hover:opacity-90 px-6 font-medium"
              style={{ backgroundColor: PALETTE.accent }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating…
                </>
              ) : (
                "Confirm Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
