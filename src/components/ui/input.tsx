import * as React from "react";
import { cn } from "@/lib/utils";
export const inputClasses =
  "af-input flex h-[var(--af-control-height,40px)] w-full min-w-0 rounded-[var(--radius-md,10px)] border border-border bg-surface px-3.5 text-[13px] leading-6 text-foreground outline-none transition-[border-color,background-color,box-shadow] placeholder:text-muted-foreground hover:border-primary/35 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 aria-invalid:border-destructive-foreground aria-invalid:ring-destructive-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:font-semibold file:text-accent-foreground";
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(inputClasses, className)}
      {...props}
    />
  );
}
