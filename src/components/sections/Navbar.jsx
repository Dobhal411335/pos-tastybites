"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, ShoppingBag, PackageSearch } from "lucide-react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import { useCart } from "@/context/CartContext";
import { publicApiBase } from "@/lib/public/clientConfig";
import { cn } from "@/lib/utils";
import CartDrawer from "@/components/menu/CartDrawer";

const menuEase = [0.4, 0, 0.2, 1];

function getActiveSubSections(section) {
  return (section.subSections || [])
    .filter((item) => item?.active !== false)
    .sort((left, right) => (left.order || 0) - (right.order || 0));
}

function normalizeNavSections(sections = []) {
  return sections
    .filter((section) => {
      if (section?.active === false) return false;
      const title = String(section?.title || "").trim().toLowerCase();
      const url = String(section?.url || "").trim();
      // Home is always rendered separately
      if (title === "home" || url === "/" || url === "#home") return false;
      return true;
    })
    .sort((left, right) => (left.order || 0) - (right.order || 0));
}

function DesktopNav({ sections = [] }) {
  const visibleSections = useMemo(() => normalizeNavSections(sections), [sections]);

  return (
    <NavigationMenu.Root className="relative z-50 hidden xl:flex">
      <NavigationMenu.List className="flex items-center gap-1">
        <NavigationMenu.Item>
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--customer-muted)] transition-colors hover:bg-[var(--customer-surface-container)] hover:text-[var(--customer-ink)]"
          >
            Home
          </Link>
        </NavigationMenu.Item>

        {visibleSections.map((section) => {
          const subSections = getActiveSubSections(section);
          const hasSubSections = subSections.length > 0;
          const key = section._id || section.title;

          if (!hasSubSections) {
            return (
              <NavigationMenu.Item key={key}>
                <Link
                  href={section.url || "#"}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[var(--customer-muted)] transition-colors hover:bg-[var(--customer-surface-container)] hover:text-[var(--customer-ink)]"
                >
                  {section.title}
                </Link>
              </NavigationMenu.Item>
            );
          }

          return (
            <NavigationMenu.Item key={key} className="relative">
              <NavigationMenu.Trigger className="group flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-(--customer-muted) transition-colors hover:bg-(--customer-surface-container) hover:text-(--customer-ink) data-[state=open]:bg-(--customer-surface-container) data-[state=open]:text-(--customer-ink)">
                {section.title}
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content asChild>
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="absolute left-1/2 top-full z-50 mt-3 w-max min-w-[220px] -translate-x-1/2 rounded-xl border border-(--border)/30 bg-(--customer-surface) p-2 shadow-2xl"
                >
                  <div className="grid gap-1">
                    {subSections.map((subSection, index) => (
                      <motion.div
                        key={subSection._id || subSection.title}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                      >
                        <Link
                          href={subSection.url || "#"}
                          className="block rounded-md px-4 py-2.5 text-sm text-[var(--customer-ink)] transition-colors hover:bg-primary hover:text-white"
                        >
                          {subSection.title}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          );
        })}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}

function MobileNav({ sections = [], onNavigate }) {
  const [openSectionId, setOpenSectionId] = useState(null);

  const visibleSections = useMemo(() => normalizeNavSections(sections), [sections]);

  return (
    <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
      <Link
        href="/"
        onClick={onNavigate}
        className="rounded-md border-b border-[var(--border)]/30 py-3 text-sm font-bold uppercase tracking-wider text-[var(--customer-muted)] hover:text-[var(--customer-ink)]"
      >
        Home
      </Link>

      {visibleSections.map((section) => {
        const sectionId = section._id || section.title;
        const subSections = getActiveSubSections(section);
        const hasSubSections = subSections.length > 0;

        if (!hasSubSections) {
          return (
            <Link
              key={sectionId}
              href={section.url || "#"}
              onClick={onNavigate}
              className="rounded-md border-b border-[var(--border)]/30 py-3 text-sm font-bold uppercase tracking-wider text-[var(--customer-muted)] hover:text-[var(--customer-ink)]"
            >
              {section.title}
            </Link>
          );
        }

        const isOpen = openSectionId === sectionId;

        return (
          <div key={sectionId} className="border-b border-[var(--border)]/30">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-bold uppercase tracking-wider text-[var(--customer-muted)] transition-colors hover:text-[var(--customer-ink)]"
              aria-expanded={isOpen}
              onClick={() =>
                setOpenSectionId((current) => (current === sectionId ? null : sectionId))
              }
            >
              {section.title}
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key={sectionId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: menuEase }}
                  className="overflow-hidden"
                >
                  <div className="mb-2 flex flex-col gap-1 border-l border-[var(--border)]/40 pl-4">
                    {subSections.map((sub, index) => (
                      <motion.div
                        key={sub._id || sub.title}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: index * 0.04,
                          duration: 0.2,
                          ease: menuEase,
                        }}
                      >
                        <Link
                          href={sub.url || "#"}
                          onClick={onNavigate}
                          className="block py-2.5 text-sm font-medium normal-case tracking-normal text-[var(--customer-ink)] hover:text-primary"
                        >
                          {sub.title}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const pathname = usePathname();
  const { restaurant, slug } = useRestaurantPublic();
  const { itemCount } = useCart();
  const isMenuPage = pathname === "/menu" || pathname?.startsWith("/menu/");

  const brandName = restaurant?.name || "";
  const logoUrl = restaurant?.logos?.main || restaurant?.logos?.mobile || "";

  useEffect(() => {
    let cancelled = false;
    async function loadNav() {
      try {
        const res = await fetch(`${publicApiBase(slug)}/navbar`);
        const json = await res.json();
        if (!res.ok || !json.success) return;
        if (!cancelled) setSections(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) setSections([]);
      }
    }
    loadNav();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (isMenuPage) return undefined;
    const openCart = () => setCartOpen(true);
    window.addEventListener("tastybites:open-cart", openCart);
    return () => window.removeEventListener("tastybites:open-cart", openCart);
  }, [isMenuPage]);

  const handleCartClick = () => {
    if (isMenuPage) {
      if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
        document.getElementById("menu-order-bag")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        return;
      }
      window.dispatchEvent(new CustomEvent("tastybites:open-cart"));
      return;
    }
    setCartOpen(true);
  };

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)]/30 bg-[var(--customer-surface)]/95 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1320px] items-center justify-between gap-6 px-5 lg:px-12">
        <div className="flex w-full min-w-0 items-center gap-15">
          <Link href="/" className="group flex min-w-0 flex-col">
            {logoUrl ? (
              <span className="relative h-14 w-28 sm:w-36">
                <Image
                  src={logoUrl}
                  alt={brandName}
                  fill
                  className="object-contain object-left"
                  sizes="144px"
                  priority
                />
              </span>
            ) : (
              <>
                <span className="text-[18px] font-bold uppercase leading-tight tracking-wider text-[var(--customer-ink)] transition-colors group-hover:text-primary">
                  {brandName.split(" ")[0] || ""}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--customer-muted)]">
                  {brandName.includes(" ")
                    ? brandName.split(" ").slice(1).join(" ")
                    : ""}{" "}
                  · Pickup
                </span>
              </>
            )}
          </Link>

          <DesktopNav sections={sections} />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:contents">
            <Button
              asChild
              variant="outline"
              className="h-9 rounded-lg border-[var(--border)] bg-white px-3 text-xs font-bold uppercase tracking-wider text-[var(--customer-ink)] shadow-sm hover:bg-[var(--customer-surface-container)]"
            >
              <Link href="/order" className="inline-flex items-center gap-1.5">
                <PackageSearch className="h-3.5 w-3.5" />
                Track Order
              </Link>
            </Button>
            <Button
              asChild
              className="h-9 rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-primary-hover"
            >
              <Link href="/menu">Order Now</Link>
            </Button>
          </div>
          <button
            type="button"
            onClick={handleCartClick}
            className="flex items-center gap-2 rounded-md bg-[var(--ink)] px-3.5 py-2.5 text-white shadow-sm transition-all hover:bg-[var(--ink)]/90"
            aria-label={itemCount > 0 ? `Open cart, ${itemCount} items` : "Open cart"}
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            <span className="text-xs font-semibold">Cart</span>
            {itemCount > 0 ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </button>


          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-(--customer-ink) xl:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] border-l border-(--border)/40 bg-(--customer-surface) p-8"
            >
              <div className="mt-10 flex flex-col gap-8">
                <span className="text-2xl font-bold tracking-tight text-[var(--customer-ink)]">
                  {brandName}
                </span>
                <MobileNav sections={sections} onNavigate={() => setIsOpen(false)} />
                <div className="flex flex-col gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className=" h-12 w-full border-[var(--border)] text-xs font-bold uppercase tracking-wider"
                  >
                    <Link href="/order" onClick={() => setIsOpen(false)}>
                      Track Order
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="h-12 w-full bg-primary text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-hover"
                  >
                    <Link href="/menu" onClick={() => setIsOpen(false)}>
                      Order Online
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
    <div className="h-20 w-full shrink-0" aria-hidden />
    {!isMenuPage ? (
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} mode="drawer" />
    ) : null}
    </>
  );
}
