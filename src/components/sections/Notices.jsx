"use client";

import React from "react";
import { Compass, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Notices() {
  const notices = [
    {
      id: "heli-tour",
      icon: Compass,
      heading: "Two Sacred Dhams. One Divine Day. Zero Compromise.",
      text: "Why spend days trekking when you can witness the majesty of the Himalayas in a single, seamless journey? Our Exclusive Same-Day Heli Tour is meticulously engineered for those who value both their time and their spiritual calling.",
      btnText: "Know More",
      colorClass: "bg-[#FAF9F6] border-zinc-200 text-zinc-800",
      iconColor: "text-[#0F6B7A]",
    },
    {
      id: "predictive-rec",
      icon: Sparkles,
      heading: "We don't just suggest we predict.",
      text: "Based on your current interests, we've gathered a collection of insights and products designed to complement your style. Whether you're looking to dive deeper into this topic or find the perfect finishing touch, these recommendations are tailored to meet you right where you are.",
      btnText: "Apply",
      colorClass: "bg-[#F5F6F8] border-zinc-200 text-zinc-800",
      iconColor: "text-[#12A594]",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-6 sm:px-8 flex flex-col gap-6">
      {notices.map((notice) => {
        const IconComponent = notice.icon;
        return (
          <div
            key={notice.id}
            className={`flex flex-col md:flex-row items-start md:items-center justify-between p-8 rounded-xl border ${notice.colorClass} shadow-sm gap-6 transition-all duration-200 hover:shadow-md`}
          >
            {/* Left Content */}
            <div className="flex items-start gap-5 flex-1">
              <div className="p-3 rounded-lg bg-white border border-zinc-200 shadow-xs shrink-0 mt-0.5">
                <IconComponent className={`h-5 w-5 ${notice.iconColor}`} />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-base text-zinc-950 font-serif">
                  {notice.heading}
                </h4>
                <p className="text-xs text-zinc-550 leading-relaxed font-light">
                  {notice.text}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="shrink-0 self-end md:self-center">
              <Button
                variant="outline"
                className="bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-800 font-bold px-6 py-5 rounded-none text-xs uppercase tracking-widest transition-all shadow-xs"
              >
                <span>{notice.btnText}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
