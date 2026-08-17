import { format } from "date-fns";

export { STATUS_BADGE, money } from "@/components/reports/OrderDetailBody";

export const ATTENDANCE_BADGE = {
  Present: "bg-emerald-50 text-emerald-700",
  Late: "bg-amber-50 text-amber-700",
  Absent: "bg-red-50 text-red-700",
  "Half Day": "bg-orange-50 text-orange-700",
  Leave: "bg-zinc-100 text-zinc-600",
  Holiday: "bg-blue-50 text-blue-700",
  "Emergency Duty": "bg-violet-50 text-violet-700",
  Overtime: "bg-orange-50 text-orange-700",
  Off: "bg-zinc-100 text-zinc-600",
  Active: "bg-orange-50 text-orange-700",
};

export function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function toYmd(date) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function employeeInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function staffGroup(role) {
  const value = String(role || "").toUpperCase();
  if (/CHEF|COOK|KITCHEN|PREP/.test(value)) return "kitchen";
  if (/SERVER|WAIT|BARTEND|HOST|STAFF|EMPLOYEE/.test(value)) return "servers";
  return "other";
}

export function formatInTz(value, timeZone, options) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone, ...options }).format(new Date(value));
}

export function formatTimeTz(value, timeZone) {
  return formatInTz(value, timeZone, { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDateTz(value, timeZone) {
  return formatInTz(value, timeZone, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateShortTz(value, timeZone) {
  return formatInTz(value, timeZone, { day: "numeric", month: "short" });
}

export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0 && rest === 0) return "0h";
  if (rest === 0) return `${hours}h`;
  if (hours === 0) return `${rest}m`;
  return `${hours}h ${rest}m`;
}

export function formatHoursLabel(hours) {
  return formatDuration(Number(hours || 0) * 60);
}

export function formatDurationSeconds(seconds) {
  return formatDuration(Math.round((Number(seconds) || 0) / 60));
}

export function dayStatusLabel(row) {
  if (!row) return "—";
  if (row.attendanceStatus === "Holiday") return "Holiday";
  if (row.attendanceStatus === "Leave") return "Leave";
  if (row.attendanceStatus === "Absent") return "Absent";
  if (row.shiftStatus === "Off" || row.attendanceStatus === "Off") return "Off";
  if (row.isIncomplete) return "Active";
  if ((Number(row.overtimeMinutes) || 0) > 0) return "Overtime";
  return row.attendanceStatus || "Present";
}

export function timelinePercents(clockIn, clockOut, scheduledStart, scheduledEnd) {
  const pad = 60 * 60 * 1000;
  const inMs = clockIn ? new Date(clockIn).getTime() : null;
  const outMs = clockOut ? new Date(clockOut).getTime() : Date.now();
  const startMs = scheduledStart
    ? new Date(scheduledStart).getTime() - pad
    : inMs
      ? inMs - pad
      : Date.now() - pad;
  const endMs = scheduledEnd
    ? new Date(scheduledEnd).getTime() + pad
    : outMs + pad;
  const span = Math.max(endMs - startMs, 1);
  const inPct = inMs == null ? 0 : Math.min(95, Math.max(2, ((inMs - startMs) / span) * 100));
  const outPct = Math.min(98, Math.max(inPct + 4, ((outMs - startMs) / span) * 100));
  return { inPct, outPct, width: Math.max(4, outPct - inPct) };
}
