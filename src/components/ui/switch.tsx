"use client";
import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";
export function Switch({
  className,
  ...props
}: Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, "className"> & {
  className?: string;
}) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "flex h-6 w-10 shrink-0 items-center rounded-full bg-border p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-checked:bg-primary data-disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="size-5 rounded-full bg-surface shadow-sm transition-transform data-checked:translate-x-4" />
    </SwitchPrimitive.Root>
  );
}
