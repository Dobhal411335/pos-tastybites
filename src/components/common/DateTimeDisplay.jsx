"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/utils/DateTime";

export default function DateTimeDisplay({ compact = false }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dateLabel = compact
    ? currentDate.toLocaleDateString("en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : formatDate(currentDate);

  const timeLabel = compact
    ? currentDate.toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
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
