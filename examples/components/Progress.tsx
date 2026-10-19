"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ProgressExample() {
  const [value, setValue] = useState(64);

  return (
    <div className="grid w-full max-w-sm gap-3">
      <p className="text-xs font-semibold">Project progress: {value}%</p>
      <Progress
        value={value}
        max={100}
        label="Project progress"
        className="w-full"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={value === 100}
          onClick={() => setValue((current) => Math.min(100, current + 12))}
        >
          Advance
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setValue(0)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
