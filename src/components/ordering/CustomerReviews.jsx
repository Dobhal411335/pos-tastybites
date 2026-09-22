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

function StarRating({ stars = 5 }) {
  const filled = Math.min(5, Math.max(0, Number(stars) || 0));
  return (
    <div className="flex items-center gap-1 text-primary">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < filled ? "fill-primary text-primary" : "text-[var(--border)]"
          }`}
        />
      ))}
    </div>
  );
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

  return (
    <section className="w-full bg-[var(--customer-surface-low)] py-14">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="mb-8 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Community Voices
            </span>
            <h2 className="text-2xl font-extrabold text-[var(--customer-ink)] sm:text-3xl">
              What Our Customers Say
            </h2>
          </div>
          <span className="text-xs font-medium text-[var(--customer-muted)]">
            Guests who ordered online for pickup at {brandName}
          </span>
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
              {reviews.map((item) => (
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
                    <div className="flex items-center justify-between border-t border-[var(--border)]/20 pt-2">
                      <div>
                        <span className="block text-xs font-bold text-[var(--customer-ink)]">
                          {item.name}
                        </span>
                        {item.designation ? (
                          <span className="text-[11px] text-[var(--customer-muted)]">
                            {item.designation}
                          </span>
                        ) : null}
                      </div>
                      <BadgeCheck className="h-[18px] w-[18px] text-primary" />
                    </div>
                  </article>
                </CarouselItem>
              ))}
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
