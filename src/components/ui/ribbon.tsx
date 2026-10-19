import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export function Ribbon({
  children,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "subtle" | "warning";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm px-3 py-1 text-[10px] font-semibold tracking-wide",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "subtle" && "bg-accent text-accent-foreground",
        variant === "warning" && "bg-warning text-warning-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
