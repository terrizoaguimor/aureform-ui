"use client";
import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { cn } from "@/lib/utils";
export function RadioGroup({
  className,
  ...props
}: Omit<React.ComponentProps<typeof RadioGroupPrimitive>, "className"> & {
  className?: string;
}) {
  return (
    <RadioGroupPrimitive className={cn("grid gap-3", className)} {...props} />
  );
}
export function RadioGroupItem({
  className,
  ...props
}: Omit<React.ComponentProps<typeof RadioPrimitive.Root>, "className"> & {
  className?: string;
}) {
  return (
    <RadioPrimitive.Root
      className={cn(
        "flex size-4 items-center justify-center rounded-full border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring data-checked:border-primary",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2 rounded-full bg-primary" />
    </RadioPrimitive.Root>
  );
}
