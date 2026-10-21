"use client";

import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { BadgeCheck, Star } from "lucide-react";

import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

function StarRating({ stars = 5, size = "h-4 w-4" }) {
  const rating = Number(stars) || 0;
  return (
    <div className="flex items-center gap-1 text-primary">
      {Array.from({ length: 5 }).map((_, index) => {
        const fillAmount = Math.max(0, Math.min(1, rating - index));
        return (
          <Star
            key={index}
            className={`${size} ${
              fillAmount >= 0.75
                ? "fill-primary text-primary"
                : fillAmount >= 0.25
                  ? "fill-primary/50 text-primary"
                  : "text-[var(--border)]"
            }`}
          />
        );
      })}
    </div>
  );
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CustomerReviews() {
  const { restaurant } = useRestaurantPublic();
  const brandName = restaurant?.name || "Tasty Bites";
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadReviews = async () => {
      try {
        const res = await fetch("/api/web/customerReviews?active=1");
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Failed to load reviews");
        }
        if (!cancelled) {
          setReviews(Array.isArray(result.data) ? result.data : []);
        }
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadReviews();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoading && reviews.length === 0) {
    return null;
  }

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (
          reviews.reduce((acc, r) => acc + (Number(r.stars) || 0), 0) /
          totalReviews
        ).toFixed(1)
      : "5.0";

  return (
    <section className="w-full bg-[var(--customer-surface-low)] py-14">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Community Voices
            </span>
            <h2 className="text-2xl font-extrabold text-[var(--customer-ink)] sm:text-3xl">
              What Our Customers Say
            </h2>
            <p className="mt-1 text-xs font-medium text-[var(--customer-muted)]">
              Guests who ordered online for pickup at {brandName}
            </p>
          </div>

          {totalReviews > 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)]/20 bg-white px-4 py-3 shadow-sm">
              <span className="text-2xl font-black text-[var(--customer-ink)]">
                {avgRating}
              </span>
              <div className="flex flex-col gap-0.5">
                <StarRating stars={Number(avgRating)} size="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold text-[var(--customer-muted)]">
                  Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl border border-[var(--border)]/20 bg-white"
              />
            ))}
          </div>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: reviews.length > 1,
            }}
            plugins={[
              Autoplay({
                delay: 4500,
                stopOnInteraction: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {reviews.map((item) => {
                const imageUrl =
                  typeof item.image === "string"
                    ? item.image
                    : item.image?.url || "";

                return (
                  <CarouselItem
                    key={item._id}
                    className="basis-full pl-4 md:basis-1/2 lg:basis-1/3"
                  >
                    <article className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-[var(--border)]/20 bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-2.5">
                        <StarRating stars={item.stars} />
                        <p className="text-xs italic leading-relaxed text-[var(--customer-ink)] sm:text-sm">
                          “{item.review}”
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[var(--border)]/20 pt-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className="size-15 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
                            />
                          ) : (
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-2 ring-primary/20">
                              {getInitials(item.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="block truncate text-md font-bold text-[var(--customer-ink)]">
                              {item.name}
                            </span>
                            {item.designation ? (
                              <span className="block truncate text-[11px] text-[var(--customer-muted)]">
                                {item.designation}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <BadgeCheck className="ml-2 h-[18px] w-[18px] shrink-0 text-primary" />
                      </div>
                    </article>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {reviews.length > 1 ? (
              <>
                <CarouselPrevious className="left-0 top-1/2 z-10 hidden size-9 -translate-y-1/2 border-0 bg-white text-[var(--customer-ink)] shadow-md hover:bg-white md:-left-4 md:flex" />
                <CarouselNext className="right-0 top-1/2 z-10 hidden size-9 -translate-y-1/2 border-0 bg-white text-[var(--customer-ink)] shadow-md hover:bg-white md:-right-4 md:flex" />
              </>
            ) : null}
          </Carousel>
        )}
      </div>
    </section>
  );
}
