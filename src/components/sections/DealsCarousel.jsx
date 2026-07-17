"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DealsCarousel() {
  const scrollRef = useRef(null);

  const deals = [
    {
      id: "deal-1",
      name: "Delicious Cheese Burger Set",
      price: "$15.00",
      originalPrice: "$22.00",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&auto=format&fit=crop",
      badge: "Save 30%",
    },
    {
      id: "deal-2",
      name: "Super Wrap & Dip Platter",
      price: "$16.00",
      originalPrice: "$24.00",
      image: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?q=80&w=400&auto=format&fit=crop",
      badge: "Best Seller",
    },
    {
      id: "deal-3",
      name: "Crispy Fingers & Golden Fries",
      price: "$9.99",
      originalPrice: "$14.99",
      image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?q=80&w=400&auto=format&fit=crop",
      badge: "Chef Specialty",
    },
    {
      id: "deal-4",
      name: "Ultimate Chicken Feast",
      price: "$15.00",
      originalPrice: "$20.00",
      image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?q=80&w=400&auto=format&fit=crop",
      badge: "Special Offer",
    },
  ];

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - 320 : scrollLeft + 320;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  const handleClaim = (dealName) => {
    toast.success(`${dealName} added to order!`);
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
      {/* Title + Controls */}
      <div className="flex items-end justify-between mb-10">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#12A594]">
            Limited Time Offers
          </span>
          <h2 className="text-3xl font-normal tracking-tight text-zinc-900 font-serif">
            Your Perfect Deal Awaits.
          </h2>
          <div className="w-12 h-px bg-zinc-300"></div>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleScroll("left")}
            variant="outline"
            size="icon"
            className="rounded-none h-10 w-10 border-zinc-200 text-zinc-700 hover:bg-zinc-55"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => handleScroll("right")}
            variant="outline"
            size="icon"
            className="rounded-none h-10 w-10 border-zinc-200 text-zinc-700 hover:bg-zinc-55"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Slider Viewport */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-none pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="min-w-[280px] sm:min-w-[310px] max-w-[310px] snap-start flex flex-col justify-between rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden"
          >
            {/* Image Box */}
            <div className="relative h-[200px] w-full bg-zinc-100">
              <Image
                src={deal.image}
                alt={deal.name}
                fill
                sizes="(max-w-7xl) 300px, 100vw"
                className="object-cover"
              />
              <div className="absolute top-3 left-3 bg-[#0F6B7A] text-white px-2 py-0.5 text-[9px] uppercase font-black tracking-widest">
                {deal.badge}
              </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <h3 className="font-bold text-zinc-900 text-sm font-serif line-clamp-1">
                {deal.name}
              </h3>
              
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-zinc-900">
                    {deal.price}
                  </span>
                  <span className="text-xs text-zinc-400 line-through ml-2">
                    {deal.originalPrice}
                  </span>
                </div>

                <Button
                  onClick={() => handleClaim(deal.name)}
                  size="sm"
                  className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-none px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
                >
                  Claim
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
