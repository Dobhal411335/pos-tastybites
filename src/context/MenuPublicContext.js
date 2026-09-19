"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getPublicRestaurantSlug } from "@/lib/public/clientConfig";
import {
  fetchPublicMenu,
  peekMenuCache,
} from "@/lib/public/menuCache";

const MenuPublicContext = createContext({
  slug: getPublicRestaurantSlug(),
  categories: [],
  products: [],
  offers: [],
  restaurant: null,
  loading: true,
  error: null,
  refresh: () => {},
});

export function MenuPublicProvider({ children }) {
  const slug = getPublicRestaurantSlug();
  const cached = peekMenuCache(slug);

  const [categories, setCategories] = useState(cached?.categories || []);
  const [products, setProducts] = useState(cached?.products || []);
  const [offers, setOffers] = useState(cached?.offers || []);
  const [restaurant, setRestaurant] = useState(cached?.restaurant || null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  const applyData = useCallback((data) => {
    setCategories(data.categories || []);
    setProducts(data.products || []);
    setOffers(data.offers || []);
    setRestaurant(data.restaurant || null);
  }, []);

  const load = useCallback(
    async ({ force = false } = {}) => {
      const hadCache = Boolean(peekMenuCache(slug));
      if (!hadCache || force) setLoading(true);
      setError(null);
      try {
        const data = await fetchPublicMenu(slug, { force });
        applyData(data);
      } catch (err) {
        setError(err.message || "Failed to load menu");
        if (!hadCache) {
          setCategories([]);
          setProducts([]);
          setOffers([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [slug, applyData]
  );

  useEffect(() => {
    load({ force: false });
  }, [load]);

  const value = useMemo(
    () => ({
      slug,
      categories,
      products,
      offers,
      restaurant,
      loading,
      error,
      refresh: () => load({ force: true }),
    }),
    [slug, categories, products, offers, restaurant, loading, error, load]
  );

  return (
    <MenuPublicContext.Provider value={value}>
      {children}
    </MenuPublicContext.Provider>
  );
}

export function useMenuPublic() {
  return useContext(MenuPublicContext);
}
