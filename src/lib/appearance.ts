export type Theme = "light" | "dark";
export type PaletteId = "aurora" | "violet" | "ocean" | "mint" | "ember" | "rose";
export type Material = "flat" | "elevated" | "glass" | "gradient";
export type MotionLevel = "off" | "gentle" | "expressive";
export type HoverEffect = "none" | "lift" | "glow" | "spotlight" | "tilt" | "magnetic";
export type GradientKind = "linear" | "radial" | "mesh";
export type ShaderKind = "aurora" | "waves" | "iridescent" | "none";
export interface AppearanceConfig {
  version: 1;
  theme: Theme;
  palette: PaletteId;
  colors: { primary: string; secondary: string; tertiary: string };
  material: Material;
  radius: number;
  density: "comfortable" | "compact";
  typography: "modern" | "editorial";
  motion: MotionLevel;
  hover: HoverEffect;
  shadow: number;
  border: number;
  gradient: {
    kind: GradientKind;
    angle: number;
    intensity: number;
    stops: { color: string; position: number }[];
  };
  shader: {
    kind: ShaderKind;
    speed: number;
    scale: number;
    intensity: number;
    paused: boolean;
  };
}
export interface SavedAppearance {
  id: string;
  name: string;
  config: AppearanceConfig;
}
export const appearanceStorageKey = "aureform:appearance:v1";
export const presetsStorageKey = "aureform:presets:v1";
export const palettePresets: {
  id: PaletteId;
  name: string;
  colors: [string, string, string];
}[] = [
  { id: "aurora", name: "Aurora", colors: ["#8B5CF6", "#22D3EE", "#34D399"] },
  { id: "violet", name: "Violet", colors: ["#8B5CF6", "#E879F9", "#6366F1"] },
  { id: "ocean", name: "Ocean", colors: ["#3B82F6", "#06B6D4", "#38BDF8"] },
  { id: "mint", name: "Mint", colors: ["#10B981", "#A3E635", "#2DD4BF"] },
  { id: "ember", name: "Ember", colors: ["#F97316", "#F43F5E", "#FBBF24"] },
  { id: "rose", name: "Rose", colors: ["#EC4899", "#A78BFA", "#FB7185"] },
];

export function createAppearance(palette: PaletteId = "aurora", theme: Theme = "dark"): AppearanceConfig {
  const selected = palettePresets.find((item) => item.id === palette) ?? palettePresets[0];
  return {
    version: 1, theme, palette: selected.id,
    colors: { primary: selected.colors[0], secondary: selected.colors[1], tertiary: selected.colors[2] },
    material: "elevated", radius: 16, density: "comfortable", typography: "modern",
    motion: "expressive", hover: "glow", shadow: .65, border: .55,
    gradient: { kind: "mesh", angle: 125, intensity: .65, stops: selected.colors.map((color, index) => ({ color, position: index / 2 })) },
    shader: { kind: "aurora", speed: .2, scale: 1, intensity: .55, paused: false },
  };
}
export const defaultAppearance = createAppearance();
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an appearance object.");
  return value as Record<string, unknown>;
};
const option = <T extends string>(value: unknown, allowed: readonly T[]): T => {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error(`Invalid choice: ${String(value)}.`);
  return value as T;
};
const number = (value: unknown, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`Expected a number between ${min} and ${max}.`);
  return value;
};
export function normalizeColor(value: unknown): string {
  if (typeof value !== "string" || !/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)) throw new Error("Use a hexadecimal color such as #8B5CF6.");
  return (value.length === 4 ? "#" + [...value.slice(1)].map((c) => c + c).join("") : value).toUpperCase();
}
export function normalizeAppearance(input: unknown): AppearanceConfig {
  const value = object(input), colors = object(value.colors), gradient = object(value.gradient), shader = object(value.shader);
  if (value.version !== 1) throw new Error("Unsupported appearance version.");
  if (!Array.isArray(gradient.stops) || gradient.stops.length < 2 || gradient.stops.length > 4) throw new Error("A gradient needs two to four stops.");
  if (typeof shader.paused !== "boolean") throw new Error("The shader pause setting must be a boolean.");
  return {
    version: 1,
    theme: option(value.theme, ["light", "dark"]),
    palette: option(value.palette, palettePresets.map((item) => item.id)),
    colors: { primary: normalizeColor(colors.primary), secondary: normalizeColor(colors.secondary), tertiary: normalizeColor(colors.tertiary) },
    material: option(value.material, ["flat", "elevated", "glass", "gradient"]),
    radius: number(value.radius, 0, 24),
    density: option(value.density, ["comfortable", "compact"]),
    typography: option(value.typography, ["modern", "editorial"]),
    motion: option(value.motion, ["off", "gentle", "expressive"]),
    hover: option(value.hover, ["none", "lift", "glow", "spotlight", "tilt", "magnetic"]),
    shadow: number(value.shadow, 0, 1), border: number(value.border, 0, 1),
    gradient: {
      kind: option(gradient.kind, ["linear", "radial", "mesh"]),
      angle: number(gradient.angle, 0, 360), intensity: number(gradient.intensity, 0, 1),
      stops: gradient.stops.map((stop) => { const s = object(stop); return { color: normalizeColor(s.color), position: number(s.position, 0, 1) }; }).sort((a, b) => a.position - b.position),
    },
    shader: {
      kind: option(shader.kind, ["aurora", "waves", "iridescent", "none"]),
      speed: number(shader.speed, 0, 1), scale: number(shader.scale, .25, 4),
      intensity: number(shader.intensity, 0, 1), paused: shader.paused,
    },
  };
}
export function parseAppearance(text: string): AppearanceConfig {
  if (text.length > 32768) throw new Error("The appearance file is too large.");
  return normalizeAppearance(JSON.parse(text));
}
export function serializeAppearance(config: AppearanceConfig): string {
  return JSON.stringify(normalizeAppearance(config), null, 2);
}
function rgb(hex: string): [number, number, number] {
  const normalized = normalizeColor(hex);
  return [1, 3, 5].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16)) as [number, number, number];
}
export function mixColor(a: string, b: string, amount: number): string {
  const left = rgb(a), right = rgb(b), ratio = Math.max(0, Math.min(1, amount));
  return "#" + left.map((value, index) => Math.round(value * (1 - ratio) + right[index] * ratio).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function rgbLuminance(channels: readonly number[]): number {
  const [r, g, b] = channels.map((value) => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
  return .2126 * r + .7152 * g + .0722 * b;
}
function luminance(hex: string): number {
  return rgbLuminance(rgb(hex));
}
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function accessibleColor(color: string, background: string, minimum = 4.5): string {
  if (contrastRatio(color, background) >= minimum) return normalizeColor(color);
  const endpoint = contrastRatio("#FFFFFF", background) > contrastRatio("#000000", background) ? "#FFFFFF" : "#000000";
  for (let i = 1; i <= 100; i++) {
    const result = mixColor(color, endpoint, i / 100);
    if (contrastRatio(result, background) >= minimum) return result;
  }
  return endpoint;
}
function readableControlColors(colors: string[], foreground: string): string[] {
  const minimum = 4.55;
  const text = luminance(foreground);
  const stops = colors.map((color) => accessibleColor(color, foreground, minimum));
  const readable = (candidate: string[]) => {
    const channels = candidate.map(rgb);
    let background = text > .5 ? 0 : 1;
    for (let index = 1; index < channels.length; index++) {
      const left = channels[index - 1], right = channels[index];
      const at = (position: number) => rgbLuminance(left.map((value, channel) => value + (right[channel] - value) * position));
      if (text > .5) {
        // sRGB luminance is convex: white text's worst point is an endpoint.
        background = Math.max(background, at(0), at(1));
      } else {
        // Different hues can mix into a darker interior even when both stops
        // pass. Find that convex minimum without rounding the mixed channels.
        let low = 0, high = 1;
        for (let step = 0; step < 32; step++) {
          const a = low + (high - low) / 3, b = high - (high - low) / 3;
          if (at(a) < at(b)) high = b;
          else low = a;
        }
        background = Math.min(background, at(0), at(1), at((low + high) / 2));
      }
    }
    return (Math.max(text, background) + .05) / (Math.min(text, background) + .05) >= minimum;
  };
  if (readable(stops)) return stops;
  const endpoint = text > .5 ? "#000000" : "#FFFFFF";
  let low = 0, high = 1;
  for (let step = 0; step < 14; step++) {
    const amount = (low + high) / 2;
    if (readable(stops.map((color) => mixColor(color, endpoint, amount)))) high = amount;
    else low = amount;
  }
  return stops.map((color) => mixColor(color, endpoint, high));
}
export function shadeScale(hex: string): { step: number; color: string }[] {
  return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => ({
    step, color: step < 500 ? mixColor(hex, "#FFFFFF", (500 - step) / 520) : mixColor(hex, "#050810", (step - 500) / 540),
  }));
}
export function resolveAppearance(input: AppearanceConfig): Record<string, string> {
  const c = normalizeAppearance(input), dark = c.theme === "dark";
  const background = dark ? "#0B0F18" : "#F6F8FC", surface = dark ? "#141B2B" : "#FFFFFF";
  const surfaceSubtle = dark ? "#1D2840" : "#EAF0F9";
  const accent = mixColor(surface, c.colors.primary, dark ? .24 : .11);
  const primaryBackdrop = [background, surface, surfaceSubtle, accent, mixColor(surface, c.colors.primary, dark ? .27 : .16)]
    .reduce((current, next) => (dark ? luminance(next) > luminance(current) : luminance(next) < luminance(current)) ? next : current, surface);
  const foreground = dark ? "#F4F7FF" : "#172033";
  const primary = accessibleColor(c.colors.primary, primaryBackdrop, 4.55);
  const primaryForeground = contrastRatio(primary, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#080D17";
  const secondary = accessibleColor(c.colors.secondary, surface, 3);
  const tertiary = accessibleColor(c.colors.tertiary, surface, 3);
  const muted = dark ? "#AFBDD4" : "#586780";
  const border = mixColor(surface, dark ? "#C4D4EF" : "#506181", .1 + c.border * .12);
  const shadowColor = dark ? "0 0 0" : "31 47 87";
  const shadow = (scale: number, y: number, blur: number) => `0 ${y}px ${blur}px rgb(${shadowColor} / ${((dark ? .45 : .1) * c.shadow * scale).toFixed(3)})`;
  const percent = (n: number) => `${Math.round(n * 100)}%`;
  const decorativeStops = c.gradient.stops.map((s) => `${s.color} ${percent(s.position)}`).join(", ");
  const controlColors = readableControlColors(c.gradient.stops.map((s) => s.color), primaryForeground);
  const safeStops = c.gradient.stops.map((s, index) => `${controlColors[index]} ${percent(s.position)}`).join(", ");
  const gradient = c.gradient.kind === "radial" ? `radial-gradient(ellipse at 24% 18%, ${decorativeStops})`
    : c.gradient.kind === "mesh" ? c.gradient.stops.map((stop, index) => `radial-gradient(ellipse at ${Math.round(12 + stop.position * 76)}% ${Math.round(8 + index / Math.max(1, c.gradient.stops.length - 1) * 84)}%, ${stop.color}, transparent 68%)`).join(", ")
      : `linear-gradient(${c.gradient.angle}deg, ${decorativeStops})`;
  const safeGradient = `linear-gradient(${c.gradient.angle}deg in srgb, ${safeStops})`;
  const heroAlpha = Math.round(c.gradient.intensity * (dark ? 25 : 16));
  const materialMix = c.material === "gradient" ? (dark ? 20 : 9) : c.material === "glass" ? (dark ? 12 : 5) : 0;
  const surfaceGradient = `linear-gradient(${c.gradient.angle}deg, ${surface}, color-mix(in srgb, ${surface} ${dark ? 78 : 90}%, ${c.colors.primary}))`;
  const values: Record<string, string> = {
    "--background": background, "--surface": surface, "--surface-subtle": surfaceSubtle,
    "--foreground": foreground, "--muted-foreground": muted, "--border": border,
    "--primary": primary, "--primary-hover": mixColor(primary, dark ? "#FFFFFF" : "#000000", .12),
    "--primary-foreground": primaryForeground, "--accent": accent, "--accent-foreground": accessibleColor(primary, accent),
    "--warning": dark ? "#483720" : "#FFF0DA", "--warning-foreground": dark ? "#FDD38A" : "#86551B",
    "--destructive": dark ? "#482631" : "#FFE8EE", "--destructive-foreground": dark ? "#FFB6C9" : "#A42E4F",
    "--ring": primary, "--chart-1": primary, "--chart-2": secondary, "--chart-3": tertiary,
    "--chart-4": accessibleColor("#F59E0B", surface, 3), "--chart-5": accessibleColor("#F472B6", surface, 3),
    "--af-color-primary": c.colors.primary, "--af-color-secondary": c.colors.secondary, "--af-color-tertiary": c.colors.tertiary,
    "--af-shadow-soft": shadow(1, 6, 18), "--af-shadow-elevated": `${shadow(1, 2, 6)}, ${shadow(1.5, 18, 44)}`,
    "--af-shadow-floating": `${shadow(1, 4, 12)}, ${shadow(2.2, 30, 80)}`,
    "--af-glow": `0 0 ${Math.round(18 + 20 * c.shadow)}px color-mix(in srgb, ${c.colors.primary} ${dark ? 26 : 16}%, transparent)`,
    "--af-shade-primary": mixColor(primary, dark ? "#FFFFFF" : "#000000", .12),
    "--af-shade-outline": mixColor(surface, c.colors.primary, dark ? .16 : .08),
    "--af-shade-surface": mixColor(surface, c.colors.primary, dark ? .27 : .16),
    "--af-shade-destructive": dark ? "#5A2D3B" : "#FFD5E0",
    "--af-shade-card": mixColor(surface, c.colors.primary, dark ? .1 : .04),
    "--af-gradient-control": safeGradient, "--af-gradient-color": gradient, "--af-gradient-primary": safeGradient,
    "--af-control-color-1": controlColors[0], "--af-control-color-2": controlColors[1],
    "--af-control-color-3": controlColors[2] ?? controlColors.at(-1)!,
    "--af-control-color-4": controlColors[3] ?? controlColors.at(-1)!,
    "--af-gradient-text": `linear-gradient(${c.gradient.angle}deg, ${primary}, ${secondary}, ${tertiary})`,
    "--af-gradient-surface": `linear-gradient(${c.gradient.angle}deg, ${surface}, color-mix(in srgb, ${surface} ${100 - materialMix}%, ${c.colors.primary}))`,
    "--af-gradient-hero": `radial-gradient(ellipse at 16% 4%, color-mix(in srgb, ${c.colors.primary} ${heroAlpha + 6}%, transparent), transparent 62%), radial-gradient(ellipse at 92% 24%, color-mix(in srgb, ${c.colors.secondary} ${heroAlpha}%, transparent), transparent 55%), linear-gradient(160deg, ${surface}, ${background} 65%)`,
    "--af-glass-background": `color-mix(in srgb, ${surface} ${dark ? 80 : 87}%, transparent)`,
    "--af-glass-blur": "18px",
    "--af-card-background": c.material === "glass" ? `color-mix(in srgb, ${surface} ${dark ? 80 : 87}%, transparent)` : surface,
    "--af-card-image": c.material === "gradient" ? surfaceGradient : "none",
    "--af-card-shadow": c.material === "flat" ? "0 0 #0000" : c.material === "elevated" ? shadow(1.5, 12, 32) : shadow(1, 6, 18),
    "--af-card-blur": c.material === "glass" ? "blur(18px)" : "none",
    "--af-hover-shadow": c.hover === "none" ? shadow(1, 6, 18) : `${shadow(1.5, 12, 32)}, 0 0 28px color-mix(in srgb, ${c.colors.primary} ${dark ? 22 : 13}%, transparent)`,
    "--af-motion-fast": c.motion === "off" ? "0ms" : "160ms",
    "--af-motion-hover": c.motion === "off" ? "0ms" : c.motion === "gentle" ? "200ms" : "280ms",
    "--af-motion-easing": "cubic-bezier(.2,.75,.25,1)",
    "--af-motion-lift": c.motion === "off" || c.hover === "none" ? "0px" : c.motion === "gentle" ? "-2px" : "-4px",
    "--af-radius": `${c.radius}px`, "--radius-sm": `${Math.max(0, c.radius * .4)}px`,
    "--radius-md": `${Math.max(0, c.radius * .65)}px`, "--radius-lg": `${c.radius}px`, "--radius-xl": `${c.radius}px`,
    "--af-radius-sm": `${Math.max(0, c.radius * .4)}px`, "--af-radius-md": `${Math.max(0, c.radius * .65)}px`,
    "--af-radius-lg": `${c.radius}px`, "--af-radius-xl": `${c.radius}px`,
    "--af-control-height": c.density === "compact" ? "36px" : "42px",
    "--af-card-padding": c.density === "compact" ? "18px" : "24px",
    "--font-display": c.typography === "editorial" ? 'var(--font-instrument, Georgia, serif)' : 'var(--font-manrope, "Manrope", system-ui, sans-serif)',
    "--af-display-weight": c.typography === "editorial" ? "400" : "650",
  };
  for (const [name, color] of Object.entries(c.colors)) {
    for (const shade of shadeScale(color)) values[`--af-${name}-${shade.step}`] = shade.color;
  }
  return values;
}
export function appearanceToCSS(config: AppearanceConfig): string {
  const c = normalizeAppearance(config);
  return `/* Aureform ${c.palette} · ${c.theme} */\n:root {\n  color-scheme: ${c.theme};\n${Object.entries(resolveAppearance(c)).map(([name, value]) => `  ${name}: ${value};`).join("\n")}\n}\n`;
}
export function exportConfiguredExample(source: string, config: AppearanceConfig): string {
  const name = source.match(/export default function\s+([A-Za-z_$][\w$]*)/)?.[1];
  if (!name) throw new Error("Expected a complete named React example.");
  const imports = `import { AppearanceScope } from "@/components/appearance-provider";\nimport type { AppearanceConfig } from "@/lib/appearance";\n`;
  const original = source.replace(/export default function\s+/, "function ");
  const withImports = original.startsWith('"use client";') ? original.replace('"use client";', `"use client";\n${imports}`) : `"use client";\n${imports}\n${original}`;
  return `${withImports.trim()}\n\nconst appearance: AppearanceConfig = ${serializeAppearance(config)};\n\nexport default function Configured${name}() {\n  return (\n    <AppearanceScope appearance={appearance}>\n      <${name} />\n    </AppearanceScope>\n  );\n}\n`;
}
