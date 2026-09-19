"use client";

import { useRestaurantPublic } from "@/context/RestaurantPublicContext";

export default function LocalBusinessJsonLd() {
  const { restaurant } = useRestaurantPublic();
  if (!restaurant?.name) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    ...(restaurant.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: restaurant.address,
          },
        }
      : {}),
    ...(restaurant.phone
      ? { telephone: `${restaurant.phoneCode || "+1"}${restaurant.phone}` }
      : {}),
    ...(restaurant.googleMapLink ? { hasMap: restaurant.googleMapLink } : {}),
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD for search engines; content comes from restaurant config only
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
