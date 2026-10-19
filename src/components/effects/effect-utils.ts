import type { CSSProperties } from "react";

export const defaultEffectColors = ["#8b5cf6", "#22d3ee", "#34d399"] as const;
export const effectFrameRate = 30;
export const effectFrameInterval = 1000 / effectFrameRate;

export type EffectStyle = CSSProperties & {
  [key: `--afx-${string}`]: string | number;
};

export function boundedNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, value as number))
    : fallback;
}

/** Missing palette entries retain the original violet/cyan/emerald palette. */
export function effectColors(colors?: string[]): [string, string, string] {
  return defaultEffectColors.map((fallback, index) => {
    const color = colors?.[index];
    const token = ["primary", "secondary", "tertiary"][index];
    return typeof color === "string" && color.trim()
      ? color.trim()
      : `var(--af-color-${token}, ${fallback})`;
  }) as [string, string, string];
}

export function paletteStyle(colors?: string[]): EffectStyle {
  const [a, b, c] = effectColors(colors);
  return { "--afx-color-a": a, "--afx-color-b": b, "--afx-color-c": c };
}

export type GradientKind = "linear" | "radial" | "mesh";
export type ShaderKind = "aurora" | "waves" | "iridescent" | "none";

export function gradientField(
  kind: GradientKind,
  colors?: string[],
  angle = 135,
) {
  const [a, b, c] = effectColors(colors);
  const degrees = boundedNumber(angle, -3600, 3600, 135);

  if (kind === "linear") {
    return `linear-gradient(${degrees}deg, ${a} 0%, ${b} 52%, ${c} 100%)`;
  }
  if (kind === "radial") {
    return `radial-gradient(ellipse at 72% 28%, ${c} 0%, ${b} 36%, ${a} 72%, #090a16 100%)`;
  }
  return [
    `radial-gradient(ellipse at 82% 18%, ${c} 0%, transparent 46%)`,
    `radial-gradient(ellipse at 68% 78%, ${b} 0%, transparent 55%)`,
    `radial-gradient(ellipse at 15% 24%, ${a} 0%, transparent 62%)`,
    "linear-gradient(135deg, #161027, #090e1d)",
  ].join(", ");
}
