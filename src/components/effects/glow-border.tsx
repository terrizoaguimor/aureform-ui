"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import {
  boundedNumber,
  effectFrameRate,
  paletteStyle,
  type EffectStyle,
} from "./effect-utils";
import {
  EffectSurface,
  useComposedEffectRef,
  type EffectSurfaceProps,
} from "./effect-surface";
import { useEffectActivity } from "./effect-motion";
import "./effects.css";

export type GlowBorderProps = EffectSurfaceProps & {
  colors?: string[];
  borderWidth?: number;
  duration?: number;
};

export function GlowBorder({
  colors,
  borderWidth = 1.5,
  duration = 12,
  className,
  style,
  ref,
  children,
  ...props
}: GlowBorderProps = {}) {
  const surfaceRef = useRef<HTMLElement>(null);
  const mergedRef = useComposedEffectRef(surfaceRef, ref);
  useEffectActivity(surfaceRef);
  const orbitDuration = boundedNumber(duration, 4, 60, 12);
  const mechanics: EffectStyle = {
    ...paletteStyle(colors),
    "--afx-border-width": `${boundedNumber(borderWidth, 1, 6, 1.5)}px`,
    "--afx-border-duration": `${orbitDuration}s`,
    "--afx-border-steps": Math.floor(orbitDuration * effectFrameRate),
    ...style,
  };
  return (
    <EffectSurface
      {...props}
      ref={mergedRef}
      data-slot="glow-border"
      data-afx-motion="paused"
      className={cn("afx-surface afx-glow-border min-w-0 p-6", className)}
      style={mechanics}
    >
      {children}
    </EffectSurface>
  );
}
