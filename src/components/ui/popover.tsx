"use client";
import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;
export const PopoverTitle = PopoverPrimitive.Title;
export const PopoverDescription = PopoverPrimitive.Description;
export function PopoverContent({
  className,
  sideOffset = 8,
  align = "center",
  ...props
}: Omit<React.ComponentProps<typeof PopoverPrimitive.Popup>, "className"> & {
  className?: string;
  sideOffset?: number;
  align?: "start" | "center" | "end";
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        className="z-70"
      >
        <PopoverPrimitive.Popup
          className={cn(
            "w-72 rounded-xl border border-border bg-surface p-4 text-foreground shadow-lg outline-none",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
