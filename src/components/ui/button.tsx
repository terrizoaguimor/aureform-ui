"use client";
import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/effects.css";

export const buttonVariants = cva(
  "af-button af-control inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border border-transparent text-[13px] leading-5 font-semibold tracking-[-.01em] outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--af-motion-fast,150ms)] active:scale-[.98] motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 data-disabled:pointer-events-none data-disabled:opacity-45 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "af-button-primary bg-primary text-primary-foreground hover:bg-[color:var(--af-shade-primary,var(--primary-hover))]",
        outline:
          "af-button-outline border-border bg-surface text-foreground [background-image:none] hover:border-primary/40 hover:bg-[color:var(--af-shade-outline,var(--surface-subtle))]",
        secondary:
          "af-button-surface bg-accent text-accent-foreground [background-image:none] hover:bg-[color:var(--af-shade-surface,var(--accent))] hover:text-foreground",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
        destructive:
          "af-button-destructive bg-destructive text-destructive-foreground [background-image:none] hover:bg-[color:var(--af-shade-destructive,var(--destructive))]",
        link: "af-hover-link bg-transparent text-primary underline underline-offset-4 hover:text-primary-hover",
      },
      size: {
        sm: "h-8 px-3",
        default: "h-[var(--af-control-height,40px)] px-4",
        lg: "h-12 px-6 text-sm",
        icon: "size-[var(--af-control-height,40px)]",
        "icon-sm": "size-8",
      },
      shape: {
        rounded: "rounded-[var(--radius-md,10px)]",
        pill: "rounded-full",
        square: "rounded-none",
      },
    },
    defaultVariants: { variant: "default", size: "default", shape: "rounded" },
  },
);
export type ButtonShape = "rounded" | "pill" | "square";
export type ButtonAppearance =
  "solid" | "soft" | "outline" | "glass" | "gradient";
const appearanceClasses: Record<ButtonAppearance, string> = {
  solid: "[background-image:none]",
  soft: "border-primary/25 bg-accent text-accent-foreground [background-image:none] hover:bg-[color:var(--af-shade-surface)] hover:text-foreground",
  outline:
    "border-primary/40 bg-surface text-foreground [background-image:none] hover:bg-[color:var(--af-shade-outline)] hover:text-foreground",
  glass:
    "border-primary/30 bg-[var(--af-glass-background)] text-foreground hover:bg-[var(--af-glass-background)] hover:text-foreground",
  gradient:
    "border-transparent bg-primary text-primary-foreground [background-image:var(--af-gradient-primary)] hover:bg-primary-hover hover:text-primary-foreground",
};
export type ButtonProps = Omit<
  React.ComponentProps<typeof ButtonPrimitive>,
  "className"
> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    loading?: boolean;
    appearance?: ButtonAppearance;
  };
export function Button({
  className,
  variant,
  size,
  shape,
  loading,
  appearance,
  children,
  disabled,
  focusableWhenDisabled,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-busy": ariaBusy,
  ...props
}: ButtonProps) {
  const labelId = React.useId();
  return (
    <ButtonPrimitive
      {...props}
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      data-shape={shape ?? "rounded"}
      data-appearance={appearance}
      className={cn(
        buttonVariants({ variant, size, shape }),
        appearance && `af-control-${appearance}`,
        appearance &&
          variant !== "destructive" &&
          appearanceClasses[appearance],
        className,
      )}
      disabled={disabled || loading}
      focusableWhenDisabled={focusableWhenDisabled ?? loading}
      aria-busy={loading || ariaBusy}
      aria-label={ariaLabel}
      aria-labelledby={
        ariaLabelledBy ?? (loading && !ariaLabel ? labelId : undefined)
      }
    >
      {loading && (
        <LoaderCircle
          className="motion-safe:animate-spin motion-reduce:animate-none [[data-motion-level=off]_&]:animate-none"
          aria-hidden="true"
        />
      )}
      <span id={labelId} className="contents">
        {children}
      </span>
    </ButtonPrimitive>
  );
}
