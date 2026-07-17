"use client";

import React from "react";
import Image from "next/image";

export default function AboutUs() {
  const images = [
    {
      url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=600&auto=format&fit=crop",
      title: "Chef's Craftsmanship",
      desc: "Our chefs prepare every dish with precision and passion.",
    },
    {
      url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop",
      title: "Stunning Plating",
      desc: "Every dish is curated to be a visual and culinary delight.",
    },
    {
      url: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=600&auto=format&fit=crop",
      title: "Honestly Sourced",
      desc: "We partner with local farms to source organic, fresh ingredients.",
    },
    {
      url: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop",
      title: "Premium Experience",
      desc: "A warm, welcoming atmosphere designed for lasting memories.",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 md:py-24">
      {/* Heading Group */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-[#12A594]">
          Our Philosophy
        </span>
        <h2 className="text-3xl sm:text-4xl font-normal text-zinc-900 tracking-tight font-serif">
          Simply Delicious, Honestly Sourced.
        </h2>
        <div className="w-12 h-[2px] bg-zinc-300 mx-auto"></div>
        <p className="text-sm md:text-base text-zinc-500 leading-relaxed font-light">
          Great food is more than just sustenance; it is a sensory experience that tells a story of quality, passion, and care.
        </p>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {images.map((item, index) => (
          <div
            key={index}
            className="group overflow-hidden rounded-xl bg-white border border-zinc-200 shadow-sm transition-all duration-300 hover:shadow-md"
          >
            {/* Image Wrap */}
            <div className="relative w-full h-[240px] overflow-hidden">
              <Image
                src={item.url}
                alt={item.title}
                fill
                sizes="(max-w-7xl) 25vw, 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-102"
              />
            </div>

            {/* Content info */}
            <div className="p-5 bg-white space-y-1">
              <h3 className="font-bold text-zinc-900 text-sm font-serif">
                {item.title}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-light">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
