"use client";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled,
}: {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  disabled?: boolean;
}) {
  return (
    <SliderPrimitive.Root
      value={value}
      onValueChange={(v) => onValueChange(Array.isArray(v) ? v[0] : v)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    >
      <SliderPrimitive.Control className="flex h-6 w-full items-center touch-none select-none">
        <SliderPrimitive.Track className="relative h-1.5 w-full rounded-full bg-border">
          <SliderPrimitive.Indicator className="rounded-full bg-primary" />
          <SliderPrimitive.Thumb
            aria-label={label}
            className="size-4 rounded-full border-2 border-primary bg-surface outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}
