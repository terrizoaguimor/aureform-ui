"use client";
import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
export function Checkbox({
  className,
  indeterminate,
  ...props
}: Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, "className"> & {
  className?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded border border-border bg-surface outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:bg-primary data-indeterminate:text-primary-foreground data-disabled:opacity-40",
        className,
      )}
      indeterminate={indeterminate}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        {indeterminate ? (
          <Minus className="size-3" />
        ) : (
          <Check className="size-3" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
