"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PromoGrid() {
  const promos = [
    {
      id: "promo-1",
      title: "Family Feasts",
      tagline: "Up to 25% Off Bundles",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop",
    },
    {
      id: "promo-2",
      title: "Gourmet Wraps",
      tagline: "Buy 1 Get 1 Free Tuesdays",
      image: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?q=80&w=600&auto=format&fit=crop",
    },
    {
      id: "promo-3",
      title: "Crispy Platters",
      tagline: "Includes bottomless fries",
      image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?q=80&w=600&auto=format&fit=crop",
    },
    {
      id: "promo-4",
      title: "Premium Burgers",
      tagline: "Double stack special deal",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
    },
  ];

  const handleAddToCart = (promoTitle) => {
    toast.success(`${promoTitle} added to order.`);
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Row 1: Promos 1, 2, 3 */}
        {promos.slice(0, 3).map((promo) => (
          <div
            key={promo.id}
            className="group relative h-[280px] rounded-xl overflow-hidden shadow-sm border border-zinc-205 flex flex-col justify-end p-6"
          >
            {/* Backdrop Image */}
            <Image
              src={promo.image}
              alt={promo.title}
              fill
              sizes="(max-w-7xl) 33vw, 100vw"
              className="object-cover"
            />
            {/* Soft Warm Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-zinc-950/80 via-zinc-950/30 to-transparent"></div>
            
            {/* Content */}
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight font-serif">
                  {promo.title}
                </h3>
                <p className="text-xs text-zinc-300 font-medium tracking-wide uppercase mt-1">
                  {promo.tagline}
                </p>
              </div>

              <Button
                onClick={() => handleAddToCart(promo.title)}
                className="w-full bg-white hover:bg-zinc-100 text-zinc-950 font-bold py-5 rounded-none shadow-sm transition-all text-xs uppercase tracking-widest"
              >
                Add To Cart
              </Button>
            </div>
          </div>
        ))}

        {/* Row 2: Promo 4 + Info Box */}
        {/* Promo 4 */}
        <div className="group relative h-[280px] rounded-xl overflow-hidden shadow-sm border border-zinc-205 flex flex-col justify-end p-6 md:col-span-1">
          <Image
            src={promos[3].image}
            alt={promos[3].title}
            fill
            sizes="(max-w-7xl) 33vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-zinc-950/80 via-zinc-950/30 to-transparent"></div>
          
          <div className="relative z-10 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight font-serif">
                {promos[3].title}
              </h3>
              <p className="text-xs text-zinc-300 font-medium tracking-wide uppercase mt-1">
                {promos[3].tagline}
              </p>
            </div>

            <Button
              onClick={() => handleAddToCart(promos[3].title)}
              className="w-full bg-white hover:bg-zinc-100 text-zinc-950 font-bold py-5 rounded-none shadow-sm transition-all text-xs uppercase tracking-widest"
            >
              Add To Cart
            </Button>
          </div>
        </div>

        {/* Info Block */}
        <div className="rounded-xl border border-zinc-200 bg-white p-8 flex flex-col justify-center space-y-4 md:col-span-2 h-[280px]">
          <span className="text-xs font-bold uppercase tracking-widest text-[#12A594]">
            Seasonal Offers
          </span>
          <h3 className="text-2xl md:text-3xl font-normal tracking-tight text-zinc-900 font-serif">
            Big Flavor, Little Price Tag.
          </h3>
          <p className="text-xs md:text-sm text-zinc-500 leading-relaxed font-light">
            Escape the ordinary and treat yourself to a culinary experience that feels just like home—only better. We are thrilled to share our latest seasonal offer, designed to give you more comfort for less.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-none px-6 py-5 font-bold transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
            >
              <span>Explore More</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
}
