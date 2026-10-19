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

export type SpotlightCardProps = EffectSurfaceProps & {
  spotlightColor?: string;
  intensity?: number;
  radius?: number;
};

export function SpotlightCard({
  spotlightColor = "var(--af-color-primary, #8b5cf6)",
  intensity = 0.22,
  radius = 320,
  className,
  style,
  ref,
  children,
  ...props
}: SpotlightCardProps = {}) {
  const surfaceRef = useRef<HTMLElement>(null);
  const mergedRef = useComposedEffectRef(surfaceRef, ref);
  useEffectPointer(surfaceRef, "spotlight", 0, 0);
  const mechanics: EffectStyle = {
    "--afx-spotlight-color": spotlightColor,
    "--afx-spotlight-intensity": boundedNumber(intensity, 0, 1, 0.22),
    "--afx-spotlight-radius": `${boundedNumber(radius, 80, 800, 320)}px`,
    ...style,
  };
  return (
    <EffectSurface
      {...props}
      ref={mergedRef}
      data-slot="spotlight-card"
      data-afx-pointer="idle"
      data-afx-motion="paused"
      className={cn("afx-surface afx-spotlight min-w-0 p-6", className)}
      style={mechanics}
    >
      {children}
    </EffectSurface>
  );
}
