"use client";

import { useId, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function RadioGroupExample() {
  const id = useId();
  const [plan, setPlan] = useState<"starter" | "pro">("starter");

  return (
    <fieldset className="grid gap-3">
      <legend id={`${id}-label`} className="mb-3 text-xs font-semibold">
        Plan
      </legend>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        value={plan}
        onValueChange={(value) => {
          if (value === "starter" || value === "pro") setPlan(value);
        }}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem id={`${id}-starter`} value="starter" />
          <label htmlFor={`${id}-starter`} className="text-sm">
            Starter
          </label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem id={`${id}-pro`} value="pro" />
          <label htmlFor={`${id}-pro`} className="text-sm">
            Pro
          </label>
        </div>
      </RadioGroup>
    </fieldset>
  );
}
