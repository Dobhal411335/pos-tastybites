"use client";

import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";

export default function PopUpBanner() {
  const { restaurant } = useRestaurantPublic();
  const [banner, setBanner] = useState(null);
  const [open, setOpen] = useState(false);
  const [showAnim, setShowAnim] = useState(false);

  useEffect(() => {
    const first = restaurant?.popups?.[0];
    if (first) setBanner(first);
  }, [restaurant]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => {
      setOpen(true);
      setTimeout(() => setShowAnim(true), 10);
    }, 2000);
    return () => clearTimeout(timer);
  }, [banner]);

  const handleClose = () => {
    setShowAnim(false);
    setTimeout(() => setOpen(false), 200);
  };

  if (!banner || !open) return null;

  const imageUrl =
    typeof banner.image === "string" ? banner.image : banner.image?.url || "";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div
        className={`relative w-full max-w-lg rounded-2xl bg-white overflow-hidden shadow-2xl transition-all duration-200 ${
          showAnim ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center text-zinc-700"
          aria-label="Close promotion"
        >
          <X className="h-5 w-5" />
        </button>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-48 object-cover" />
        )}
        <div className="p-6 space-y-3">
          {banner.heading && (
            <h2 className="text-xl font-bold font-[family-name:var(--font-display)] text-zinc-900">
              {banner.heading}
            </h2>
          )}
          {banner.paragraph && (
            <p className="text-sm text-zinc-600 leading-relaxed">{banner.paragraph}</p>
          )}
          {banner.buttonLink && (
            <a
              href={banner.buttonLink}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-xs font-bold uppercase tracking-widest text-white"
            >
              Order Now
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
