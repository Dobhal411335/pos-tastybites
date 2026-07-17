"use client";

import React from "react";
import Link from "next/link";
import { Phone, MapPin, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="w-full bg-[#121416] text-zinc-400 border-t border-zinc-800">
      
      {/* Pre-footer Call-To-Action Banner (minimalist container) */}
      <div className="mx-auto max-w-7xl px-6 -translate-y-8 sm:px-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#12A594]">
              Get Started
            </span>
            <h3 className="text-xl md:text-2xl font-bold text-zinc-900 font-serif">
              Find your perfect meal with <span className="text-primary font-sans">Tasty Bites</span>
            </h3>
            <p className="text-xs text-zinc-500 font-light leading-relaxed">
              Discover culinary delights, premium dining experiences and seamless online bookings.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Button
              asChild
              className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-none px-6 py-5 text-xs font-bold uppercase tracking-widest transition-all"
            >
              <Link href="#">Browse Menu</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-zinc-300 text-zinc-800 hover:bg-zinc-50 rounded-none px-6 py-5 text-xs font-bold uppercase tracking-widest transition-all"
            >
              <Link href="#">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Footer Details */}
      <div className="mx-auto max-w-7xl px-6 pt-8 pb-16 sm:px-8 grid grid-cols-1 lg:grid-cols-3 gap-12 border-b border-zinc-800">
        
        {/* Left Col: Brand / Logo */}
        <div className="space-y-4">
          <Link href="/">
            <span className="text-2xl font-bold tracking-tight text-white font-serif">
              TASTY BITES
            </span>
          </Link>
          <p className="text-xs text-zinc-400 leading-relaxed font-light">
            Crafting premium dining experiences, one exceptional dish at a time. Authenticity, passion, and flavor combined.
          </p>
        </div>

        {/* Right Cols */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <p className="text-xs text-zinc-400 leading-relaxed font-light">
            At the intersection of tradition and taste, our story began with a simple passion: to bring authentic, high-quality culinary experiences to the vibrant community of Exeter. What started as a vision to honor time-tested recipes has evolved into a dedicated commitment to excellence in every dish we serve.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#12A594]">Quick Links</h4>
              <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-zinc-400">
                <Link href="#" className="hover:text-white transition-colors">Home</Link>
                <span>|</span>
                <Link href="#" className="hover:text-white transition-colors">About Us</Link>
                <span>|</span>
                <Link href="#" className="hover:text-white transition-colors">Legality/Policy</Link>
                <span>|</span>
                <Link href="#" className="hover:text-white transition-colors">Contact Us</Link>
                <span>|</span>
                <Link href="#" className="hover:text-white transition-colors">Our Support</Link>
              </nav>
            </div>

            {/* Contact details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#12A594]">Contact & Address</h4>
              <div className="flex flex-col gap-3 text-xs font-light text-zinc-400">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#12A594] shrink-0" />
                  <span>345 Main Street south, Exeter, ON</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#12A594] shrink-0" />
                  <a href="tel:5192350050" className="hover:underline hover:text-white">
                    (519) 235-0050
                  </a>
                </div>
                
                {/* Whatsapp button */}
                <div className="pt-2">
                  <a
                    href="https://wa.me/5192350050"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-none text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-[#12A594]" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Footer Bottom Meta */}
      <div className="mx-auto max-w-7xl px-6 py-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        <div>
          <span>&copy; {new Date().getFullYear()} Tasty Bites. All Rights Reserved.</span>
        </div>
        <div>
          <a href="https://google.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 flex items-center gap-1">
            <span>Find us on Google</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

    </footer>
  );
}
