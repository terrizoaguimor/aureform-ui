import * as React from "react";
import { Info, CircleCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
export function Alert({
  title,
  children,
  variant = "info",
  className,
}: {
  title: string;
  children?: React.ReactNode;
  variant?: "info" | "success" | "warning" | "destructive";
  className?: string;
}) {
  const Icon =
    variant === "success"
      ? CircleCheck
      : variant === "warning" || variant === "destructive"
        ? TriangleAlert
        : Info;
  return (
    <div
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-xs",
        variant === "warning"
          ? "border-warning-foreground/20 bg-warning text-warning-foreground"
          : variant === "destructive"
            ? "border-destructive-foreground/20 bg-destructive text-destructive-foreground"
            : "border-primary/15 bg-accent text-accent-foreground",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
