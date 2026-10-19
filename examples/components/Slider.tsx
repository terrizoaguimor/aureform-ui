"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";

export default function SliderExample() {
  const [value, setValue] = useState(40);

  return (
    <fieldset className="grid max-w-sm gap-3">
      <legend className="mb-3 text-xs font-semibold">
        Intensity: {value}%
      </legend>
      <Slider
        label="Intensity"
        value={value}
        onValueChange={setValue}
        min={0}
        max={100}
        step={5}
      />
    </fieldset>
  );
}
