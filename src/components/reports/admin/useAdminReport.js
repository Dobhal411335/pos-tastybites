"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export const DEFAULT_ADMIN_FILTERS = {
  preset: "TODAY",
  dateFrom: "",
  dateTo: "",
  employeeId: "ALL",
  paymentMethod: "ALL",
  eventType: "ALL",
  kotStatus: "ALL",
  page: 1,
  pageSize: 25,
};

export function adminQueryString(filters, { paginate = false, section } = {}) {
  const params = new URLSearchParams();
  params.set("preset", filters.preset || "TODAY");
  if (filters.preset === "CUSTOM") {
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
  }
  if (filters.employeeId && filters.employeeId !== "ALL") {
    params.set("employeeId", filters.employeeId);
  }
  if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
    params.set("paymentMethod", filters.paymentMethod);
  }
  if (filters.eventType && filters.eventType !== "ALL") {
    params.set("eventType", filters.eventType);
  }
  if (filters.kotStatus && filters.kotStatus !== "ALL") {
    params.set("kotStatus", filters.kotStatus);
  }
  if (section) params.set("section", section);
  if (paginate) {
    params.set("page", String(filters.page || 1));
    params.set("pageSize", String(filters.pageSize || 25));
  }
  return params.toString();
}

export function useAdminReport(
  path,
  filters,
  { paginate = false, enabled = true, section } = {}
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && path));
  const qs = adminQueryString(filters, { paginate, section });

  const fetchReport = useCallback(async () => {
    if (!enabled || !path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setData(null);
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

export function employeeLabel(emp) {
  if (!emp) return "Unknown";
  if (emp.name) return emp.name;
  const name = [emp.firstName, emp.lastName].filter(Boolean).join(" ");
  return name || emp.email || "Unknown";
}
