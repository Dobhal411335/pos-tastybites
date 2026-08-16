import { formatEmployeeName } from "@/lib/eod/eodHelpers";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  formatTimeInRestaurantTz,
} from "@/lib/restaurantTime";

export function formatRestaurantDateTime(
  date,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function formatRestaurantDate(
  date,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRestaurantTime(
  date,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE
) {
  if (!date) return "—";
  return formatTimeInRestaurantTz(date, timeZone);
}

export function employeeDisplayName(emp) {
  return formatEmployeeName(emp);
}
