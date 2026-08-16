"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export const DEFAULT_INVENTORY_FILTERS = {
  preset: "TODAY",
  dateFrom: "",
  dateTo: "",
  categoryId: "ALL",
  productId: "ALL",
  stockStatus: "ALL",
  search: "",
  page: 1,
  pageSize: 25,
  sortBy: "quantity",
};

export function inventoryQueryString(filters, { paginate = false } = {}) {
  const params = new URLSearchParams();
  params.set("preset", filters.preset || "TODAY");
  if (filters.preset === "CUSTOM") {
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
  }
  if (filters.categoryId && filters.categoryId !== "ALL") {
    params.set("categoryId", filters.categoryId);
  }
  if (filters.productId && filters.productId !== "ALL") {
    params.set("productId", filters.productId);
  }
  if (filters.stockStatus && filters.stockStatus !== "ALL") {
    params.set("stockStatus", filters.stockStatus);
  }
  if (filters.search) params.set("search", filters.search);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (paginate) {
    params.set("page", String(filters.page || 1));
    params.set("pageSize", String(filters.pageSize || 25));
  }
  return params.toString();
}

export function useInventoryReport(path, filters, { paginate = false, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && path));
  const qs = inventoryQueryString(filters, { paginate });

  const fetchReport = useCallback(async () => {
    if (!enabled || !path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${path}?${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load report");
      }
      setData(json.data);
    } catch (error) {
      toast.error(error.message || "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [path, qs, enabled]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { data, loading, reload: fetchReport };
}

export function money(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function qty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
