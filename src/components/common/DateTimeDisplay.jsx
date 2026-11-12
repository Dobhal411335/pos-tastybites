"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/utils/DateTime";
import { getRestaurantTimezone } from "@/lib/restaurantTime";

export default function DateTimeDisplay({ compact = false }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dateLabel = compact
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: getRestaurantTimezone(),
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(currentDate)
    : formatDate(currentDate);

  const timeLabel = compact
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: getRestaurantTimezone(),
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(currentDate)
    : formatTime(currentDate);

  if (compact) {
    return (
      <div className="text-xs md:text-sm font-medium text-stone-500 whitespace-nowrap tabular-nums">
        {dateLabel} • {timeLabel}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-zinc-700 bg-white">
      <span>{dateLabel}</span>
      <span className="text-zinc-400">•</span>
      <span>{timeLabel}</span>
    </div>
  );
}
