"use client";

import { useRef, type ComponentPropsWithoutRef, type Ref } from "react";
import { cn } from "@/lib/utils";
import { boundedNumber } from "./effect-utils";
import { EffectSurface, useComposedEffectRef } from "./effect-surface";
import { useEffectPointer } from "./effect-motion";
import "./effects.css";

export type MagneticButtonProps = ComponentPropsWithoutRef<"button"> & {
  /** Compose with one native link or a ref-forwarding button component. */
  asChild?: boolean;
  strength?: number;
  maxDistance?: number;
  ref?: Ref<HTMLElement>;
};

export function MagneticButton({
  asChild = false,
  strength = 0.18,
  maxDistance = 10,
  type = "button",
  className,
  ref,
  children,
  ...props
}: MagneticButtonProps = {}) {
  const surfaceRef = useRef<HTMLElement>(null);
  const mergedRef = useComposedEffectRef(surfaceRef, ref);
  useEffectPointer(
    surfaceRef,
    "magnetic",
    boundedNumber(strength, 0, 0.5, 0.18),
    boundedNumber(maxDistance, 0, 24, 10),
  );
  return (
    <EffectSurface
      {...props}
      as="button"
      asChild={asChild}
      type={asChild ? undefined : type}
      ref={mergedRef}
      data-slot="magnetic-button"
      data-afx-pointer="idle"
      data-afx-motion="paused"
      className={cn(
        "afx-magnetic-button inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold",
        className,
      )}
    >
      {children}
    </EffectSurface>
  );
}
