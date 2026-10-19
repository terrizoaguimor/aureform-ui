import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TableToolbarProps = Omit<ComponentProps<"div">, "title"> & {
  title?: ReactNode;
  titleId?: string;
  description?: ReactNode;
  descriptionId?: string;
  count?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
  selection?: ReactNode;
};

export function TableToolbar({
  title,
  titleId,
  description,
  descriptionId,
  count,
  search,
  actions,
  selection,
  children,
  className,
  ...props
}: TableToolbarProps) {
  return (
    <div
      data-slot="table-toolbar"
      className={cn(
        "grid gap-4 border-b border-border px-4 py-4 sm:px-6",
        className,
      )}
      {...props}
    >
      {(title || description) && (
        <div className="min-w-0">
          {title && (
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                id={titleId}
                className="text-base leading-6 font-semibold tracking-tight"
              >
                {title}
              </h2>
              {count != null && (
                <span className="rounded-full border border-primary/20 bg-accent/65 px-2.5 py-0.5 text-xs font-medium text-foreground tabular-nums">
                  {count}
                </span>
              )}
            </div>
          )}
          {description && (
            <p
              id={descriptionId}
              className="mt-1 text-[13px] leading-6 text-muted-foreground"
            >
              {description}
            </p>
          )}
        </div>
      )}
      {(search || actions || children) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {search}
          {(actions || children) && (
            <div
              data-slot="table-toolbar-actions"
              className="flex flex-wrap items-center gap-2 sm:ml-auto"
            >
              {actions}
              {children}
            </div>
          )}
        </div>
      )}
      {selection && (
        <div
          data-slot="table-selection-toolbar"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md,10px)] border border-primary/20 bg-accent/50 px-3 py-2.5"
        >
          {selection}
        </div>
      )}
    </div>
  );
}
