"use client";

import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DateRangeValue = "7d" | "14d" | "30d" | "90d" | "all";

export const DATE_RANGE_OPTIONS: { label: string; value: DateRangeValue }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 14 days", value: "14d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "All time", value: "all" },
];

export const RANGE_DAYS: Record<DateRangeValue, number | null> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
  all: null,
};

export function DateRangeFilter({
  value,
  onChange,
  className,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRangeValue)}>
      <SelectTrigger
        className={cn("h-9 lg:w-[160px]", className)}
        aria-label="Date range"
      >
        <Calendar className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGE_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
