import * as React from "react";
import { cn } from "@/lib/utils";
import "@/styles/effects.css";
export type CardAppearance = "flat" | "elevated" | "glass" | "gradient";
export type CardProps = React.ComponentProps<"div"> & {
  appearance?: CardAppearance;
};
export function Card({ className, appearance, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-appearance={appearance}
      className={cn(
        "af-card af-shadow-soft min-w-0 rounded-[var(--af-radius,16px)] border border-border text-foreground",
        appearance && `af-card-${appearance}`,
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex min-w-0 flex-col gap-2 p-[var(--af-card-padding,24px)]",
        className,
      )}
      {...props}
    />
  );
}
export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn(
        "text-[15px] leading-6 font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}
export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-[13px] leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}
export function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "min-w-0 px-[var(--af-card-padding,24px)] pb-[var(--af-card-padding,24px)]",
        className,
      )}
      {...props}
    />
  );
}
export function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex flex-wrap items-center gap-3 px-[var(--af-card-padding,24px)] pb-[var(--af-card-padding,24px)]",
        className,
      )}
      {...props}
    />
  );
}
