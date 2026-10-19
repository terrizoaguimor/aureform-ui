"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { boundedNumber, type EffectStyle } from "./effect-utils";
import {
  EffectSurface,
  useComposedEffectRef,
  type EffectSurfaceProps,
} from "./effect-surface";
import { useEffectPointer } from "./effect-motion";
import "./effects.css";

export type TiltCardProps = EffectSurfaceProps & {
  maxTilt?: number;
  perspective?: number;
};

export function TiltCard({
  maxTilt = 6,
  perspective = 900,
  className,
  style,
  ref,
  children,
  ...props
}: TiltCardProps = {}) {
  const surfaceRef = useRef<HTMLElement>(null);
  const mergedRef = useComposedEffectRef(surfaceRef, ref);
  useEffectPointer(surfaceRef, "tilt", boundedNumber(maxTilt, 0, 12, 6), 0);
  const mechanics: EffectStyle = {
    "--afx-perspective": `${boundedNumber(perspective, 400, 2000, 900)}px`,
    "--afx-spotlight-color": "var(--af-color-secondary, #22d3ee)",
    "--afx-spotlight-intensity": 0.12,
    ...style,
  };
  return (
    <EffectSurface
      {...props}
      ref={mergedRef}
      data-slot="tilt-card"
      data-afx-pointer="idle"
      data-afx-motion="paused"
      className={cn("afx-surface afx-tilt min-w-0 p-6", className)}
      style={mechanics}
    >
      {children}
    </EffectSurface>
  );
}
