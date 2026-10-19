"use client";

import { useId, useState } from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

const options: ComboboxOption[] = [
  { value: "next", label: "Next.js" },
  { value: "react", label: "React" },
  { value: "remix", label: "Remix" },
];

export default function ComboboxExample() {
  const id = useId();
  const [framework, setFramework] = useState<string | null>("next");

  return (
    <div className="grid max-w-sm gap-2">
      <label htmlFor={id} className="text-xs font-semibold">
        Framework
      </label>
      <Combobox
        id={id}
        label="Framework"
        options={options}
        value={framework}
        onValueChange={setFramework}
        placeholder="Search frameworks…"
        emptyLabel="No matching frameworks"
      />
    </div>
  );
}
