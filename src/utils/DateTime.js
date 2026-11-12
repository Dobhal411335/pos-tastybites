import { getRestaurantTimezone } from "@/lib/restaurantTime";

export const formatDate = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getRestaurantTimezone(),
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
};

export const formatTime = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getRestaurantTimezone(),
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(date));
};
