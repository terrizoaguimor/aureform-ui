import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  boundedNumber,
  gradientField,
  type EffectStyle,
  type GradientKind,
} from "./effect-utils";
import "./effects.css";

export type GradientBackgroundProps = {
  kind?: GradientKind;
  colors?: string[];
  angle?: number;
  intensity?: number;
  className?: string;
  children?: ReactNode;
};

/** A server-renderable, entirely static surface; it allocates no GPU context. */
export function GradientBackground({
  kind = "mesh",
  colors,
  angle = 135,
  intensity = 0.55,
  className,
  children,
}: GradientBackgroundProps = {}) {
  const style: EffectStyle = {
    "--afx-intensity": boundedNumber(intensity, 0, 1, 0.55),
  };
  return (
    <div
      data-slot="gradient-background"
      data-gradient-kind={kind}
      className={cn("afx-background min-h-64 rounded-2xl", className)}
      style={style}
    >
      <div
        aria-hidden="true"
        className="afx-background-field"
        style={{ backgroundImage: gradientField(kind, colors, angle) }}
      />
      <div aria-hidden="true" className="afx-background-scrim" />
      <div className="afx-background-content">{children}</div>
    </div>
  );
}
