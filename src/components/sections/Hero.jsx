"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative w-full h-[500px] md:h-[650px] bg-zinc-950 flex items-center justify-center overflow-hidden">
      {/* Background Image: Premium Food-Focused/Dining Focus */}
      <Image
        src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop"
        alt="Premium Dining"
        fill
        priority
        className="object-cover opacity-60"
      />
      
      {/* Dark Subtle Warm Overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-zinc-950/80 via-zinc-950/40 to-zinc-950/20"></div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 sm:px-8 text-center space-y-6">
        <span className="text-xs font-bold uppercase tracking-widest text-[#12A594]">
          The Challenge
        </span>
        
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-[1.15] text-white tracking-tight font-serif max-w-4xl mx-auto">
          Most Strategic Decisions Are Made With Insufficient Clarity.
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto font-light leading-relaxed">
          Executives face compounding complexity — market disruption, organisational inertia, data overload. Without a structured framework, the highest-stakes decisions rely on instinct alone.
        </p>

        {/* <div className="pt-4">
          <Button
            asChild
            className="bg-white hover:bg-zinc-100 text-zinc-950 font-bold px-8 py-6 rounded-none text-xs uppercase tracking-widest transition-all"
          >
            <a href="#booking">Pay With Cash</a>
          </Button>
        </div> */}
      </div>
    </section>
  );
}
