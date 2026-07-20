"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Phone, Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "#" },
    { name: "Our Policy", href: "#" },
    { name: "Contact Us", href: "#" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 font-serif">
            TASTY<span className="text-primary"> BITES</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-zinc-600">
          {navLinks.map((link, index) => (
            <React.Fragment key={link.name}>
              <Link
                href={link.href}
                className="px-4 py-2 hover:text-zinc-900 transition-colors duration-200"
              >
                {link.name}
              </Link>
              {index < navLinks.length - 1 && (
                <span className="text-zinc-300 select-none">|</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Login & Phone Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 flex gap-2 items-center px-4 py-5 text-xs font-bold tracking-wider uppercase transition-colors"
          >
            <Link href="/login">
              <UserCircle className="h-4 w-4" />
              <span>Login</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-zinc-300 text-zinc-700 hover:bg-zinc-50 flex gap-2 items-center px-6 py-5 transition-all text-xs font-bold tracking-wider"
          >
            <a href="tel:5192150050">
              <Phone className="h-3.5 w-3.5" />
              <span>(519) 215-0050</span>
            </a>
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="flex md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-700">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-l border-zinc-200 bg-white p-8">
              <div className="flex flex-col gap-8 mt-12">
                <span className="text-2xl font-bold tracking-tight text-zinc-950 font-serif">
                  TASTY BITES
                </span>
                
                <nav className="flex flex-col gap-4 text-sm font-bold tracking-wider uppercase text-zinc-700">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="py-2 hover:text-zinc-900 transition-colors border-b border-zinc-100"
                    >
                      {link.name}
                    </Link>
                  ))}
                </nav>

                <div className="flex flex-col gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="border-zinc-200 text-zinc-800 hover:bg-zinc-50 w-full py-6 rounded-full flex gap-2 justify-center text-xs font-bold tracking-wider uppercase"
                  >
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      <UserCircle className="h-4 w-4" />
                      <span>Staff Login</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-zinc-900 hover:bg-zinc-800 text-white w-full py-6 rounded-full flex gap-2 justify-center text-xs font-bold tracking-wider uppercase"
                  >
                    <a href="tel:5192150050" onClick={() => setIsOpen(false)}>
                      <Phone className="h-4 w-4" />
                      <span>Call (519) 215-0050</span>
                    </a>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
