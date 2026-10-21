"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";

function formatPhone(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return number || "";
}

function FacebookIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM10 15.5V8.5L16 12l-6 3.5Z" />
    </svg>
  );
}

function GoogleIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.3 2.99-7.42Z" />
      <path d="M12 22c2.7 0 4.96-.9 6.62-2.35l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.06v2.58A10 10 0 0 0 12 22Z" />
      <path d="M6.39 13.98A6.01 6.01 0 0 1 6.08 12c0-.69.12-1.35.31-1.98V7.44H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.56l3.33-2.58Z" />
      <path d="M12 5.89c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.95 2.89 14.7 2 12 2A10 10 0 0 0 3.06 7.44l3.33 2.58C7.18 7.65 9.39 5.89 12 5.89Z" />
    </svg>
  );
}

const PAYMENT_CARDS = [
  { name: "Visa", src: "/card/visa.png" },
  { name: "Mastercard", src: "/card/mastercard.webp" },
  { name: "RuPay", src: "/card/rupay.webp" },
  { name: "American Express", src: "/card/american-express.webp" },
  { name: "Discover", src: "/card/discover.png" },
];

const DEFAULT_COLUMNS = [
  {
    title: "Quick Links",
    order: 1,
    active: true,
    links: [
      { label: "Home", url: "/", order: 1, active: true },
      { label: "View Menu", url: "/menu", order: 2, active: true },
      { label: "Order Online", url: "/menu", order: 3, active: true },
      { label: "Reservations", url: "/#reservations", order: 4, active: true },
      { label: "Contact", url: "/#contact-footer", order: 5, active: true },
    ],
  },
  {
    title: "Customer Support",
    order: 2,
    active: true,
    links: [
      { label: "Pickup Information", url: "/menu", order: 1, active: true },
      { label: "About Us", url: "/#our-story", order: 2, active: true },
      { label: "Special Offers", url: "/#special-offers", order: 3, active: true },
    ],
  },
];

export default function Footer() {
  const { restaurant } = useRestaurantPublic();
  const brandName = restaurant?.name || "Tasty Bites";
  const footerLogo =
    restaurant?.logos?.footer ||
    restaurant?.logos?.main ||
    restaurant?.logos?.mobile ||
    "";

  const addresses =
    restaurant?.officeAddresses?.length > 0
      ? restaurant.officeAddresses
      : restaurant?.address
        ? [restaurant.address]
        : [];

  const phones =
    restaurant?.contactNumbers?.length > 0
      ? restaurant.contactNumbers
      : restaurant?.phone
        ? [restaurant.phone]
        : [];

  const emails =
    restaurant?.emails?.length > 0
      ? restaurant.emails
      : restaurant?.email
        ? [restaurant.email]
        : [];

  const social = restaurant?.social || {};
  const googleHref =
    social.google ||
    restaurant?.googleHref ||
    restaurant?.googleMapLink ||
    "https://www.google.com";

  const socialLinks = [
    { href: social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: social.youtube, label: "YouTube", Icon: YoutubeIcon },
    { href: googleHref, label: "Google", Icon: GoogleIcon },
  ].filter((item) => Boolean(item.href?.trim()));

  const managedFooter = restaurant?.footer;
  const rawColumns =
    managedFooter?.columns?.length > 0 ? managedFooter.columns : DEFAULT_COLUMNS;
  const columns = rawColumns
    .filter((col) => col.active !== false)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  const thankYou = managedFooter?.thankYou || "Thank you for visiting";
  const description =
    managedFooter?.description ||
    "Order online, pick up at our store, and pay when you arrive. Fresh food made to order — no delivery.";

  return (
    <footer
      className="w-full border-t border-[var(--border)]/30 bg-[var(--customer-surface-low)] pt-12 pb-6"
      id="contact-footer"
    >
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        {/* Row 1: Contact Us & Dynamic Columns */}
        <div className="grid grid-cols-1 gap-8 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Contact Us */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-[var(--customer-ink)]">
              Contact Us
            </h2>
            <ul className="space-y-3 text-sm text-[var(--customer-muted)]">
              {addresses.map((text, idx) => (
                <li key={`addr-${idx}`} className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{text}</span>
                </li>
              ))}
              {phones.map((number, idx) => {
                const digits = String(number || "").replace(/\D/g, "");
                return (
                  <li key={`phone-${idx}`} className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <a
                      href={`tel:${digits}`}
                      className="transition-colors hover:text-primary"
                    >
                      {formatPhone(number)}
                    </a>
                  </li>
                );
              })}
              {emails.map((email, idx) => (
                <li key={`email-${idx}`} className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <a
                    href={`mailto:${email}`}
                    className="break-all transition-colors hover:text-primary"
                  >
                    {email}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Dynamic Footer Columns */}
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h2 className="text-base font-bold uppercase tracking-wider text-[var(--customer-ink)]">
                {column.title}
              </h2>
              <ul className="space-y-2.5 text-sm text-[var(--customer-muted)]">
                {(column.links || [])
                  .filter((link) => link.active !== false)
                  .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
                  .map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.url || link.href || "#"}
                        className="transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="border-t border-[var(--border)]/20" />

        {/* Row 2: Brand/Description & Social / Payment Cards */}
        <div className="grid gap-8 py-10 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-12">
          {/* Brand info with logo, thank-you & description */}
          <div className="flex flex-col gap-2">
            {footerLogo ? (
              <div className="relative mb-2 h-12 w-48">
                <Image
                  src={footerLogo}
                  alt={brandName}
                  fill
                  className="object-contain object-left"
                  sizes="192px"
                />
              </div>
            ) : (
              <p className="font-display text-2xl font-bold tracking-tight text-[var(--customer-ink)]">
                {brandName}
              </p>
            )}
            <p className="text-base font-semibold text-[var(--customer-ink)]">
              {thankYou}
            </p>
            <p className="max-w-md text-sm leading-relaxed text-[var(--customer-muted)]">
              {description}
            </p>
          </div>

          {/* Social links & Payment Cards */}
          <div className="flex flex-col gap-6 lg:items-end lg:text-right">
            {socialLinks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wider text-[var(--customer-ink)]">
                  Follow Us
                </p>
                <div className="flex items-center gap-2.5 lg:justify-end">
                  {socialLinks.map(({ href, label, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex size-9 items-center justify-center rounded-full border border-[var(--border)]/40 bg-white text-[var(--customer-muted)] shadow-xs transition-colors hover:bg-primary hover:text-white"
                    >
                      <Icon className="size-4" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2.5">
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--customer-ink)]">
                We Accept Payments
              </p>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {PAYMENT_CARDS.map((card) => (
                  <div
                    key={card.name}
                    className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border)]/40 bg-white p-1 shadow-xs transition-transform hover:scale-105"
                    title={card.name}
                  >
                    <Image
                      src={card.src}
                      alt={card.name}
                      width={48}
                      height={32}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Bottom Copyright Bar */}
        <div className="border-t border-[var(--border)]/30 pt-6">
          <p className="text-center text-xs text-[var(--customer-muted)] sm:text-sm">
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
