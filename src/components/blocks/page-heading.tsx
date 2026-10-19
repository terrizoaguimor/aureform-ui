import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  editorial = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  editorial?: boolean;
  className?: string;
}) {
  return (
    <div
      data-motion="intro"
      className={cn(
        "flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-3 flex items-center gap-2 text-[11px] leading-5 font-semibold tracking-[.1em] text-primary uppercase">
            <span
              aria-hidden="true"
              className="h-px w-5 shrink-0 bg-primary/65"
            />
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            "text-[30px] leading-[1.15] font-semibold tracking-[-.035em] text-balance sm:text-[36px]",
            editorial &&
              "font-[family-name:var(--font-display)] text-[36px] sm:text-[44px]",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[14px] leading-7 text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pb-1">
          {actions}
        </div>
      )}
    </div>
  );
}
