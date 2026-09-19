"use client";

import { useMenuPublic } from "@/context/MenuPublicContext";

/**
 * Shared public menu — one network fetch for the whole customer app.
 * Prefers MenuPublicProvider; safe fallback keeps older call sites working.
 */
export function usePublicMenu() {
  return useMenuPublic();
}
