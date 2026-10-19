"use client";

import { useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export default function CheckboxExample() {
  const id = useId();
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id={id} checked={accepted} onCheckedChange={setAccepted} />
        <label htmlFor={id} className="text-sm">
          Include weekly project updates
        </label>
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        {accepted
          ? "Weekly updates selected locally."
          : "Weekly updates not selected."}
      </p>
    </div>
  );
}
