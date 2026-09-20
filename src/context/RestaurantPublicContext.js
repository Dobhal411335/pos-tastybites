"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(publicApiBase(slug), { cache: "no-store" });
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
  }, [slug]);

  useEffect(() => {
    // Always refresh so pickup slots match current restaurant timezone / clock.
    load();
  }, [load]);

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
