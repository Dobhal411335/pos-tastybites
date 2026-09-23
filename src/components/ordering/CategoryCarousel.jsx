"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePublicMenu } from "@/hooks/usePublicMenu";
import { productImageSrc } from "@/lib/public/productImage";
import { LANDING_CATEGORY_LIMIT } from "@/lib/public/landingMenu";

export default function CategoryCarousel() {
  const { categories, loading } = usePublicMenu();
  const [track, setTrack] = useState(null);
  const visible = categories.slice(0, LANDING_CATEGORY_LIMIT);

  const scrollBy = useCallback(
    (delta) => {
      track?.scrollBy({ left: delta, behavior: "smooth" });
    },
    [track]
  );

  if (!loading && categories.length === 0) return null;

  return (
    <section className="w-full bg-[var(--customer-surface)] py-10" id="explore-menu">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Browse Selections
            </span>
            <h2 className="text-2xl font-extrabold text-[var(--customer-ink)] sm:text-3xl">
              Explore Our Menu
            </h2>
            <p className="text-sm text-[var(--customer-muted)]">
              Find something you&apos;ll love — then pick up the same day.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous categories"
              onClick={() => scrollBy(-300)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]/30 bg-white text-[var(--customer-ink)] shadow-sm transition-colors hover:bg-[var(--customer-surface-container)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next categories"
              onClick={() => scrollBy(300)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]/30 bg-white text-[var(--customer-ink)] shadow-sm transition-colors hover:bg-[var(--customer-surface-container)]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-48 w-44 shrink-0 animate-pulse rounded-xl bg-[var(--customer-surface-container)]"
              />
            ))}
          </div>
        ) : (
          <div
            ref={setTrack}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-none"
          >
            {visible.map((cat) => (
              <Link
                key={cat.id}
                href={`/menu?category=${encodeURIComponent(cat.slug)}`}
                className="group w-48 shrink-0 overflow-hidden rounded-xl border border-[var(--border)]/20 bg-white shadow-sm transition-all hover:shadow-md sm:w-48"
              >
                <div className="relative h-32 overflow-hidden bg-[var(--customer-surface-container)]">
                  <Image
                    src={productImageSrc(cat)}
                    alt={cat.name}
                    fill
                    sizes="192px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-3 text-center">
                  <h3 className="text-sm font-bold text-[var(--customer-ink)] transition-colors group-hover:text-primary">
                    {cat.name}
                  </h3>
                  <span className="mt-1 inline-block rounded-full bg-[var(--customer-surface-container)] px-2 py-0.5 text-[11px] font-semibold text-[var(--customer-muted)]">
                    {cat.items} {cat.items === 1 ? "item" : "items"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
