import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
export const badgeVariants = cva(
  "af-badge inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-2.5 py-1 text-[11px] leading-4 font-semibold tracking-[.01em] [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground",
        neutral: "bg-surface-subtle text-muted-foreground",
        warning: "bg-warning text-warning-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export type BadgeAppearance =
  "solid" | "soft" | "outline" | "glass" | "gradient";
const appearanceClasses: Record<BadgeAppearance, string> = {
  solid: "bg-primary text-primary-foreground",
  soft: "bg-accent text-accent-foreground",
  outline: "border-border bg-transparent text-foreground",
  glass: "border-border bg-[var(--af-glass-background)] text-foreground",
  gradient:
    "bg-primary text-primary-foreground [background-image:var(--af-gradient-primary)]",
};
export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    appearance?: BadgeAppearance;
  };
export function Badge({
  className,
  variant,
  appearance,
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? "default"}
      data-appearance={appearance}
      className={cn(
        badgeVariants({ variant }),
        appearance && `af-badge-${appearance}`,
        appearance && appearanceClasses[appearance],
        appearance &&
          variant === "warning" &&
          "bg-warning text-warning-foreground [background-image:none]",
        appearance &&
          variant === "destructive" &&
          "bg-destructive text-destructive-foreground [background-image:none]",
        className,
      )}
      {...props}
    />
  );
}
