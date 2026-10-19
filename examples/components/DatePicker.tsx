"use client";

import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";

export default function DatePickerExample() {
  const [date, setDate] = useState<Date | undefined>();

  return (
    <fieldset className="grid justify-items-start gap-3">
      <legend className="mb-3 text-xs font-semibold">Launch date</legend>
      <DatePicker
        value={date}
        onChange={setDate}
        label="Choose launch date"
        locale="en"
      />
      <p role="status" className="text-xs text-muted-foreground">
        {date
          ? `Selected: ${date.toLocaleDateString("en-US")}`
          : "No date selected."}
      </p>
    </fieldset>
  );
}
