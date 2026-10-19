"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  Download,
  Layers3,
  Moon,
  Paintbrush2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useCopy } from "@/hooks/use-copy";
import {
  AppearanceScope,
  useAppearance,
} from "@/components/appearance-provider";
import {
  PalettePicker,
  paletteDisplayName,
} from "@/components/appearance-controls";
import {
  GlowBorder,
  GradientBackground,
  MagneticButton,
  ShaderBackground,
  SpotlightCard,
  TiltCard,
} from "@/components/effects";
import { PageHeading } from "@/components/blocks/page-heading";
import { MetricCard } from "@/components/blocks/metric-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Chart } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  appearanceToCSS,
  exportConfiguredExample,
  palettePresets,
  parseAppearance,
  serializeAppearance,
  shadeScale,
  type AppearanceConfig,
  type Material,
} from "@/lib/appearance";
import { cn, downloadText } from "@/lib/utils";

type Translate = ReturnType<typeof useLanguage>["l"];
type EditorSection = "colors" | "surfaces" | "motion";
type PreviewSection = "product" | "components" | "background";
type ExportFormat = "json" | "css" | "react";

function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 3,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2.5 text-xs font-semibold">{label}</legend>
      <div
        className={cn(
          "grid gap-1.5",
          columns === 2 ? "grid-cols-2" : "grid-cols-3",
        )}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors",
              value === option.value
                ? "border-primary/60 bg-accent text-accent-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function RangeControl({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  display,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium">
          {label}
        </label>
        <output
          htmlFor={id}
          className="rounded-md bg-surface-subtle px-2 py-1 font-mono text-[10px] tabular-nums text-muted-foreground"
        >
          {display ?? `${Math.round(value * 100)}%`}
        </output>
      </div>
      <input
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="mt-1 h-9 w-full cursor-pointer accent-primary disabled:cursor-default disabled:opacity-50"
      />
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
  shades = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  shades?: boolean;
}) {
  const { l } = useLanguage();
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [touched, setTouched] = useState(false);
  const invalid = !/^#[\da-f]{6}$/i.test(draft);
  useEffect(() => {
    setDraft(value);
    setTouched(false);
  }, [value]);
  const update = (color: string) => {
    setDraft(color);
    if (/^#[\da-f]{6}$/i.test(color)) {
      onChange(color.toUpperCase());
      setTouched(false);
    }
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-xs font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          aria-label={l(
            `Choose ${label.toLowerCase()} color`,
            `Elegir color: ${label.toLowerCase()}`,
          )}
          onChange={(event) => update(event.currentTarget.value)}
          className="size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-surface p-1"
        />
        <Input
          id={id}
          value={draft}
          onChange={(event) => update(event.currentTarget.value)}
          onBlur={() => {
            const short = /^#([\da-f])([\da-f])([\da-f])$/i.exec(draft);
            if (short) {
              update(
                `#${short[1].repeat(2)}${short[2].repeat(2)}${short[3].repeat(2)}`,
              );
            } else {
              setTouched(true);
            }
          }}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={touched && invalid}
          aria-describedby={touched && invalid ? `${id}-error` : undefined}
          className="font-mono text-xs uppercase"
        />
        <span
          className="text-[9px] font-medium text-muted-foreground"
          aria-hidden="true"
        >
          {l("HEX", "HEX")}
        </span>
      </div>
      {touched && invalid && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-[11px] text-destructive-foreground"
        >
          {l(
            "Use a hex color, such as #8B5CF6.",
            "Usa un color hexadecimal, como #8B5CF6.",
          )}
        </p>
      )}
      {shades && (
        <div className="mt-2">
          <div className="flex gap-0.5">
            {shadeScale(value).map((shade) => (
              <button
                key={shade.step}
                type="button"
                aria-label={l(
                  `Copy shade ${shade.step}: ${shade.color}`,
                  `Copiar tono ${shade.step}: ${shade.color}`,
                )}
                title={`${shade.step} · ${shade.color}`}
                style={{ backgroundColor: shade.color }}
                className="h-7 min-w-0 flex-1 rounded-[3px] ring-inset hover:ring-2 hover:ring-foreground"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shade.color);
                    toast.success(l("Shade copied", "Tono copiado"));
                  } catch {
                    toast.error(
                      l(
                        "Couldn't copy. Select the hex value instead.",
                        "No se pudo copiar. Selecciona el valor hexadecimal.",
                      ),
                    );
                  }
                }}
              />
            ))}
          </div>
          <p
            className="mt-1 flex justify-between font-mono text-[8px] text-muted-foreground"
            aria-hidden="true"
          >
            <span>50</span>
            <span>500</span>
            <span>950</span>
          </p>
        </div>
      )}
    </div>
  );
}

function ControlGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[.12em]">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function materialLabel(material: Material, l: Translate) {
  return {
    flat: l("Flat", "Plano"),
    elevated: l("Elevated", "Elevado"),
    glass: l("Glass", "Cristal"),
    gradient: l("Gradient", "Degradado"),
  }[material];
}

function gradientLabel(
  kind: AppearanceConfig["gradient"]["kind"],
  l: Translate,
) {
  return {
    linear: l("Linear", "Lineal"),
    radial: l("Radial", "Radial"),
    mesh: l("Mesh", "Malla"),
  }[kind];
}

function shaderLabel(kind: AppearanceConfig["shader"]["kind"], l: Translate) {
  return {
    none: l("None", "Ninguno"),
    aurora: l("Aurora", "Aurora"),
    waves: l("Waves", "Ondas"),
    iridescent: l("Iridescent", "Iridiscente"),
  }[kind];
}

function controlAppearance(material: Material): "solid" | "glass" | "gradient" {
  return material === "glass" || material === "gradient" ? material : "solid";
}

function cssExport(config: AppearanceConfig) {
  return appearanceToCSS(config);
}

function importErrorMessage(error: unknown, l: Translate) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (/too large/.test(message)) {
    return l(
      "Choose an appearance JSON file smaller than 32 KB.",
      "Elige un archivo JSON de apariencia de menos de 32 KB.",
    );
  }
  if (
    error instanceof SyntaxError ||
    /json|unexpected|unterminated/.test(message)
  ) {
    return l(
      "This JSON couldn't be read. Check its commas, quotes, and brackets.",
      "No se pudo leer el JSON. Revisa sus comas, comillas y llaves.",
    );
  }
  if (/version/.test(message)) {
    return l(
      "This appearance version isn't supported. Choose a version 1 appearance export.",
      "Esta versión de apariencia no es compatible. Elige una exportación de apariencia de versión 1.",
    );
  }
  if (/color|hex/.test(message)) {
    return l(
      "Check the colors. Each one needs a six-digit hex value, such as #8B5CF6.",
      "Revisa los colores. Cada uno debe tener un valor hexadecimal de seis dígitos, como #8B5CF6.",
    );
  }
  if (/gradient|stop/.test(message)) {
    return l(
      "Check the gradient: 2–4 color stops, positions from 0–100, and intensity from 0–1.",
      "Revisa el degradado: 2–4 paradas, posiciones de 0–100 e intensidad de 0–1.",
    );
  }
  if (/radius/.test(message)) {
    return l(
      "Corner radius must be a number from 0–24.",
      "El radio de las esquinas debe ser un número de 0–24.",
    );
  }
  if (/shadow|border/.test(message)) {
    return l(
      "Shadow and border intensity must be numbers from 0–1.",
      "La intensidad de la sombra y del borde debe estar entre 0–1.",
    );
  }
  if (/shader/.test(message)) {
    return l(
      "The shader settings aren't valid. Start with an export from the studio.",
      "Los ajustes del shader no son válidos. Usa una exportación del estudio.",
    );
  }
  if (/number/.test(message)) {
    return l(
      "A number is outside its range. Use 0–1 for intensity, speed, and stop positions; 0–24 for radius; 0–360 for angle; and 0.25–4 for scale.",
      "Un número está fuera de rango. Usa 0–1 para intensidad, velocidad y posiciones; 0–24 para radio; 0–360 para ángulo y 0,25–4 para escala.",
    );
  }
  return l(
    "These settings are incomplete or invalid. Import a complete appearance JSON exported from the studio.",
    "Los ajustes están incompletos o no son válidos. Importa un JSON de apariencia completo exportado desde el estudio.",
  );
}

function exampleSource(config: AppearanceConfig, l: Translate) {
  const text = (en: string, es: string) => `{${JSON.stringify(l(en, es))}}`;
  return `"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Chart } from "@/components/ui/chart";
import { GradientBackground, ShaderBackground } from "@/components/effects";

export default function Example() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const data = [
    { label: ${JSON.stringify(l("Mon", "Lun"))}, value: 32 },
    { label: ${JSON.stringify(l("Tue", "Mar"))}, value: 45 },
    { label: ${JSON.stringify(l("Wed", "Mié"))}, value: 41 },
    { label: ${JSON.stringify(l("Thu", "Jue"))}, value: 68 },
    { label: ${JSON.stringify(l("Fri", "Vie"))}, value: 86 },
  ];

  return (
    <main className="mx-auto grid max-w-3xl gap-5 p-6">
      <GradientBackground
        kind=${JSON.stringify(config.gradient.kind)}
        colors={${JSON.stringify(config.gradient.stops.map((stop) => stop.color))}}
        angle={${config.gradient.angle}}
        intensity={${config.gradient.intensity}}
        className="relative overflow-hidden rounded-2xl border border-border p-8 [&>.afx-background-field]:[background-image:var(--af-gradient-color)]!"
      >
        ${
          config.shader.kind === "none"
            ? ""
            : `<ShaderBackground
          kind=${JSON.stringify(config.shader.kind)}
          colors={${JSON.stringify(Object.values(config.colors))}}
          speed={${config.shader.speed}}
          scale={${config.shader.scale}}
          intensity={${config.shader.intensity}}
          paused={${config.shader.paused || config.motion === "off"}}
          className="pointer-events-none absolute inset-0 min-h-0 bg-transparent [&>.afx-background-field]:hidden [&>.afx-background-scrim]:hidden"
        />`
        }
        <div className="relative z-10 grid justify-items-start gap-4">
          <Badge variant="outline" className="border-white/25 bg-white/5 text-white">${text("Ready for launch", "Listo para lanzar")}</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">${text("Your next big thing.", "Tu próxima gran idea.")}</h1>
          <p className="text-sm text-white/75">${text("A clear vision. A signature look.", "Una visión clara. Un estilo propio.")}</p>
          <Button appearance=${JSON.stringify(controlAppearance(config.material))}>${text("Explore the possibilities", "Explora las posibilidades")}</Button>
        </div>
      </GradientBackground>

      <Card appearance=${JSON.stringify(config.material)}>
        <CardHeader><CardTitle>${text("Growth at a glance", "Tu crecimiento de un vistazo")}</CardTitle></CardHeader>
        <CardContent>
          <Chart data={data} label=${JSON.stringify(l("Weekly growth", "Crecimiento semanal"))} valueLabel=${JSON.stringify(l("Growth", "Crecimiento"))} height={180} />
          <form
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}
          >
            <label className="grid gap-2 text-xs font-medium">
              ${text("Email address", "Correo electrónico")}
              <Input type="email" required value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); }} placeholder=${JSON.stringify(l("you@example.com", "tu@ejemplo.com"))} />
            </label>
            <Button type="submit" className="self-end">${text("Try the preview", "Probar la vista previa")}</Button>
            {submitted && <p role="status" className="text-xs text-primary sm:col-span-2">${text("Preview submitted.", "Vista previa enviada.")}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
`;
}

function InteractiveSample({
  appearance,
  children,
}: {
  appearance: AppearanceConfig;
  children: ReactNode;
}) {
  if (appearance.hover === "spotlight")
    return <SpotlightCard className="h-full">{children}</SpotlightCard>;
  if (appearance.hover === "glow")
    return <GlowBorder className="h-full">{children}</GlowBorder>;
  if (appearance.hover === "tilt")
    return <TiltCard className="h-full">{children}</TiltCard>;
  return <div className="h-full">{children}</div>;
}

function StudioPreview({
  appearance,
  section,
  onToggleShader,
}: {
  appearance: AppearanceConfig;
  section: PreviewSection;
  onToggleShader: () => void;
}) {
  const { l, number } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const colors = Object.values(appearance.colors);
  const background =
    appearance.shader.kind === "none" ? null : (
      <ShaderBackground
        {...appearance.shader}
        colors={colors}
        paused={appearance.shader.paused || appearance.motion === "off"}
        className="pointer-events-none absolute inset-0 min-h-0 bg-transparent [&>.afx-background-field]:hidden [&>.afx-background-scrim]:hidden"
      />
    );
  const gradientColors = appearance.gradient.stops.map((stop) => stop.color);

  if (section === "background") {
    return (
      <div className="grid gap-4">
        <GradientBackground
          kind={appearance.gradient.kind}
          colors={gradientColors}
          angle={appearance.gradient.angle}
          intensity={appearance.gradient.intensity}
          className="relative grid min-h-96 place-items-center overflow-hidden rounded-2xl border border-border p-6 sm:min-h-[460px] [&>.afx-background-field]:[background-image:var(--af-gradient-color)]!"
        >
          {background}
          <div className="relative z-10 grid max-w-md justify-items-center gap-5 text-center">
            <Badge
              variant="outline"
              className="border-white/25 bg-white/5 text-white"
            >
              {l("Room for a little wonder", "Espacio para asombrarte")}
            </Badge>
            <h2
              className={cn(
                "text-4xl leading-tight font-semibold tracking-[-.06em] sm:text-5xl",
                appearance.typography === "editorial" && "editorial",
              )}
            >
              {l("A little atmosphere.", "Un poco de atmósfera.")}
            </h2>
            <p className="max-w-xs text-sm leading-7 text-white/75">
              {l(
                "Color, light, and movement. In perfect balance.",
                "Color, luz y movimiento. En perfecto equilibrio.",
              )}
            </p>
            <div className="flex items-center gap-2" aria-hidden="true">
              {colors.map((color, index) => (
                <span
                  key={index}
                  className="size-4 rounded-full border border-foreground/10"
                  style={{ background: color }}
                />
              ))}
            </div>
            {appearance.shader.kind !== "none" && (
              <Button
                variant="outline"
                disabled={appearance.motion === "off"}
                onClick={onToggleShader}
              >
                {appearance.shader.paused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
                {appearance.shader.paused
                  ? l("Resume shader", "Reanudar shader")
                  : l("Pause shader", "Pausar shader")}
              </Button>
            )}
          </div>
        </GradientBackground>
        <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            {gradientLabel(appearance.gradient.kind, l)} ·{" "}
            {number(appearance.gradient.angle)}°
          </span>
          <span>
            {shaderLabel(appearance.shader.kind, l)} · {l("Shader", "Shader")}
          </span>
        </div>
      </div>
    );
  }

  if (section === "components") {
    const interactionAction = (
      <Button
        appearance={controlAppearance(appearance.material)}
        onClick={() =>
          toast.success(
            l(
              "A little detail makes a difference.",
              "Un pequeño detalle marca la diferencia.",
            ),
          )
        }
      >
        {l("Try me", "Pruébame")}
        <ArrowUpRight aria-hidden="true" />
      </Button>
    );
    return (
      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {(["flat", "elevated", "glass", "gradient"] as const).map(
            (material) => (
              <Card key={material} appearance={material} className="p-4">
                <div className="mb-5 flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-accent p-2 text-primary">
                    <Layers3 className="size-4" aria-hidden="true" />
                  </span>
                  <Badge variant="outline">{materialLabel(material, l)}</Badge>
                </div>
                <h3 className="text-sm font-semibold">
                  {l("Made for your product", "Hecho para tu producto")}
                </h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {l(
                    "A surface with its own point of view.",
                    "Una superficie con su propio carácter.",
                  )}
                </p>
              </Card>
            ),
          )}
        </div>
        <Card appearance={appearance.material} className="grid gap-5 p-5">
          <div>
            <h3 className="mb-3 text-xs font-semibold">
              {l("Every kind of action", "Una acción para cada momento")}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button appearance="solid" size="sm">
                {l("Solid", "Sólido")}
              </Button>
              <Button appearance="soft" size="sm">
                {l("Soft", "Suave")}
              </Button>
              <Button appearance="outline" variant="outline" size="sm">
                {l("Outline", "Contorno")}
              </Button>
              <Button appearance="glass" size="sm">
                {l("Glass", "Cristal")}
              </Button>
              <Button appearance="gradient" size="sm">
                {l("Gradient", "Degradado")}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{l("Active", "Activo")}</Badge>
            <Badge variant="neutral">{l("Draft", "Borrador")}</Badge>
            <Badge variant="outline">{l("New", "Nuevo")}</Badge>
          </div>
          <Field
            label={l("A place for your ideas", "Un espacio para tus ideas")}
          >
            <Input
              placeholder={l(
                "Give your next project a name…",
                "Dale un nombre a tu próximo proyecto…",
              )}
            />
          </Field>
        </Card>
        <InteractiveSample appearance={appearance}>
          <Card
            appearance={appearance.material}
            className={cn(
              "flex flex-wrap items-center justify-between gap-4 p-5",
              appearance.hover === "lift" && "af-hover-card",
            )}
            tabIndex={0}
          >
            <div>
              <h3 className="text-sm font-semibold">
                {l("Feel the interaction", "Siente la interacción")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {l(
                  "Hover or focus to explore your effect.",
                  "Pasa el cursor o usa el foco para explorar el efecto.",
                )}
              </p>
            </div>
            {appearance.hover === "magnetic" ? (
              <MagneticButton asChild>{interactionAction}</MagneticButton>
            ) : (
              interactionAction
            )}
          </Card>
        </InteractiveSample>
      </div>
    );
  }

  const data = [
    { label: l("Mon", "Lun"), value: 32, secondary: 24 },
    { label: l("Tue", "Mar"), value: 45, secondary: 31 },
    { label: l("Wed", "Mié"), value: 41, secondary: 37 },
    { label: l("Thu", "Jue"), value: 68, secondary: 40 },
    { label: l("Fri", "Vie"), value: 61, secondary: 51 },
    { label: l("Sat", "Sáb"), value: 82, secondary: 58 },
    { label: l("Sun", "Dom"), value: 96, secondary: 67 },
  ];
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            {l("Your workspace", "Tu espacio de trabajo")}
          </span>
        </div>
        <Badge variant="neutral">{l("Preview", "Vista previa")}</Badge>
      </div>
      <GradientBackground
        kind={appearance.gradient.kind}
        colors={gradientColors}
        angle={appearance.gradient.angle}
        intensity={appearance.gradient.intensity}
        className="relative overflow-hidden rounded-2xl border border-border p-5 sm:p-7 [&>.afx-background-field]:[background-image:var(--af-gradient-color)]!"
      >
        {background}
        <div className="relative z-10 grid justify-items-start gap-4">
          <Badge
            variant="outline"
            className="border-white/25 bg-white/5 text-white"
          >
            <span className="size-1.5 rounded-full bg-white/80" />
            {l("Ready for launch", "Listo para lanzar")}
          </Badge>
          <h2
            className={cn(
              "max-w-sm text-3xl leading-tight font-semibold tracking-[-.045em] sm:text-4xl",
              appearance.typography === "editorial" && "editorial",
            )}
          >
            {l("Your next big thing.", "Tu próxima gran idea.")}
          </h2>
          <p className="max-w-sm text-xs leading-6 text-white/75">
            {l(
              "A clear vision. A signature look. Everything you need to make your next move.",
              "Una visión clara. Un estilo propio. Todo para dar tu próximo paso.",
            )}
          </p>
          <Button
            appearance={controlAppearance(appearance.material)}
            onClick={() =>
              document.getElementById("appearance-preview-email")?.focus()
            }
          >
            {l("Explore the possibilities", "Explora las posibilidades")}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </GradientBackground>
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          label={l("Active projects", "Proyectos activos")}
          value={number(24)}
          change="+12.8%"
          note={l("this month", "este mes")}
          series={[3, 7, 5, 9, 8, 12, 15]}
        />
        <MetricCard
          label={l("Creative momentum", "Impulso creativo")}
          value="98%"
          change="+8.2%"
          note={l("and growing", "y creciendo")}
          series={[6, 5, 8, 7, 12, 11, 16]}
        />
      </div>
      <InteractiveSample appearance={appearance}>
        <Card
          appearance={appearance.material}
          className={cn(appearance.hover === "lift" && "af-hover-card")}
          tabIndex={appearance.hover === "lift" ? 0 : undefined}
        >
          <CardHeader className="flex-row items-center justify-between gap-3 px-5 pb-2 pt-5">
            <div>
              <CardTitle>
                {l("Growth at a glance", "Tu crecimiento de un vistazo")}
              </CardTitle>
              <CardDescription className="mt-1">
                {l(
                  "A good week for a great idea.",
                  "Una buena semana para una gran idea.",
                )}
              </CardDescription>
            </div>
            <Badge variant="outline">{l("7 days", "7 días")}</Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <Chart
              data={data}
              label={l(
                "Weekly growth comparison",
                "Comparación del crecimiento semanal",
              )}
              valueLabel={l("This week", "Esta semana")}
              secondaryLabel={l("Last week", "Semana anterior")}
              height={170}
            />
          </CardContent>
        </Card>
      </InteractiveSample>
      <Card appearance={appearance.material} className="p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
          className="grid items-end gap-3 sm:grid-cols-[1fr_auto]"
        >
          <Field
            htmlFor="appearance-preview-email"
            label={l(
              "Try your next interaction",
              "Prueba tu próxima interacción",
            )}
          >
            <Input
              id="appearance-preview-email"
              type="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSubmitted(false);
              }}
              placeholder={l("you@example.com", "tu@ejemplo.com")}
            />
          </Field>
          <Button
            type="submit"
            appearance={controlAppearance(appearance.material)}
          >
            {l("Try the preview", "Probar vista previa")}
            <ArrowUpRight aria-hidden="true" />
          </Button>
          {submitted && (
            <p role="status" className="text-xs text-primary sm:col-span-2">
              {l(
                "Preview submitted. Looking good.",
                "Vista previa enviada. Se ve bien.",
              )}
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}

export function AppearanceStudioTemplate() {
  const { l, locale, number } = useLanguage();
  const {
    appearance,
    setAppearance,
    resetAppearance,
    presets,
    savePreset,
    deletePreset,
    applyPreset,
    importAppearance,
  } = useAppearance();
  const [editorSection, setEditorSection] = useState<EditorSection>("colors");
  const [mobilePane, setMobilePane] = useState<
    "preview" | "editor" | "library"
  >("preview");
  const [previewSection, setPreviewSection] =
    useState<PreviewSection>("product");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [presetName, setPresetName] = useState("");
  const [presetError, setPresetError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importReady, setImportReady] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [duplicate, setDuplicate] = useState<{
    token: number;
    name: string;
    source: string;
  } | null>(null);
  const duplicateToken = useRef(0);
  const completedDuplicate = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const presetInput = useRef<HTMLInputElement>(null);
  const importId = useId();
  const { copied, copy } = useCopy();
  const [copiedFormat, setCopiedFormat] = useState<ExportFormat | null>(null);
  const serialized = useMemo(
    () => serializeAppearance(appearance),
    [appearance],
  );
  const exportText = useMemo(() => {
    if (exportFormat === "json") return serialized;
    if (exportFormat === "css") return cssExport(appearance);
    return exportConfiguredExample(exampleSource(appearance, l), appearance);
  }, [appearance, exportFormat, l, serialized]);
  const customized = palettePresets
    .find((preset) => preset.id === appearance.palette)
    ?.colors.some(
      (color, index) =>
        color.toLowerCase() !==
        Object.values(appearance.colors)[index].toLowerCase(),
    );

  useEffect(() => {
    if (
      !duplicate ||
      completedDuplicate.current === duplicate.token ||
      serialized !== duplicate.source
    )
      return;
    completedDuplicate.current = duplicate.token;
    try {
      savePreset(duplicate.name);
      toast.success(l("Preset duplicated", "Ajuste duplicado"));
    } catch {
      toast.error(
        l(
          "Couldn't duplicate this preset. Try saving it with a new name.",
          "No se pudo duplicar el ajuste. Intenta guardarlo con otro nombre.",
        ),
      );
    }
    setDuplicate(null);
  }, [duplicate, l, savePreset, serialized]);

  const setValue = <K extends keyof AppearanceConfig>(
    key: K,
    value: AppearanceConfig[K],
  ) => {
    setAppearance((current) => ({ ...current, [key]: value }));
  };
  const setGradient = <K extends keyof AppearanceConfig["gradient"]>(
    key: K,
    value: AppearanceConfig["gradient"][K],
  ) => {
    setAppearance((current) => ({
      ...current,
      gradient: { ...current.gradient, [key]: value },
    }));
  };
  const setShader = <K extends keyof AppearanceConfig["shader"]>(
    key: K,
    value: AppearanceConfig["shader"][K],
  ) => {
    setAppearance((current) => ({
      ...current,
      shader: { ...current.shader, [key]: value },
    }));
  };
  const setStop = (
    index: number,
    patch: Partial<AppearanceConfig["gradient"]["stops"][number]>,
  ) => {
    setAppearance((current) => ({
      ...current,
      gradient: {
        ...current.gradient,
        stops: current.gradient.stops.map((stop, i) =>
          i === index ? { ...stop, ...patch } : stop,
        ),
      },
    }));
  };
  const addStop = () => {
    setAppearance((current) => {
      if (current.gradient.stops.length >= 4) return current;
      const stops = [...current.gradient.stops];
      let widest = 0;
      for (let i = 1; i < stops.length - 1; i++) {
        if (
          stops[i + 1].position - stops[i].position >
          stops[widest + 1].position - stops[widest].position
        )
          widest = i;
      }
      stops.splice(widest + 1, 0, {
        color: current.colors.tertiary,
        position: (stops[widest].position + stops[widest + 1].position) / 2,
      });
      return { ...current, gradient: { ...current.gradient, stops } };
    });
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!presetName.trim()) {
      setPresetError(
        l("Give your preset a name.", "Dale un nombre a tu ajuste."),
      );
      presetInput.current?.focus();
      return;
    }
    try {
      savePreset(presetName.trim());
      setPresetName("");
      setPresetError("");
      toast.success(l("Your look is saved", "Tu estilo está guardado"));
    } catch {
      setPresetError(
        l(
          "Couldn't save this preset. Try a different name.",
          "No se pudo guardar el ajuste. Prueba otro nombre.",
        ),
      );
    }
  };
  const duplicatePreset = (preset: (typeof presets)[number]) => {
    const base = `${preset.name.slice(0, 36)} ${l("copy", "copia")}`;
    let name = base;
    let n = 2;
    while (presets.some((item) => item.name === name)) name = `${base} ${n++}`;
    setDuplicate({
      token: ++duplicateToken.current,
      name,
      source: serializeAppearance(preset.config),
    });
    applyPreset(preset.id);
  };
  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError("");
    setImportReady(false);
    if (file.size > 32 * 1024) {
      setImportError(
        l(
          "Choose an appearance JSON file smaller than 32 KB.",
          "Elige un archivo JSON de apariencia de menos de 32 KB.",
        ),
      );
      return;
    }
    setReadingFile(true);
    try {
      const text = await file.text();
      setImportText(text);
      parseAppearance(text);
      setImportReady(true);
    } catch (error) {
      setImportError(importErrorMessage(error, l));
    } finally {
      setReadingFile(false);
    }
  };
  const importSettings = (event: FormEvent) => {
    event.preventDefault();
    try {
      const config = parseAppearance(importText);
      importAppearance(serializeAppearance(config));
      setImportOpen(false);
      setImportText("");
      setImportError("");
      setImportReady(false);
      toast.success(l("Appearance imported", "Apariencia importada"));
    } catch (error) {
      setImportReady(false);
      setImportError(importErrorMessage(error, l));
    }
  };
  const copyExport = async () => {
    try {
      await copy(exportText);
      setCopiedFormat(exportFormat);
    } catch {
      toast.error(
        l(
          "Couldn't copy. Download the file or select the code.",
          "No se pudo copiar. Descarga el archivo o selecciona el código.",
        ),
      );
    }
  };
  const downloadExport = () => {
    const file = {
      json: ["aureform-appearance.json", "application/json"],
      css: ["aureform-appearance.css", "text/css"],
      react: ["aureform-example.tsx", "text/plain"],
    }[exportFormat];
    downloadText(file[0], exportText, file[1]);
    toast.success(l("Download ready", "Descarga lista"));
  };
  const gradientTrack = `linear-gradient(90deg, ${appearance.gradient.stops.map((stop) => `${stop.color} ${stop.position * 100}%`).join(", ")})`;

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        eyebrow={l(
          "Aureform UI · Appearance Studio",
          "Aureform UI · Estudio de Apariencia",
        )}
        title={l("Build your signature.", "Diseña tu identidad.")}
        description={l(
          "Shape the color, depth, and energy of your interface. See every detail come to life.",
          "Define el color, la profundidad y la energía de tu interfaz. Ve cómo cobra vida cada detalle.",
        )}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload aria-hidden="true" />
              {l("Import", "Importar")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetAppearance();
                toast.success(l("Appearance reset", "Apariencia restablecida"));
              }}
            >
              <RotateCcw aria-hidden="true" />
              {l("Reset", "Restablecer")}
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-primary opacity-30" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span className="font-medium">
            {l("Live appearance", "Apariencia en vivo")}
          </span>
          <span className="hidden text-muted-foreground sm:inline">
            {l(
              "Your changes follow you across the kit.",
              "Tus cambios te acompañan en todo el kit.",
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {paletteDisplayName(appearance.palette, l)}
          </Badge>
          {customized && (
            <Badge variant="neutral">
              {l("Custom colors", "Colores propios")}
            </Badge>
          )}
        </div>
      </div>

      <div
        className="sticky top-20 z-10 grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface/95 p-1.5 shadow-lg backdrop-blur-xl xl:hidden"
        aria-label={l("Studio sections", "Secciones del estudio")}
      >
        {(
          [
            ["preview", l("Live preview", "Vista en vivo")],
            ["editor", l("Editor", "Editor")],
            ["library", l("Save & export", "Guardar y exportar")],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mobilePane === value}
            onClick={() => setMobilePane(value)}
            className={cn(
              "min-h-11 rounded-lg px-1 text-[11px] font-semibold",
              mobilePane === value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(290px,340px)_minmax(0,1fr)]">
        <Card
          className={cn(
            "min-w-0 overflow-hidden xl:sticky xl:top-24",
            mobilePane !== "editor" && "hidden xl:block",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal
                className="size-4 text-primary"
                aria-hidden="true"
              />
              {l("The details", "Los detalles")}
            </h2>
            <span className="text-[10px] text-muted-foreground">
              {l("Your look, live", "Tu estilo, en vivo")}
            </span>
          </div>
          <div
            className="grid grid-cols-3 gap-1 border-b border-border bg-surface-subtle/40 p-2"
            aria-label={l("Editor sections", "Secciones del editor")}
          >
            {(
              [
                {
                  value: "colors",
                  label: l("Colors", "Colores"),
                  icon: <Paintbrush2 className="size-3.5" aria-hidden="true" />,
                },
                {
                  value: "surfaces",
                  label: l("Surfaces", "Superficies"),
                  icon: <Layers3 className="size-3.5" aria-hidden="true" />,
                },
                {
                  value: "motion",
                  label: l("Motion", "Movimiento"),
                  icon: <Waves className="size-3.5" aria-hidden="true" />,
                },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={editorSection === item.value}
                onClick={() => setEditorSection(item.value)}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-1 text-[11px] font-medium",
                  editorSection === item.value
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid gap-5 p-5 xl:max-h-[calc(100dvh-15rem)] xl:overflow-y-auto">
            {editorSection === "colors" && (
              <>
                <Choices
                  label={l("Theme", "Tema")}
                  value={appearance.theme}
                  columns={2}
                  onChange={(theme) => setValue("theme", theme)}
                  options={[
                    {
                      value: "dark",
                      label: l("Dark", "Oscuro"),
                      icon: <Moon className="size-3.5" aria-hidden="true" />,
                    },
                    {
                      value: "light",
                      label: l("Light", "Claro"),
                      icon: <Sun className="size-3.5" aria-hidden="true" />,
                    },
                  ]}
                />
                <PalettePicker />
                <ControlGroup
                  title={l("Your colors", "Tus colores")}
                  description={l(
                    "Pick a color or enter a hex value. Tap any shade to copy it.",
                    "Elige un color o escribe un valor hexadecimal. Toca un tono para copiarlo.",
                  )}
                >
                  {(
                    [
                      ["primary", l("Primary", "Principal")],
                      ["secondary", l("Secondary", "Secundario")],
                      ["tertiary", l("Tertiary", "Terciario")],
                    ] as const
                  ).map(([key, label]) => (
                    <ColorControl
                      key={key}
                      label={label}
                      value={appearance.colors[key]}
                      shades
                      onChange={(color) =>
                        setAppearance((current) => ({
                          ...current,
                          colors: { ...current.colors, [key]: color },
                        }))
                      }
                    />
                  ))}
                </ControlGroup>
                <ControlGroup
                  title={l("Gradient composition", "Composición del degradado")}
                >
                  <Choices
                    label={l("Gradient type", "Tipo de degradado")}
                    value={appearance.gradient.kind}
                    onChange={(kind) => setGradient("kind", kind)}
                    options={(["linear", "radial", "mesh"] as const).map(
                      (kind) => ({
                        value: kind,
                        label: gradientLabel(kind, l),
                      }),
                    )}
                  />
                  <div
                    className="relative h-9 overflow-hidden rounded-lg border border-foreground/10"
                    style={{ background: gradientTrack }}
                    role="img"
                    aria-label={l(
                      "Gradient color stops preview",
                      "Vista previa de las paradas del degradado",
                    )}
                  >
                    {appearance.gradient.stops.map((stop, index) => (
                      <span
                        key={index}
                        className="absolute inset-y-2 w-1 rounded-full border border-white/80 bg-black/40"
                        style={{
                          left: `clamp(2px, ${stop.position * 100}%, calc(100% - 6px))`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="grid gap-3">
                    {appearance.gradient.stops.map((stop, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-border bg-surface-subtle/30 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {l(`Stop ${index + 1}`, `Parada ${index + 1}`)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={appearance.gradient.stops.length <= 2}
                            aria-label={l(
                              `Remove stop ${index + 1}`,
                              `Eliminar parada ${index + 1}`,
                            )}
                            onClick={() =>
                              setAppearance((current) => ({
                                ...current,
                                gradient: {
                                  ...current.gradient,
                                  stops: current.gradient.stops.filter(
                                    (_, i) => i !== index,
                                  ),
                                },
                              }))
                            }
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                        <ColorControl
                          label={l(
                            `Stop ${index + 1} color`,
                            `Color de parada ${index + 1}`,
                          )}
                          value={stop.color}
                          onChange={(color) => setStop(index, { color })}
                        />
                        <div className="mt-3">
                          <RangeControl
                            label={l(
                              `Stop ${index + 1} position`,
                              `Posición de parada ${index + 1}`,
                            )}
                            value={stop.position}
                            min={
                              index === 0
                                ? 0
                                : appearance.gradient.stops[index - 1].position
                            }
                            max={
                              index === appearance.gradient.stops.length - 1
                                ? 1
                                : appearance.gradient.stops[index + 1].position
                            }
                            step={0.01}
                            display={`${number(Math.round(stop.position * 100))}%`}
                            onChange={(position) =>
                              setStop(index, { position })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={appearance.gradient.stops.length >= 4}
                    onClick={addStop}
                  >
                    <Plus aria-hidden="true" />
                    {l("Add color stop", "Añadir parada de color")}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {appearance.gradient.stops.length}/4
                    </span>
                  </Button>
                  <RangeControl
                    label={l("Angle", "Ángulo")}
                    value={appearance.gradient.angle}
                    min={0}
                    max={360}
                    step={1}
                    display={`${number(appearance.gradient.angle)}°`}
                    onChange={(angle) => setGradient("angle", angle)}
                  />
                  <RangeControl
                    label={l("Gradient intensity", "Intensidad del degradado")}
                    value={appearance.gradient.intensity}
                    onChange={(intensity) =>
                      setGradient("intensity", intensity)
                    }
                  />
                </ControlGroup>
              </>
            )}
            {editorSection === "surfaces" && (
              <>
                <ControlGroup
                  title={l("Material & depth", "Material y profundidad")}
                  description={l(
                    "Give your surfaces a quiet finish or a little dimension.",
                    "Dale a tus superficies un acabado sereno o un poco de dimensión.",
                  )}
                >
                  <Choices
                    label={l("Surface material", "Material de superficie")}
                    value={appearance.material}
                    columns={2}
                    onChange={(material) => setValue("material", material)}
                    options={(
                      ["flat", "elevated", "glass", "gradient"] as const
                    ).map((material) => ({
                      value: material,
                      label: materialLabel(material, l),
                    }))}
                  />
                  <RangeControl
                    label={l("Shadow", "Sombra")}
                    value={appearance.shadow}
                    onChange={(shadow) => setValue("shadow", shadow)}
                  />
                  <RangeControl
                    label={l("Border", "Borde")}
                    value={appearance.border}
                    onChange={(border) => setValue("border", border)}
                  />
                  <RangeControl
                    label={l("Corner radius", "Radio de las esquinas")}
                    value={appearance.radius}
                    min={0}
                    max={24}
                    step={1}
                    display={`${number(appearance.radius)} px`}
                    onChange={(radius) => setValue("radius", radius)}
                  />
                  <div className="flex items-center justify-center rounded-xl border border-border bg-surface-subtle/40 p-5">
                    <Card
                      appearance={appearance.material}
                      className="flex min-h-20 w-full items-center justify-center gap-2 p-4"
                    >
                      <Layers3
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium">
                        {materialLabel(appearance.material, l)}
                      </span>
                    </Card>
                  </div>
                </ControlGroup>
                <ControlGroup
                  title={l("Spacing & type", "Espaciado y tipografía")}
                >
                  <Choices
                    label={l("Density", "Densidad")}
                    value={appearance.density}
                    columns={2}
                    onChange={(density) => setValue("density", density)}
                    options={[
                      {
                        value: "comfortable",
                        label: l("Comfortable", "Cómoda"),
                      },
                      { value: "compact", label: l("Compact", "Compacta") },
                    ]}
                  />
                  <Choices
                    label={l("Typography", "Tipografía")}
                    value={appearance.typography}
                    columns={2}
                    onChange={(typography) =>
                      setValue("typography", typography)
                    }
                    options={[
                      { value: "modern", label: l("Modern", "Moderna") },
                      {
                        value: "editorial",
                        label: l("Editorial", "Editorial"),
                      },
                    ]}
                  />
                  <p
                    className={cn(
                      "rounded-xl border border-border bg-surface-subtle/30 px-4 py-5 text-2xl tracking-tight",
                      appearance.typography === "editorial"
                        ? "editorial"
                        : "font-semibold",
                    )}
                  >
                    {l("Make a lasting impression.", "Deja una huella.")}
                  </p>
                </ControlGroup>
              </>
            )}
            {editorSection === "motion" && (
              <>
                <ControlGroup
                  title={l("Interaction", "Interacción")}
                  description={l(
                    "A considered response to every gesture.",
                    "Una respuesta cuidada para cada gesto.",
                  )}
                >
                  <Choices
                    label={l("Motion", "Movimiento")}
                    value={appearance.motion}
                    onChange={(motion) => setValue("motion", motion)}
                    options={[
                      { value: "off", label: l("Off", "Ninguno") },
                      { value: "gentle", label: l("Gentle", "Suave") },
                      {
                        value: "expressive",
                        label: l("Expressive", "Expresivo"),
                      },
                    ]}
                  />
                  <Choices
                    label={l("Hover effect", "Efecto al pasar el cursor")}
                    value={appearance.hover}
                    onChange={(hover) => setValue("hover", hover)}
                    options={[
                      { value: "none", label: l("None", "Ninguno") },
                      { value: "lift", label: l("Lift", "Elevación") },
                      { value: "glow", label: l("Glow", "Brillo") },
                      { value: "spotlight", label: l("Spotlight", "Foco") },
                      { value: "tilt", label: l("Tilt", "Inclinación") },
                      { value: "magnetic", label: l("Magnetic", "Magnético") },
                    ]}
                  />
                </ControlGroup>
                <ControlGroup
                  title={l("Shader atmosphere", "Atmósfera con shaders")}
                  description={l(
                    "An optional layer of animated light and color.",
                    "Una capa opcional de luz y color en movimiento.",
                  )}
                >
                  <Choices
                    label={l("Shader", "Shader")}
                    value={appearance.shader.kind}
                    columns={2}
                    onChange={(kind) => setShader("kind", kind)}
                    options={(
                      ["none", "aurora", "waves", "iridescent"] as const
                    ).map((kind) => ({
                      value: kind,
                      label: shaderLabel(kind, l),
                    }))}
                  />
                  <RangeControl
                    label={l("Speed", "Velocidad")}
                    value={appearance.shader.speed}
                    disabled={appearance.shader.kind === "none"}
                    onChange={(speed) => setShader("speed", speed)}
                  />
                  <RangeControl
                    label={l("Scale", "Escala")}
                    value={appearance.shader.scale}
                    min={0.25}
                    max={4}
                    step={0.05}
                    display={`${number(appearance.shader.scale, { maximumFractionDigits: 2 })}×`}
                    disabled={appearance.shader.kind === "none"}
                    onChange={(scale) => setShader("scale", scale)}
                  />
                  <RangeControl
                    label={l("Shader intensity", "Intensidad del shader")}
                    value={appearance.shader.intensity}
                    disabled={appearance.shader.kind === "none"}
                    onChange={(intensity) => setShader("intensity", intensity)}
                  />
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-3">
                    <label
                      htmlFor="studio-pause-shader"
                      className="text-xs font-medium"
                    >
                      {l("Pause shader", "Pausar shader")}
                    </label>
                    <Switch
                      id="studio-pause-shader"
                      checked={appearance.shader.paused}
                      disabled={appearance.shader.kind === "none"}
                      onCheckedChange={(paused) => setShader("paused", paused)}
                    />
                  </div>
                  {appearance.motion === "off" && (
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      {l(
                        "Motion is off. Your shader stays still.",
                        "El movimiento está desactivado. El shader permanece quieto.",
                      )}
                    </p>
                  )}
                </ControlGroup>
                <Link
                  href={`/${locale}/effects/`}
                  className="flex min-h-10 items-center justify-between gap-3 rounded-lg bg-accent px-3 text-xs font-medium text-accent-foreground"
                >
                  {l(
                    "Explore the effect recipes",
                    "Explora las recetas de efectos",
                  )}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </Card>

        <div
          className={cn(
            "grid min-w-0 gap-5",
            mobilePane === "editor" && "hidden xl:grid",
          )}
        >
          <section
            className={cn(
              "min-w-0 overflow-hidden rounded-2xl border border-border bg-surface",
              mobilePane !== "preview" && "hidden xl:block",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                <h2 className="text-xs font-semibold">
                  {l("Live canvas", "Lienzo en vivo")}
                </h2>
              </div>
              <div
                className="flex gap-1 rounded-lg bg-surface-subtle p-1"
                aria-label={l("Preview content", "Contenido de vista previa")}
              >
                {(
                  [
                    ["product", l("Product", "Producto")],
                    ["components", l("Components", "Componentes")],
                    ["background", l("Background", "Fondo")],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={previewSection === value}
                    onClick={() => setPreviewSection(value)}
                    className={cn(
                      "min-h-8 rounded-md px-2 text-[10px] font-medium sm:px-3",
                      previewSection === value
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <AppearanceScope
              appearance={appearance}
              className="min-w-0 bg-background p-4 text-foreground sm:p-5"
            >
              <StudioPreview
                appearance={appearance}
                section={previewSection}
                onToggleShader={() =>
                  setAppearance((current) => ({
                    ...current,
                    shader: {
                      ...current.shader,
                      paused: !current.shader.paused,
                    },
                  }))
                }
              />
            </AppearanceScope>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-[10px] text-muted-foreground">
              <span>
                {materialLabel(appearance.material, l)} ·{" "}
                {number(appearance.radius)} px ·{" "}
                {appearance.density === "compact"
                  ? l("Compact", "Compacta")
                  : l("Comfortable", "Cómoda")}
              </span>
              <span>
                {l(
                  "Real components. Your settings.",
                  "Componentes reales. Tus ajustes.",
                )}
              </span>
            </div>
          </section>

          <Card className={cn(mobilePane !== "library" && "hidden xl:block")}>
            <CardHeader className="flex-row items-start justify-between gap-3 p-5">
              <div>
                <CardTitle>
                  {l("Keep a good look.", "Guarda un buen estilo.")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {l(
                    "Save a signature. Make a copy. Come back to it anytime.",
                    "Guarda tu identidad. Haz una copia. Vuelve cuando quieras.",
                  )}
                </CardDescription>
              </div>
              <Save
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <form
                onSubmit={save}
                className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <Field
                  label={l("Preset name", "Nombre del ajuste")}
                  error={presetError}
                >
                  <Input
                    ref={presetInput}
                    value={presetName}
                    maxLength={48}
                    onChange={(event) => {
                      setPresetName(event.target.value);
                      setPresetError("");
                    }}
                    placeholder={l(
                      "e.g. Midnight launch",
                      "p. ej. Lanzamiento nocturno",
                    )}
                  />
                </Field>
                <Button type="submit" className="sm:mt-6">
                  <Plus aria-hidden="true" />
                  {l("Save preset", "Guardar ajuste")}
                </Button>
              </form>
              {presets.length ? (
                <ul className="mt-5 grid gap-2">
                  {presets.map((preset) => {
                    const active =
                      serializeAppearance(preset.config) === serialized;
                    return (
                      <li
                        key={preset.id}
                        className={cn(
                          "flex flex-wrap items-center gap-2 rounded-xl border p-3",
                          active
                            ? "border-primary/50 bg-accent/30"
                            : "border-border bg-surface-subtle/20",
                        )}
                      >
                        <div
                          className="flex shrink-0 -space-x-1"
                          aria-hidden="true"
                        >
                          {Object.values(preset.config.colors).map(
                            (color, i) => (
                              <span
                                key={i}
                                className="size-5 rounded-full border-2 border-surface"
                                style={{ background: color }}
                              />
                            ),
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-xs font-semibold">
                            {preset.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {preset.config.theme === "dark"
                              ? l("Dark", "Oscuro")
                              : l("Light", "Claro")}{" "}
                            · {materialLabel(preset.config.material, l)}
                          </p>
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-pressed={active}
                            aria-label={l(
                              `Apply ${preset.name}`,
                              `Aplicar ${preset.name}`,
                            )}
                            title={l("Apply", "Aplicar")}
                            onClick={() => {
                              applyPreset(preset.id);
                              toast.success(
                                l("Preset applied", "Ajuste aplicado"),
                              );
                            }}
                          >
                            {active ? (
                              <Check aria-hidden="true" />
                            ) : (
                              <Play aria-hidden="true" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!!duplicate}
                            aria-label={l(
                              `Duplicate ${preset.name}`,
                              `Duplicar ${preset.name}`,
                            )}
                            title={l("Duplicate", "Duplicar")}
                            onClick={() => duplicatePreset(preset)}
                          >
                            <Copy aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={l(
                              `Delete ${preset.name}`,
                              `Eliminar ${preset.name}`,
                            )}
                            title={l("Delete", "Eliminar")}
                            onClick={() => {
                              deletePreset(preset.id);
                              toast.success(
                                l("Preset deleted", "Ajuste eliminado"),
                              );
                            }}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-5 text-center">
                  <Paintbrush2
                    className="mx-auto mb-2 size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-muted-foreground">
                    {l(
                      "Your collection starts with one great look.",
                      "Tu colección empieza con un gran estilo.",
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            className={cn(
              "min-w-0 overflow-hidden",
              mobilePane !== "library" && "hidden xl:block",
            )}
          >
            <CardHeader className="flex-row items-start justify-between gap-3 p-5">
              <div>
                <CardTitle>
                  {l("Take your look with you.", "Lleva tu estilo contigo.")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {l(
                    "Settings, styles, or a complete React example. Ready to use.",
                    "Ajustes, estilos o un ejemplo React completo. Listos para usar.",
                  )}
                </CardDescription>
              </div>
              <Code2
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div
                  className="flex gap-1 rounded-lg bg-surface-subtle p-1"
                  aria-label={l("Export format", "Formato de exportación")}
                >
                  {(["json", "css", "react"] as const).map((format) => (
                    <button
                      key={format}
                      type="button"
                      aria-pressed={exportFormat === format}
                      onClick={() => setExportFormat(format)}
                      className={cn(
                        "min-h-9 rounded-md px-4 text-xs font-medium",
                        exportFormat === format
                          ? "bg-surface text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {format === "json"
                        ? l("JSON", "JSON")
                        : format === "css"
                          ? l("CSS", "CSS")
                          : l("React", "React")}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {l(
                    `${number(exportText.split("\n").length)} lines`,
                    `${number(exportText.split("\n").length)} líneas`,
                  )}
                </span>
              </div>
              <pre
                tabIndex={0}
                aria-label={l(
                  "Appearance export code",
                  "Código de exportación de apariencia",
                )}
                className="max-h-64 max-w-full overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[10px] leading-6 text-muted-foreground"
              >
                <code>{exportText}</code>
              </pre>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => void copyExport()}>
                  {copied && copiedFormat === exportFormat ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Copy aria-hidden="true" />
                  )}
                  {copied && copiedFormat === exportFormat
                    ? l("Copied", "Copiado")
                    : l("Copy", "Copiar")}
                </Button>
                <Button onClick={downloadExport}>
                  <Download aria-hidden="true" />
                  {l("Download", "Descargar")}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Link
            href={`/${locale}/themes/`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "min-h-11 justify-between whitespace-normal text-muted-foreground",
              mobilePane !== "library" && "hidden xl:flex",
            )}
          >
            {l(
              "Find inspiration in the theme gallery",
              "Encuentra inspiración en la galería de temas",
            )}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent closeLabel={l("Close import", "Cerrar importación")}>
          <DialogTitle>
            {l("Bring your look back.", "Recupera tu estilo.")}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Choose an appearance JSON file or paste its contents. Valid settings are applied together.",
              "Elige un archivo JSON de apariencia o pega su contenido. Los ajustes válidos se aplican juntos.",
            )}
          </DialogDescription>
          <form onSubmit={importSettings} className="mt-5">
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-label={l(
                "Appearance JSON file",
                "Archivo JSON de apariencia",
              )}
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
                event.target.value = "";
              }}
              tabIndex={-1}
            />
            <Button
              type="button"
              variant="outline"
              className="mb-4 w-full"
              loading={readingFile}
              onClick={() => fileInput.current?.click()}
            >
              <Upload aria-hidden="true" />
              {l("Choose JSON file", "Elegir archivo JSON")}
            </Button>
            <Field
              htmlFor={importId}
              label={l("Or paste JSON", "O pega el JSON")}
              error={importError}
              description={l(
                "Use a complete appearance export from the studio.",
                "Usa una exportación de apariencia completa del estudio.",
              )}
            >
              <Textarea
                id={importId}
                value={importText}
                onChange={(event) => {
                  setImportText(event.target.value);
                  setImportError("");
                  setImportReady(false);
                }}
                placeholder={l(
                  "Paste your appearance JSON here…",
                  "Pega tu JSON de apariencia aquí…",
                )}
                maxLength={32768}
                spellCheck={false}
                className="min-h-52 font-mono text-[11px]"
              />
            </Field>
            {importReady && (
              <p
                role="status"
                className="mt-3 flex items-center gap-2 text-xs text-primary"
              >
                <Check className="size-4" aria-hidden="true" />
                {l(
                  "Valid appearance. Ready to import.",
                  "Apariencia válida. Lista para importar.",
                )}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setImportOpen(false)}
              >
                {l("Cancel", "Cancelar")}
              </Button>
              <Button
                type="submit"
                disabled={!importText.trim() || readingFile}
              >
                <Upload aria-hidden="true" />
                {l("Import appearance", "Importar apariencia")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { AppearanceStudioTemplate as AppearanceStudio };
