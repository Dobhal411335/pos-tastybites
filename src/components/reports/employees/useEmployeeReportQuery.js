"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { startOfMonth, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { startOfDay, toYmd } from "./employeeFormat";

export const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "Week" },
  { value: "this_month", label: "Month" },
  { value: "custom", label: "Custom" },
];

export const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "WAIVED", label: "Waived" },
];

export const PAYMENT_OPTIONS = [
  { value: "ALL", label: "All methods" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "GIFT_CARD", label: "Gift Card" },
];

export function presetRange(preset, today = startOfDay()) {
  if (preset === "this_week") {
    return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
  }
  if (preset === "this_month") {
    return { from: startOfMonth(today), to: today };
  }
  return { from: today, to: today };
}

export function defaultEmployeeFilters() {
  const today = startOfDay();
  return {
    preset: "today",
    dateFrom: today,
    dateTo: today,
    employeeId: "ALL",
    role: "ALL",
    shiftId: "ALL",
    orderStatus: "ALL",
    paymentMethod: "ALL",
    search: "",
    page: 1,
    limit: 25,
  };
}

export function buildEmployeeReportParams(filters, extras = {}) {
  const params = new URLSearchParams({
    dateFrom: toYmd(filters.dateFrom),
    dateTo: toYmd(filters.dateTo),
  });
  if (filters.employeeId && filters.employeeId !== "ALL") {
    params.set("employeeId", filters.employeeId);
  }
  if (filters.role && filters.role !== "ALL") params.set("role", filters.role);
  if (filters.shiftId && filters.shiftId !== "ALL") params.set("shiftId", filters.shiftId);
  if (filters.orderStatus && filters.orderStatus !== "ALL") {
    params.set("orderStatus", filters.orderStatus);
  }
  if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
    params.set("paymentMethod", filters.paymentMethod);
  }
  if (filters.search) params.set("search", filters.search);
  if (extras.section) params.set("section", extras.section);
  if (extras.page) params.set("page", String(extras.page));
  if (extras.limit) params.set("limit", String(extras.limit));
  if (extras.sort) params.set("sort", extras.sort);
  if (extras.sortDir) params.set("sortDir", extras.sortDir);
  return params;
}

export function useEmployeeReport(section = "summary", options = {}) {
  const {
    initialFilters = null,
    paginate = false,
    sort = "createdAt",
    sortDir = "desc",
    limit = 25,
    auto = true,
  } = options;

  const [filters, setFilters] = useState(() => {
    const base = initialFilters || defaultEmployeeFilters();
    return { ...base, limit };
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryString = useMemo(() => {
    const params = buildEmployeeReportParams(filters, {
      section,
      page: paginate ? filters.page : undefined,
      limit: paginate ? filters.limit || limit : undefined,
      sort: paginate ? sort : undefined,
      sortDir: paginate ? sortDir : undefined,
    });
    return params.toString();
  }, [filters, section, paginate, sort, sortDir, limit]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/employees?${queryString}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load report");
      }
      setData(json.data);
    } catch (err) {
      const message = err.message || "Failed to load report";
      setError(message);
      setData(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    if (!auto) return;
    fetchReport();
  }, [auto, fetchReport]);

  const applyFilters = useCallback((next) => {
    setFilters((prev) =>
      typeof next === "function" ? next(prev) : { ...prev, ...next }
    );
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultEmployeeFilters(), limit });
  }, [limit]);

  const onPresetChange = useCallback((preset) => {
    setFilters((prev) => {
      if (preset === "custom") return { ...prev, preset: "custom", page: 1 };
      const range = presetRange(preset);
      return {
        ...prev,
        preset,
        dateFrom: range.from,
        dateTo: range.to,
        page: 1,
      };
    });
  }, []);

  return {
    filters,
    setFilters,
    applyFilters,
    clearFilters,
    onPresetChange,
    data,
    loading,
    error,
    reload: fetchReport,
    queryString,
    exportQuery: queryString,
  };
}

export function useEmployeeDetailLoader(filters, detailMode = "profile") {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const openEmployee = useCallback(
    async (employeeId, snapshot = null) => {
      if (!employeeId) return;
      setSelectedEmployeeId(employeeId);
      setSelectedEmployee(snapshot);
      setSelectedDay(null);
      setOrderDetail(null);
      setDetail(null);
      setDetailLoading(true);
      try {
        const params = buildEmployeeReportParams(filters, {
          section: "detail",
        });
        params.set("employeeId", employeeId);
        params.set("detailFocus", detailMode || "profile");
        const res = await fetch(`/api/admin/reports/employees?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Unable to load employee.");
        setDetail(json.data);
        setSelectedEmployee(json.data.employee);
      } catch (err) {
        toast.error(err.message || "Unable to load employee.");
      } finally {
        setDetailLoading(false);
      }
    },
    [filters, detailMode]
  );

  const closeSheet = useCallback((open) => {
    if (open) return;
    setSelectedEmployeeId(null);
    setSelectedEmployee(null);
    setDetail(null);
    setSelectedDay(null);
    setOrderDetail(null);
  }, []);

  const openOrder = useCallback(async (orderId) => {
    if (!orderId) return;
    setOrderLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Unable to load order.");
      setOrderDetail(json.data);
    } catch (err) {
      toast.error(err.message || "Unable to load order.");
    } finally {
      setOrderLoading(false);
    }
  }, []);

  return {
    selectedEmployeeId,
    selectedEmployee,
    detail,
    detailLoading,
    selectedDay,
    setSelectedDay,
    orderDetail,
    orderLoading,
    openEmployee,
    closeSheet,
    openOrder,
    setOrderDetail,
    detailMode,
  };
}
