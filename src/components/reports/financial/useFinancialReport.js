"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export const DEFAULT_FINANCIAL_FILTERS = {
  preset: "TODAY",
  dateFrom: "",
  dateTo: "",
  employeeId: "ALL",
  status: "ALL",
  paymentMethod: "ALL",
  table: "",
  guest: "",
  search: "",
  page: 1,
  pageSize: 25,
  sortBy: "updatedAt",
  sortDir: "desc",
};

export function financialQueryString(filters, { paginate = false } = {}) {
  const params = new URLSearchParams();
  params.set("preset", filters.preset || "TODAY");
  if (filters.preset === "CUSTOM") {
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
  }
  if (filters.employeeId && filters.employeeId !== "ALL") {
    params.set("employeeId", filters.employeeId);
  }
  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }
  if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
    params.set("paymentMethod", filters.paymentMethod);
  }
  if (filters.table) params.set("table", filters.table);
  if (filters.guest) params.set("guest", filters.guest);
  if (filters.search) params.set("search", filters.search);
  if (paginate) {
    params.set("page", String(filters.page || 1));
    params.set("pageSize", String(filters.pageSize || 25));
    params.set("sortBy", filters.sortBy || "updatedAt");
    params.set("sortDir", filters.sortDir || "desc");
  }
  return params.toString();
}

export function useFinancialReport(path, filters, { paginate = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const qs = financialQueryString(filters, { paginate });

  const fetchReport = useCallback(async () => {
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
  }, [path, qs]);

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

export function employeeLabel(emp) {
  if (!emp) return "Unknown";
  if (emp.name) return emp.name;
  const name = [emp.firstName, emp.lastName].filter(Boolean).join(" ");
  return name || emp.email || "Unknown";
}
