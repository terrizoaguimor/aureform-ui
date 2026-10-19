"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-picker";

export default function DateRangePickerExample() {
  const [range, setRange] = useState<DateRange | undefined>();

  return (
    <fieldset className="grid justify-items-start gap-3">
      <legend className="mb-3 text-xs font-semibold">Reporting period</legend>
      <DateRangePicker
        value={range}
        onChange={setRange}
        label="Choose reporting period"
        locale="en"
      />
      <p role="status" className="text-xs text-muted-foreground">
        {range?.from
          ? `${range.from.toLocaleDateString("en-US")} — ${range.to?.toLocaleDateString("en-US") ?? "Choose an end date"}`
          : "No reporting period selected."}
      </p>
    </fieldset>
  );
}
