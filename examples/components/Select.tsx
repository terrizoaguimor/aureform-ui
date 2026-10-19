"use client";

import { useState } from "react";
import { Select, type SelectOption } from "@/components/ui/select";

const options: SelectOption[] = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise", disabled: true },
];

export default function SelectExample() {
  const [plan, setPlan] = useState("starter");

  return (
    <div className="grid max-w-sm gap-3">
      <Select
        label="Plan"
        name="plan"
        options={options}
        value={plan}
        onValueChange={setPlan}
        placeholder="Choose a plan"
      />
      <p role="status" className="text-xs text-muted-foreground">
        Selected plan: {options.find((option) => option.value === plan)?.label}
      </p>
    </div>
  );
}
