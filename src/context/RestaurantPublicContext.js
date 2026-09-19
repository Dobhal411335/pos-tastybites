"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getPublicRestaurantSlug, publicApiBase } from "@/lib/public/clientConfig";

const RestaurantPublicContext = createContext({
  slug: getPublicRestaurantSlug(),
  restaurant: null,
  loading: true,
  error: null,
  refresh: () => {},
});

export function RestaurantPublicProvider({ children, initialRestaurant = null }) {
  const slug = getPublicRestaurantSlug();
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [loading, setLoading] = useState(!initialRestaurant);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(publicApiBase(slug));
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load restaurant");
      }
      setRestaurant(json.data);
    } catch (err) {
      setError(err.message || "Failed to load restaurant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialRestaurant) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <RestaurantPublicContext.Provider
      value={{ slug, restaurant, loading, error, refresh: load }}
    >
      {children}
    </RestaurantPublicContext.Provider>
  );
}

export function useRestaurantPublic() {
  return useContext(RestaurantPublicContext);
}
