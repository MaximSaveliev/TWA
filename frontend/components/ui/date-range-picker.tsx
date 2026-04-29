"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate?: string;   // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  className?: string;
}

export function DateRangePicker({ startDate, endDate, onChange, className }: DateRangePickerProps) {
  const from = startDate ? new Date(startDate + "T00:00:00") : undefined;
  const to   = endDate   ? new Date(endDate   + "T00:00:00") : undefined;
  const range: DateRange | undefined = from ? { from, to } : undefined;

  const handleSelect = (r: DateRange | undefined) => {
    onChange(
      r?.from ? format(r.from, "yyyy-MM-dd") : "",
      r?.to   ? format(r.to,   "yyyy-MM-dd") : "",
    );
  };

  const label = from
    ? to
      ? `${format(from, "MMM d, yyyy")} → ${format(to, "MMM d, yyyy")}`
      : format(from, "MMM d, yyyy")
    : "Pick a date range";

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-sm font-normal shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          !from && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
