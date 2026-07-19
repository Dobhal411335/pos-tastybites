"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/utils/DateTime";
import { CalendarDays, Clock3 } from "lucide-react";

export default function DateTimeDisplay() {
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDate(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-zinc-700">
            <CalendarDays className="h-4 w-4 text-orange-500" />
            <span>{formatDate(currentDate)}</span>

            <span className="text-zinc-400">•</span>

            <Clock3 className="h-4 w-4 text-orange-500" />
            <span>{formatTime(currentDate)}</span>
        </div>
    );
}