"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { usePublicMenu } from "@/hooks/usePublicMenu";
import { useCart } from "@/context/CartContext";
import ProductConfigModal from "@/components/menu/ProductConfigModal";
import ProductDetailModal from "@/components/menu/ProductDetailModal";
import { productImageSrc } from "@/lib/public/productImage";
import { pickLandingProducts } from "@/lib/public/landingMenu";
import { toast } from "sonner";

function productNeedsConfig(product) {
  if (!product) return false;
  if (product.hasModifiers) return true;
  const variants = product.variants || [];
  const addons = product.addons || [];
  const choices = product.choiceOptions || [];
  return variants.length > 1 || addons.length > 0 || choices.length > 0;
}

export default function BrowseMenuLanding() {
  const { products, loading } = usePublicMenu();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState("all");
  const [activeProduct, setActiveProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);

  const landingProducts = useMemo(() => pickLandingProducts(products), [products]);
  const filtered = useMemo(() => {
    if (activeTab === "all") return landingProducts;
    return landingProducts.filter(
      (p) => String(p.category).toLowerCase() === String(activeTab).toLowerCase()
    );
  }, [landingProducts, activeTab]);

  const handleAdd = useCallback(
    (product) => {
      if (productNeedsConfig(product)) {
        setActiveProduct(product);
        return;
      }
      const sizeName = product.variants?.[0]?.size || "Standard";
      const unitPrice = Number(product.variants?.[0]?.price ?? product.price) || 0;
      const cartKey = `${product.id}-${sizeName}`.replace(/\s+/g, "-");
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
          selectedAddons: [],
          options: [],
          choiceSelections: [],
          category: product.category,
          categoryName: product.categoryName,
          productType: product.productType,
        },
        1
      );
      toast.success(`${product.name} added to cart`);
    },
    [addToCart]
  );

  return (
    <section className="w-full bg-[var(--customer-surface)] py-14" id="browse-menu">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="mb-6 flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Full Culinary Catalog
          </span>
          <h2 className="text-2xl font-extrabold text-[var(--customer-ink)] sm:text-3xl">
            More Delicious Choices
          </h2>
          <p className="text-sm text-[var(--customer-muted)]">
            A selection from our menu — open the full menu for every dish.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-[var(--customer-surface-container)]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--customer-muted)]">
            No dishes in this category yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((product) => (
              <article
                key={product.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)]/20 bg-white shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="relative h-66 md:h-48 overflow-hidden bg-[var(--customer-surface-container)]">
                    <Image
                      src={productImageSrc(product)}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label={`View details for ${product.name}`}
                        onClick={() => setDetailProduct(product)}
                        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[var(--customer-ink)] shadow-md transition-transform hover:scale-105 hover:bg-white"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">
                        {product.categoryName || "Menu"}
                      </span>
                      <span className="text-base font-bold tabular-nums text-[var(--customer-ink)]">
                        ${Number(product.price || 0).toFixed(2)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--customer-ink)]">
                      {product.name}
                    </h3>
                    <p className="line-clamp-2 text-xs text-[var(--customer-muted)]">
                      {product.description || "Made fresh to order."}
                    </p>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => handleAdd(product)}
                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--customer-surface-container)] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--customer-ink)] transition-all hover:bg-primary hover:text-white"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Link
            href="/menu"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)]/40 bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--customer-ink)] shadow-sm transition-all hover:bg-[var(--customer-surface-container)]"
          >
            <UtensilsCrossed className="h-[18px] w-[18px] text-primary" />
            <span>View Full Menu</span>
            <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
              {products.filter((p) => p.available !== false).length || "All"} Items
            </span>
          </Link>
        </div>
      </div>

      <ProductDetailModal
        isOpen={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        product={detailProduct}
        onAdd={() => {
          const product = detailProduct;
          setDetailProduct(null);
          if (product) handleAdd(product);
        }}
      />

      {activeProduct ? (
        <ProductConfigModal
          key={activeProduct?.id || activeProduct?._id || "config"}
          isOpen={!!activeProduct}
          onClose={() => setActiveProduct(null)}
          product={activeProduct}
        />
      ) : null}
    </section>
  );
}
