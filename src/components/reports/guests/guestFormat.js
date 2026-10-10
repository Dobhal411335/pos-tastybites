"use client";

import { format } from "date-fns";

export {
  STATUS_BADGE,
  money,
  formatDateTime,
  dash,
  DetailItem,
  OrderSourceBadge,
  formatPhone,
} from "@/components/reports/OrderDetailBody";

export function formatDate(value) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy");
}

export function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function toYmd(date) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function guestType(guest) {
  if (!guest?.identified) return "takeaway";
  return guest.paidOrders >= 2 || guest.visits >= 2 ? "returning" : "new";
}

export function guestInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
