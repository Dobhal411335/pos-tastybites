"use client";

import * as React from "react";
import { format, startOfDay } from "date-fns";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function formatRangeLabel(from, to) {
  if (from && to) {
    const sameYear = from.getFullYear() === to.getFullYear();
    if (sameYear && from.getMonth() === to.getMonth()) {
      return `${format(from, "MMM d")} – ${format(to, "d, yyyy")}`;
    }
    if (sameYear) {
      return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
    }
    return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
  }
  if (from) return format(from, "MMM d, yyyy");
  return "Select date range";
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  className,
  align = "start",
  numberOfMonths = 2,
}) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    if (!dateFrom && !dateTo) return undefined;
    return { from: dateFrom || undefined, to: dateTo || undefined };
  }, [dateFrom, dateTo]);

  const label = formatRangeLabel(dateFrom, dateTo);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 justify-start gap-2 px-3 text-left font-normal bg-white border-zinc-200 shadow-sm hover:bg-zinc-50",
            !dateFrom && "text-zinc-500",
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500" />
          <span className="text-sm truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white border-zinc-200 shadow-lg" align={align}>
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) => {
            if (!range?.from) return;
            const from = startOfDay(range.from);
            const to = range.to ? startOfDay(range.to) : from;
            onChange({ from, to });
            if (range.from && range.to) {
              setOpen(false);
            }
          }}
          numberOfMonths={numberOfMonths}
          weekStartsOn={1}
          defaultMonth={dateFrom || dateTo || new Date()}
          showOutsideDays
          className="p-4"
          classNames={{
            months: "flex flex-row gap-10 relative",
            month: "flex flex-col gap-3",
            month_caption: "flex h-8 items-center justify-center",
            caption_label: "text-sm font-semibold text-zinc-800",
            nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
            button_previous: cn(
              "h-8 w-8 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            ),
            button_next: cn(
              "h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            ),
            weekdays: "flex",
            weekday: "w-9 text-[11px] font-semibold uppercase text-zinc-500",
            week: "mt-1 flex w-full",
            day: cn(
              "relative h-9 w-9 p-0 text-center text-sm",
              "[&:has([data-range-middle=true])]:bg-blue-50",
              "[&:has([data-range-start=true])]:rounded-l-full",
              "[&:has([data-range-end=true])]:rounded-r-full",
              "first:[&:has([data-range-middle=true])]:rounded-l-none",
              "last:[&:has([data-range-middle=true])]:rounded-r-none"
            ),
            range_start: "rounded-l-full bg-blue-50",
            range_middle: "rounded-none bg-blue-50",
            range_end: "rounded-r-full bg-blue-50",
            today: "[&_button]:ring-2 [&_button]:ring-blue-500 [&_button]:ring-offset-1",
            outside: "text-zinc-300 aria-selected:text-zinc-300",
          }}
          components={{
            DayButton: ({ className, day, modifiers, ...props }) => (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-day={day.date.toLocaleDateString()}
                data-range-start={modifiers.range_start}
                data-range-end={modifiers.range_end}
                data-range-middle={modifiers.range_middle}
                className={cn(
                  "h-9 w-9 rounded-full p-0 font-normal text-zinc-700 hover:bg-zinc-100",
                  modifiers.selected &&
                    !modifiers.range_start &&
                    !modifiers.range_end &&
                    !modifiers.range_middle &&
                    "bg-blue-600 text-white hover:bg-blue-600 hover:text-white",
                  modifiers.range_start &&
                    "bg-blue-600 text-white hover:bg-blue-600 hover:text-white",
                  modifiers.range_end &&
                    "bg-blue-600 text-white hover:bg-blue-600 hover:text-white",
                  modifiers.range_middle &&
                    "rounded-none bg-blue-50 text-zinc-900 hover:bg-blue-100",
                  modifiers.outside && "text-zinc-300",
                  modifiers.disabled && "text-zinc-300 opacity-50",
                  className
                )}
                {...props}
              />
            ),
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
