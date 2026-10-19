import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function ButtonGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex [&>button]:rounded-none [&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md [&>button+button]:-ml-px",
        className,
      )}
      {...props}
    />
  );
}
