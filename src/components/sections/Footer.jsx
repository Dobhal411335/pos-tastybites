"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";

function FacebookIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
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
      strokeLinecap="round"
      strokeLinejoin="round"
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
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

export default function Footer() {
  const { restaurant } = useRestaurantPublic();
  const brandName = restaurant?.name || "Tasty Bites";
  const phone = restaurant?.phone || "";
  const phoneDisplay = restaurant?.phoneDisplay || "";
  const address = restaurant?.address || "";
  const email = restaurant?.email || "";
  const mapLink = restaurant?.googleMapLink || "";
  const social = restaurant?.social || {};
  const footerLogo =
    restaurant?.logos?.footer || restaurant?.logos?.main || restaurant?.logos?.mobile || "";

  return (
    <footer
      className="w-full border-t border-[var(--border)]/30 bg-[var(--customer-surface-low)] pt-12 pb-8"
      id="contact-footer"
    >
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="grid grid-cols-1 gap-8 pb-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Link href="/" className="inline-flex w-fit flex-col gap-2">
              {footerLogo ? (
                <span className="relative h-12 w-40">
                  <Image
                    src={footerLogo}
                    alt={brandName}
                    fill
                    className="object-contain object-left"
                    sizes="160px"
                  />
                </span>
              ) : (
                <>
                  <span className="text-base font-bold uppercase tracking-wider text-[var(--customer-ink)]">
                    {brandName}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                    Same-day pickup
                  </span>
                </>
              )}
            </Link>
            <p className="text-[13px] leading-relaxed text-[var(--customer-muted)]">
              Order online, pick up at {brandName}, and pay when you arrive. Fresh food made to
              order — no delivery.
            </p>
            <ul className="flex flex-col gap-1 pt-1 text-[13px] text-[var(--customer-muted)]">
              <li>
                <Link href="/" className="transition-colors hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/menu" className="transition-colors hover:text-primary">
                  View Menu
                </Link>
              </li>
              <li>
                <Link href="/menu" className="transition-colors hover:text-primary">
                  Order Online
                </Link>
              </li>
              <li>
                <Link href="/#reservations" className="transition-colors hover:text-primary">
                  Reservations
                </Link>
              </li>
              <li>
                <Link href="/#contact-footer" className="transition-colors hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--customer-ink)]">
              Customer Support
            </span>
            <ul className="flex flex-col gap-2 text-[13px] text-[var(--customer-muted)]">
              <li>
                <Link href="/menu" className="transition-colors hover:text-primary">
                  Pickup Information
                </Link>
              </li>
              <li>
                <Link href="/#our-story" className="transition-colors hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/#special-offers" className="transition-colors hover:text-primary">
                  Special Offers
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--customer-ink)]">
              Contact &amp; Hours
            </span>
            <div className="flex flex-col gap-2 text-[13px] text-[var(--customer-muted)]">
              {address ? (
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {mapLink ? (
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1 transition-colors hover:text-primary"
                    >
                      <span>{address}</span>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                    </a>
                  ) : (
                    <span>{address}</span>
                  )}
                </div>
              ) : null}
              {phone ? (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={`tel:${phone}`}
                    className="transition-colors hover:text-primary"
                  >
                    {phoneDisplay || phone}
                  </a>
                </div>
              ) : null}
              {email ? (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={`mailto:${email}`}
                    className="break-all transition-colors hover:text-primary"
                  >
                    {email}
                  </a>
                </div>
              ) : null}
              <p className="pt-1 text-[11px] font-semibold text-primary">
                Online ordering · Same-day pickup only
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--customer-ink)]">
              Order Direct
            </span>
            <p className="text-[13px] text-[var(--customer-muted)]">
              Skip third-party apps — order here and pick up fresh at {brandName}.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-primary-hover"
            >
              Order Online Now
            </Link>
            {(social.instagram || social.facebook || social.youtube) && (
              <div className="flex items-center gap-2 pt-1">
                {social.instagram ? (
                  <a
                    aria-label="Instagram"
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/20 bg-[var(--customer-surface-container)] text-[var(--customer-muted)] transition-colors hover:bg-primary hover:text-white"
                  >
                    <InstagramIcon className="h-5 w-5" />
                  </a>
                ) : null}
                {social.facebook ? (
                  <a
                    aria-label="Facebook"
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/20 bg-[var(--customer-surface-container)] text-[var(--customer-muted)] transition-colors hover:bg-primary hover:text-white"
                  >
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                ) : null}
                {social.youtube ? (
                  <a
                    aria-label="YouTube"
                    href={social.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/20 bg-[var(--customer-surface-container)] text-[var(--customer-muted)] transition-colors hover:bg-primary hover:text-white"
                  >
                    <YoutubeIcon className="h-5 w-5" />
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 border-t border-[var(--border)]/30 pt-6 text-[13px] text-black sm:flex-row">
          <div>
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
