import * as React from "react";
import { cn } from "@/lib/utils";
import "@/styles/effects.css";

export type TableAppearance = "flat" | "elevated" | "glass" | "gradient";
export type TableDensity = "comfortable" | "compact";
export type TableProps = React.ComponentProps<"table"> & {
  appearance?: TableAppearance;
  density?: TableDensity;
  striped?: boolean;
  containerClassName?: string;
};

export function Table({
  className,
  containerClassName,
  appearance,
  density = "comfortable",
  striped = false,
  ...props
}: TableProps) {
  const named = Boolean(props["aria-label"] || props["aria-labelledby"]);
  return (
    <div
      data-slot="table-container"
      data-density={density}
      data-appearance={appearance}
      role={named ? "region" : undefined}
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      tabIndex={0}
      className={cn(
        "group/table w-full min-w-0 overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        appearance &&
          "af-card af-shadow-soft rounded-[var(--af-radius,16px)] border border-border",
        appearance && `af-card-${appearance}`,
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        data-striped={striped || undefined}
        className={cn(
          "w-full caption-bottom border-collapse text-left text-sm leading-5 text-foreground group-data-[density=compact]/table:text-[13px]",
          striped &&
            "[&_tbody>tr:nth-child(even):not([data-selected]):not(:hover):not(:focus-within)]:bg-surface-subtle/35",
          className,
        )}
        {...props}
      />
    </div>
  );
}
export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "bg-surface-subtle/65 [&_tr]:hover:bg-transparent [&_tr]:focus-within:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}
export function TableFooter({
  className,
  ...props
}: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border bg-surface-subtle/55 font-semibold [&_tr]:border-0",
        className,
      )}
      {...props}
    />
  );
}
export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/75 transition-colors hover:bg-surface-subtle/55 focus-within:bg-surface-subtle/55 data-selected:bg-accent/65 data-selected:hover:bg-accent/85 data-selected:focus-within:bg-accent/85 data-selected:[&>td:first-child]:shadow-[inset_3px_0_0_var(--primary)] motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}
export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn(
        "h-12 px-4 text-xs leading-5 font-semibold text-muted-foreground whitespace-nowrap sm:px-6 group-data-[density=compact]/table:h-10 group-data-[density=compact]/table:px-3.5",
        className,
      )}
      {...props}
    />
  );
}
export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-4 align-middle sm:px-6 group-data-[density=compact]/table:px-3.5 group-data-[density=compact]/table:py-2.5",
        className,
      )}
      {...props}
    />
  );
}
export function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}
