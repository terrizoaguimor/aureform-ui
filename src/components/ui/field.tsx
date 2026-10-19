"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
export function Field({
  label,
  description,
  error,
  children,
  htmlFor,
  className,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  const id = React.useId();
  const inputId = htmlFor ?? id;
  const detailsId = `${inputId}-details`;
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={inputId} className="text-xs font-semibold">
        {label}
      </label>
      {React.isValidElement<Record<string, unknown>>(children) &&
      children.type !== "div"
        ? React.cloneElement(children, {
            id: inputId,
            "aria-invalid": !!error,
            "aria-describedby": error || description ? detailsId : undefined,
          })
        : children}
      {(error || description) && (
        <p
          id={detailsId}
          role={error ? "alert" : undefined}
          className={cn(
            "text-xs leading-relaxed",
            error ? "text-destructive-foreground" : "text-muted-foreground",
          )}
        >
          {error || description}
        </p>
      )}
    </div>
  );
}
