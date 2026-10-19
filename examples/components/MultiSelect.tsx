"use client";

import { useState } from "react";
import type { ComboboxOption } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";

const options: ComboboxOption[] = [
  { value: "figma", label: "Figma" },
  { value: "typescript", label: "TypeScript" },
  { value: "tailwind", label: "Tailwind CSS" },
];

export default function MultiSelectExample() {
  const [tools, setTools] = useState<string[]>(["figma"]);

  return (
    <fieldset className="grid max-w-lg gap-2">
      <legend className="mb-2 text-xs font-semibold">Project tools</legend>
      <MultiSelect
        label="Project tools"
        options={options}
        value={tools}
        onValueChange={setTools}
        placeholder="Search tools…"
        emptyLabel="No matching tools"
        removeLabel="Remove tool"
        keyboardHint="Press Backspace or Delete to remove a selected tool."
      />
      <p className="text-xs text-muted-foreground">
        {tools.length} tools selected
      </p>
    </fieldset>
  );
}
