"use client";
import { CalendarDays } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { enUS, es } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
export function DatePicker({
  value,
  onChange,
  label,
  locale = "en",
  disabled,
}: {
  value?: Date;
  onChange: (date?: Date) => void;
  label: string;
  locale?: "en" | "es";
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" disabled={disabled} />}>
        <CalendarDays />
        {value
          ? format(value, "PP", { locale: locale === "es" ? es : enUS })
          : label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <DayPicker
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={locale === "es" ? es : enUS}
          showOutsideDays
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
export function DateRangePicker({
  value,
  onChange,
  label,
  locale = "en",
}: {
  value?: DateRange;
  onChange: (range?: DateRange) => void;
  label: string;
  locale?: "en" | "es";
}) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        <CalendarDays />
        {value?.from
          ? `${format(value.from, "MMM d", { locale: locale === "es" ? es : enUS })}${value.to ? ` – ${format(value.to, "MMM d", { locale: locale === "es" ? es : enUS })}` : ""}`
          : label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <DayPicker
          mode="range"
          selected={value}
          onSelect={onChange}
          locale={locale === "es" ? es : enUS}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
