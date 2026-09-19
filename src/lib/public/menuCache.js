import { getPublicRestaurantSlug, publicApiBase } from "@/lib/public/clientConfig";

/** Products are mostly write-once — keep a long client TTL and skip routine revalidation. */
export const MENU_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { data: object, fetchedAt: number, promise: Promise<object> | null }>} */
const cache = new Map();

function emptyMenu() {
  return { categories: [], products: [], offers: [], restaurant: null };
}

export function getCachedMenu(slug) {
  const key = slug || getPublicRestaurantSlug();
  const entry = cache.get(key);
  if (!entry?.data) return null;
  if (Date.now() - entry.fetchedAt > MENU_CACHE_TTL_MS) return null;
  return entry.data;
}

export function peekMenuCache(slug) {
  const key = slug || getPublicRestaurantSlug();
  return cache.get(key)?.data || null;
}

/**
 * Fetch public menu once per slug; concurrent callers share the same in-flight promise.
 * @param {string} [slug]
 * @param {{ force?: boolean }} [opts]
 */
export async function fetchPublicMenu(slug, opts = {}) {
  const key = slug || getPublicRestaurantSlug();
  const force = Boolean(opts.force);

  if (force) {
    cache.delete(key);
  } else {
    const fresh = getCachedMenu(key);
    if (fresh) return fresh;

    const existing = cache.get(key);
    if (existing?.promise) return existing.promise;
  }

  const promise = (async () => {
    // Client memory cache is primary; avoid no-store so HTTP cache can help too.
    const res = await fetch(`${publicApiBase(key)}/menu`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Failed to load menu");
    }

    const data = {
      categories: json.data.categories || [],
      products: json.data.products || [],
      offers: json.data.offers || [],
      restaurant: json.data.restaurant || null,
    };

    cache.set(key, { data, fetchedAt: Date.now(), promise: null });
    return data;
  })();

  const prev = cache.get(key);
  cache.set(key, {
    data: prev?.data || emptyMenu(),
    fetchedAt: prev?.fetchedAt || 0,
    promise,
  });

  try {
    return await promise;
  } catch (err) {
    const entry = cache.get(key);
    if (entry?.promise === promise) {
      cache.set(key, {
        data: entry.data,
        fetchedAt: entry.fetchedAt,
        promise: null,
      });
    }
    throw err;
  }
}

export function invalidateMenuCache(slug) {
  if (slug) {
    cache.delete(slug);
    return;
  }
  cache.clear();
}
