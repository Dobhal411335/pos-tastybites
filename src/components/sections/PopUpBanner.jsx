"use client"
import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const PopUpBanner = ({ section = "frontend" }) => {
  const [banner, setBanner] = useState(null);
  const [open, setOpen] = useState(false); // Initially closed
  const [showAnim, setShowAnim] = useState(false);

  useEffect(() => {
    fetch(`/api/web/popupBanner?section=${section}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setBanner(data[0]);
        }
      });
  }, []);

  useEffect(() => {
    if (banner) {
      // Delay popup open by 2 seconds
      const timer = setTimeout(() => {
        setOpen(true);
        // Animate in after open
        setTimeout(() => setShowAnim(true), 10);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [banner]);

  const handleClose = () => {
    setShowAnim(false);
    setTimeout(() => setOpen(false), 200); // Wait for animation out
  };

  if (!banner || !open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div
        className={`relative bg-white w-full max-w-3xl overflow-hidden shadow-2xl
    flex flex-col md:flex-row transition-all duration-500
    ${showAnim ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 bg-black/80 hover:bg-black text-white rounded-full p-2 transition"
          aria-label="Close popup"
        >
          <X size={20} />
        </button>

        {/* Left Side Banner */}
        <div className="w-full md:w-1/2 h-[220px] md:h-[380px]">
          <img
            src={banner.image?.url || "/placeholder.jpeg"}
            alt="Popup Banner"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Side Content */}
        <div className="w-full md:w-1/2 md:h-[380px] flex items-center justify-center p-5 md:p-8">
          <div className="w-full max-w-sm text-center">
            <p className="text-gray-500 font-semibold text-sm mb-2">
              Crafted with Heart
            </p>

            <h2 className="text-lg md:text-xl font-bold text-black leading-tight mb-4">
              {banner.heading}
            </h2>

            <p className="text-gray-600 text-sm md:text-[14px] leading-relaxed mb-6">
              {banner.paragraph}
            </p>

            <a
              href={banner.buttonLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <button className="w-full bg-black text-white font-semibold py-3 hover:bg-gray-900 transition">
                Explore
              </button>
            </a>

            <p className="mt-3 text-gray-500 font-semibold text-sm">
              Don't miss this chance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopUpBanner;