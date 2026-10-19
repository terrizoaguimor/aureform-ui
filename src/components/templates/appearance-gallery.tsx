"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Focus,
  Layers3,
  Magnet,
  Moon,
  MousePointer2,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Chart } from "@/components/ui/chart";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createAppearance,
  exportConfiguredExample,
  palettePresets,
  serializeAppearance,
  type AppearanceConfig,
  type Material,
  type PaletteId,
} from "@/lib/appearance";
import { cn, downloadText } from "@/lib/utils";

type Translate = ReturnType<typeof useLanguage>["l"];
type RecipeId =
  "aurora" | "gradient" | "spotlight" | "glow" | "tilt" | "magnetic";

function materialName(material: Material, l: Translate) {
  return {
    flat: l("Flat", "Plano"),
    elevated: l("Elevated", "Elevado"),
    glass: l("Glass", "Cristal"),
    gradient: l("Gradient", "Degradado"),
  }[material];
}

function paletteStory(palette: PaletteId, l: Translate) {
  return {
    aurora: l(
      "Electric optimism. A bright beginning.",
      "Optimismo eléctrico. Un comienzo brillante.",
    ),
    violet: l(
      "A little mystery. A lot of confidence.",
      "Un poco de misterio. Mucha confianza.",
    ),
    ocean: l("Clarity, in every direction.", "Claridad, en cada dirección."),
    mint: l(
      "Fresh thinking. Lasting energy.",
      "Ideas frescas. Energía que perdura.",
    ),
    ember: l("A spark worth following.", "Una chispa que vale la pena seguir."),
    rose: l("Warmth with a creative edge.", "Calidez con un toque creativo."),
  }[palette];
}

function GalleryRange({
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
    <div className={cn("min-w-0", disabled && "opacity-50")}>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <output
          htmlFor={id}
          className="font-mono tabular-nums text-muted-foreground"
        >
          {display ?? `${Math.round(value * 100)}%`}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="mt-1 h-9 w-full cursor-pointer accent-primary disabled:cursor-default"
      />
    </div>
  );
}

function CodeDisclosure({
  source,
  filename,
}: {
  source: string;
  filename: string;
}) {
  const { l } = useLanguage();
  const { copied, copy } = useCopy();
  const [copiedSource, setCopiedSource] = useState("");
  return (
    <div className="min-w-0 border-t border-border p-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-10 min-w-0 flex-1 whitespace-normal text-[11px]"
          onClick={async () => {
            try {
              await copy(source);
              setCopiedSource(source);
            } catch {
              toast.error(
                l(
                  "Couldn't copy. Download the example or select the code.",
                  "No se pudo copiar. Descarga el ejemplo o selecciona el código.",
                ),
              );
            }
          }}
        >
          {copied && copiedSource === source ? (
            <Check aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
          {copied && copiedSource === source
            ? l("Copied", "Copiado")
            : l("Copy full React code", "Copiar código React completo")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={l("Download React example", "Descargar ejemplo React")}
          title={l("Download React example", "Descargar ejemplo React")}
          onClick={() => downloadText(filename, source, "text/plain")}
        >
          <Download aria-hidden="true" />
        </Button>
      </div>
      <details className="group mt-3 min-w-0">
        <summary className="flex min-h-9 list-none items-center justify-between gap-2 rounded-md px-1 text-[10px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          {l("View complete example", "Ver ejemplo completo")}
          <ChevronDown
            className="size-3.5 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <pre
          tabIndex={0}
          aria-label={l("Complete React example", "Ejemplo React completo")}
          className="mt-2 max-h-72 max-w-full overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[10px] leading-6 text-muted-foreground"
        >
          <code>{source}</code>
        </pre>
      </details>
    </div>
  );
}

function themeAppearance(
  appearance: AppearanceConfig,
  palette: PaletteId,
  theme: AppearanceConfig["theme"],
  material: Material,
): AppearanceConfig {
  const base = createAppearance(palette, theme);
  return {
    ...appearance,
    theme,
    palette,
    material,
    colors: base.colors,
    gradient: {
      ...appearance.gradient,
      stops: appearance.gradient.stops.map((stop, index) => ({
        ...stop,
        color: Object.values(base.colors)[index % 3],
      })),
    },
  };
}

function themeSource(config: AppearanceConfig, l: Translate) {
  const name = paletteDisplayName(config.palette, l);
  const text = (value: string) => `{${JSON.stringify(value)}}`;
  const colors = config.gradient.stops.map((stop) => stop.color);
  return exportConfiguredExample(
    `"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Chart } from "@/components/ui/chart";
import { GradientBackground } from "@/components/effects";

export default function ${config.palette[0].toUpperCase() + config.palette.slice(1)}Example() {
  const [project, setProject] = useState("");
  const [ready, setReady] = useState(false);
  const data = [
    { label: ${JSON.stringify(l("Mon", "Lun"))}, value: 28 },
    { label: ${JSON.stringify(l("Tue", "Mar"))}, value: 42 },
    { label: ${JSON.stringify(l("Wed", "Mié"))}, value: 36 },
    { label: ${JSON.stringify(l("Thu", "Jue"))}, value: 64 },
    { label: ${JSON.stringify(l("Fri", "Vie"))}, value: 82 },
  ];

  return (
    <main className="mx-auto grid max-w-lg gap-4 bg-background p-6 text-foreground">
      <GradientBackground kind=${JSON.stringify(config.gradient.kind)} colors={${JSON.stringify(colors)}} angle={${config.gradient.angle}} intensity={${config.gradient.intensity}} className="rounded-2xl border border-border p-6 [&>.afx-background-field]:[background-image:var(--af-gradient-color)]!">
        <Badge variant="outline" className="border-white/25 bg-white/5 text-white">${text(name)}</Badge>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">${text(l("Make your next move.", "Da tu próximo paso."))}</h1>
        <p className="mt-3 text-sm leading-6 text-white/75">${text(paletteStory(config.palette, l))}</p>
      </GradientBackground>
      <Card appearance=${JSON.stringify(config.material)}>
        <CardHeader><CardTitle>${text(l("Launch overview", "Resumen del lanzamiento"))}</CardTitle></CardHeader>
        <CardContent>
          <Chart kind="bar" data={data} height={140} label=${JSON.stringify(l("Project momentum", "Impulso del proyecto"))} valueLabel=${JSON.stringify(l("Progress", "Avance"))} />
          <form onSubmit={(event) => { event.preventDefault(); setReady(true); }} className="mt-4 grid gap-3">
            <label className="grid gap-2 text-xs font-medium">
              ${text(l("Project name", "Nombre del proyecto"))}
              <Input required value={project} onChange={(event) => { setProject(event.target.value); setReady(false); }} placeholder=${JSON.stringify(l("Your next great idea", "Tu próxima gran idea"))} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">${text(l("Create project", "Crear proyecto"))}</Button>
              <Button type="button" variant="outline" onClick={() => { setProject(""); setReady(false); }}>${text(l("Start again", "Empezar de nuevo"))}</Button>
            </div>
            {ready && <p role="status" className="text-xs text-primary">${text(l("Your preview is ready.", "Tu vista previa está lista."))}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
`,
    config,
  );
}

function ThemeCard({
  appearance,
  palette,
  theme,
  material,
}: {
  appearance: AppearanceConfig;
  palette: PaletteId;
  theme: AppearanceConfig["theme"];
  material: Material;
}) {
  const { l, number } = useLanguage();
  const { setAppearance } = useAppearance();
  const config = useMemo(
    () => themeAppearance(appearance, palette, theme, material),
    [appearance, palette, theme, material],
  );
  const source = useMemo(() => themeSource(config, l), [config, l]);
  const name = paletteDisplayName(palette, l);
  const active =
    serializeAppearance(config) === serializeAppearance(appearance);
  const data = [
    { label: l("Mon", "Lun"), value: 28 },
    { label: l("Tue", "Mar"), value: 42 },
    { label: l("Wed", "Mié"), value: 36 },
    { label: l("Thu", "Jue"), value: 64 },
    { label: l("Fri", "Vie"), value: 82 },
  ];

  return (
    <article
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border bg-surface",
        active
          ? "border-primary/60 shadow-[0_0_0_1px_var(--primary)]"
          : "border-border",
      )}
    >
      <AppearanceScope
        appearance={config}
        className="min-w-0 bg-background p-3 text-foreground"
      >
        <GradientBackground
          kind={config.gradient.kind}
          colors={config.gradient.stops.map((stop) => stop.color)}
          angle={config.gradient.angle}
          intensity={config.gradient.intensity}
          className="min-h-48 rounded-xl p-5 [&>.afx-background-field]:[background-image:var(--af-gradient-color)]!"
        >
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="border-white/25 bg-white/5 text-white"
            >
              {l("Aureform palette", "Paleta Aureform")}
            </Badge>
            <Sparkles className="size-4 text-white/70" aria-hidden="true" />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-[-.05em]">
            {name}
          </h2>
          <p className="mt-2 max-w-56 text-xs leading-6 text-white/75">
            {paletteStory(palette, l)}
          </p>
        </GradientBackground>
        <Card appearance={material} className="mt-3 overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-4 pt-4">
            <div>
              <p className="text-[10px] text-muted-foreground">
                {l("Project momentum", "Impulso del proyecto")}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {number(128)}
                <span className="ml-2 align-middle text-[10px] font-normal text-muted-foreground">
                  {l("ideas in motion", "ideas en marcha")}
                </span>
              </p>
            </div>
            <Badge>+24%</Badge>
          </div>
          <Chart
            kind="bar"
            data={data}
            label={l(
              `${name} project momentum`,
              `Impulso del proyecto ${name}`,
            )}
            valueLabel={l("Progress", "Avance")}
            height={105}
            className="mt-1 px-1"
          />
          <div className="grid gap-3 px-4 pb-4">
            <Field label={l("Project name", "Nombre del proyecto")}>
              <Input
                placeholder={l("Your next great idea", "Tu próxima gran idea")}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  toast.success(
                    l(
                      "A good beginning for your next idea.",
                      "Un buen comienzo para tu próxima idea.",
                    ),
                  )
                }
              >
                {l("Primary", "Principal")}
                <ArrowUpRight aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast(
                    l(
                      "Every detail follows your palette.",
                      "Cada detalle sigue tu paleta.",
                    ),
                  )
                }
              >
                {l("Secondary", "Secundario")}
              </Button>
            </div>
          </div>
        </Card>
      </AppearanceScope>
      <div className="grid gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            className="flex items-center gap-1.5"
            aria-label={l(`${name} colors`, `Colores de ${name}`)}
          >
            {Object.values(config.colors).map((color, index) => (
              <span
                key={index}
                title={color}
                className="size-4 rounded-full border border-foreground/10"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {theme === "dark" ? l("Dark", "Oscuro") : l("Light", "Claro")} ·{" "}
            {materialName(material, l)}
          </span>
        </div>
        <Button
          variant={active ? "secondary" : "outline"}
          className="min-h-11 w-full"
          aria-pressed={active}
          onClick={() => {
            setAppearance(config);
            toast.success(l(`${name} applied`, `${name} aplicado`));
          }}
        >
          {active ? (
            <Check aria-hidden="true" />
          ) : (
            <Palette aria-hidden="true" />
          )}
          {active
            ? l("Current theme", "Tema actual")
            : l("Apply theme", "Aplicar tema")}
        </Button>
      </div>
      <CodeDisclosure
        source={source}
        filename={`aureform-theme-${palette}.tsx`}
      />
    </article>
  );
}

export function ThemesTemplate() {
  const { l, locale } = useLanguage();
  const { appearance } = useAppearance();
  const [theme, setTheme] = useState(appearance.theme);
  const [material, setMaterial] = useState<Material>(appearance.material);

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        eyebrow={l(
          "Theme gallery · six directions",
          "Galería de temas · seis caminos",
        )}
        title={l("A palette for your ambition.", "Una paleta para tus ideas.")}
        description={l(
          "Six distinct signatures. Real surfaces, real components, and a look you can make your own.",
          "Seis identidades distintas. Superficies y componentes reales, con un estilo que puedes hacer tuyo.",
        )}
        actions={
          <Link
            href={`/${locale}/studio/`}
            className={buttonVariants({ size: "sm" })}
          >
            {l("Open the studio", "Abrir el estudio")}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        }
      />
      <div className="grid items-center gap-5 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-accent p-3 text-primary">
            <Palette className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">
              {l(
                "Same foundation. Your point of view.",
                "La misma base. Tu punto de vista.",
              )}
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              {l(
                "Compare every palette in light or dark, with your chosen finish.",
                "Compara cada paleta en claro u oscuro, con el acabado que elijas.",
              )}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:min-w-60">
          <fieldset>
            <legend className="mb-2 text-[11px] font-medium">
              {l("Preview theme", "Tema de vista previa")}
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              {(["dark", "light"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium",
                    theme === value
                      ? "border-primary/60 bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:bg-surface-subtle",
                  )}
                >
                  {value === "dark" ? (
                    <Moon className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Sun className="size-3.5" aria-hidden="true" />
                  )}
                  {value === "dark" ? l("Dark", "Oscuro") : l("Light", "Claro")}
                </button>
              ))}
            </div>
          </fieldset>
          <Select
            label={l("Surface finish", "Acabado de superficie")}
            value={material}
            onValueChange={(value) => setMaterial(value as Material)}
            options={(["flat", "elevated", "glass", "gradient"] as const).map(
              (value) => ({ value, label: materialName(value, l) }),
            )}
          />
        </div>
      </div>
      <div className="grid min-w-0 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {palettePresets.map((preset) => (
          <ThemeCard
            key={preset.id}
            appearance={appearance}
            palette={preset.id}
            theme={theme}
            material={material}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-subtle/30 px-5 py-4">
        <p className="text-xs text-muted-foreground">
          {l(
            "Found your direction? Refine every shade in the studio.",
            "¿Encontraste tu camino? Ajusta cada tono en el estudio.",
          )}
        </p>
        <Link
          href={`/${locale}/studio/`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-primary",
          )}
        >
          {l("Make it yours", "Hazlo tuyo")}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

type RecipeTuning = {
  intensity: number;
  speed: number;
  scale: number;
  paused: boolean;
  shader: AppearanceConfig["shader"]["kind"];
  gradient: AppearanceConfig["gradient"]["kind"];
  angle: number;
  spotlightRadius: number;
  borderWidth: number;
  duration: number;
  tilt: number;
  perspective: number;
  strength: number;
  distance: number;
};

function initialTuning(): RecipeTuning {
  return {
    intensity: 0.55,
    speed: 0.2,
    scale: 1,
    paused: false,
    shader: "aurora",
    gradient: "linear",
    angle: 125,
    spotlightRadius: 320,
    borderWidth: 1.5,
    duration: 12,
    tilt: 6,
    perspective: 900,
    strength: 0.18,
    distance: 10,
  };
}

function recipeInfo(
  id: RecipeId,
  l: Translate,
): { name: string; description: string; category: string; icon: ReactNode } {
  return {
    aurora: {
      name: l("Aurora field", "Campo aurora"),
      description: l(
        "Soft ribbons of light, moving at your pace.",
        "Cintas suaves de luz que se mueven a tu ritmo.",
      ),
      category: l("Shader", "Shader"),
      icon: <Waves className="size-4" aria-hidden="true" />,
    },
    gradient: {
      name: l("Prismatic gradient", "Degradado prismático"),
      description: l(
        "A wash of color. A precise point of view.",
        "Una capa de color. Un punto de vista preciso.",
      ),
      category: l("Color", "Color"),
      icon: <Palette className="size-4" aria-hidden="true" />,
    },
    spotlight: {
      name: l("Spotlight surface", "Superficie con foco"),
      description: l(
        "A gentle light that follows your attention.",
        "Una luz suave que sigue tu atención.",
      ),
      category: l("Pointer", "Cursor"),
      icon: <Focus className="size-4" aria-hidden="true" />,
    },
    glow: {
      name: l("Luminous edge", "Borde luminoso"),
      description: l(
        "A fine line of color, quietly in motion.",
        "Una fina línea de color en suave movimiento.",
      ),
      category: l("Border", "Borde"),
      icon: <Sparkles className="size-4" aria-hidden="true" />,
    },
    tilt: {
      name: l("Perspective card", "Tarjeta en perspectiva"),
      description: l(
        "A little dimension for a closer look.",
        "Un poco de dimensión para mirar más de cerca.",
      ),
      category: l("Depth", "Profundidad"),
      icon: <Layers3 className="size-4" aria-hidden="true" />,
    },
    magnetic: {
      name: l("Magnetic action", "Acción magnética"),
      description: l(
        "An invitation with a little pull.",
        "Una invitación con un poco de atracción.",
      ),
      category: l("Action", "Acción"),
      icon: <Magnet className="size-4" aria-hidden="true" />,
    },
  }[id];
}

function recipeAppearance(
  appearance: AppearanceConfig,
  id: RecipeId,
  tuning: RecipeTuning,
): AppearanceConfig {
  const hover: Record<RecipeId, AppearanceConfig["hover"]> = {
    aurora: "none",
    gradient: "none",
    spotlight: "spotlight",
    glow: "glow",
    tilt: "tilt",
    magnetic: "magnetic",
  };
  return {
    ...appearance,
    material:
      id === "aurora" || id === "spotlight"
        ? "glass"
        : id === "gradient"
          ? "gradient"
          : "elevated",
    radius: 20,
    hover: hover[id],
    gradient: {
      ...appearance.gradient,
      kind: id === "aurora" ? "mesh" : tuning.gradient,
      angle: tuning.angle,
      intensity: tuning.intensity,
    },
    shader: {
      kind: id === "aurora" ? tuning.shader : "none",
      speed: tuning.speed,
      scale: tuning.scale,
      intensity: tuning.intensity,
      paused: tuning.paused,
    },
  };
}

function RecipeContent({ id }: { id: RecipeId }) {
  const { l } = useLanguage();
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <Badge variant="outline">
          {l("The next chapter", "El próximo capítulo")}
        </Badge>
      </div>
      <div>
        <h3 className="text-xl font-semibold tracking-tight">
          {l(
            "Ideas deserve a little energy.",
            "Tus ideas merecen un poco de energía.",
          )}
        </h3>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          {l(
            "Make every interaction feel considered.",
            "Haz que cada interacción se sienta cuidada.",
          )}
        </p>
      </div>
      {id === "spotlight" && (
        <Field label={l("Name your idea", "Ponle nombre a tu idea")}>
          <Input
            placeholder={l("Something extraordinary…", "Algo extraordinario…")}
          />
        </Field>
      )}
      <Button
        variant="outline"
        className="w-fit"
        onClick={() =>
          toast.success(
            l(
              "A little energy, a clear intention.",
              "Un poco de energía, una intención clara.",
            ),
          )
        }
      >
        {l("Take a closer look", "Mira más de cerca")}
        <ArrowUpRight aria-hidden="true" />
      </Button>
    </div>
  );
}

function RecipePreview({
  id,
  config,
  tuning,
  onPause,
}: {
  id: RecipeId;
  config: AppearanceConfig;
  tuning: RecipeTuning;
  onPause: () => void;
}) {
  const { l } = useLanguage();
  const colors = Object.values(config.colors);
  if (id === "aurora") {
    return (
      <ShaderBackground
        kind={tuning.shader}
        colors={colors}
        speed={tuning.speed}
        scale={tuning.scale}
        intensity={tuning.intensity}
        paused={tuning.paused || config.motion === "off"}
        className="min-h-72 rounded-xl p-6"
      >
        <div className="flex min-h-60 flex-col items-start justify-between gap-8">
          <Badge
            variant="outline"
            className="border-white/25 bg-white/5 text-white"
          >
            {l("A little atmosphere", "Un poco de atmósfera")}
          </Badge>
          <div>
            <h3 className="text-3xl leading-tight font-semibold tracking-[-.05em] text-white">
              {l("Stay curious.", "Mantén la curiosidad.")}
            </h3>
            <p className="mt-3 text-xs leading-6 text-white/75">
              {l(
                "Let a little light lead the way.",
                "Deja que un poco de luz te guíe.",
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={config.motion === "off" || tuning.shader === "none"}
            onClick={onPause}
          >
            {tuning.paused ? (
              <Play aria-hidden="true" />
            ) : (
              <Pause aria-hidden="true" />
            )}
            {tuning.paused ? l("Resume", "Reanudar") : l("Pause", "Pausar")}
          </Button>
        </div>
      </ShaderBackground>
    );
  }
  if (id === "gradient") {
    return (
      <GradientBackground
        kind={tuning.gradient}
        colors={config.gradient.stops.map((stop) => stop.color)}
        angle={tuning.angle}
        intensity={tuning.intensity}
        className="min-h-72 rounded-xl p-6 [&>.afx-background-field]:[background-image:var(--af-gradient-color)]!"
      >
        <div className="flex min-h-60 flex-col items-start justify-between gap-8">
          <Badge
            variant="outline"
            className="border-white/25 bg-white/5 text-white"
          >
            {l("Color with intention", "Color con intención")}
          </Badge>
          <div>
            <h3 className="text-3xl leading-tight font-semibold tracking-[-.05em] text-white">
              {l("A brighter perspective.", "Una perspectiva más brillante.")}
            </h3>
            <p className="mt-3 text-xs leading-6 text-white/75">
              {l(
                "Find a new angle on your next idea.",
                "Encuentra un nuevo ángulo para tu próxima idea.",
              )}
            </p>
          </div>
          <Button
            appearance="gradient"
            size="sm"
            onClick={() =>
              toast.success(
                l("A brighter beginning.", "Un comienzo más brillante."),
              )
            }
          >
            {l("Explore color", "Explora el color")}
            <ArrowUpRight aria-hidden="true" />
          </Button>
        </div>
      </GradientBackground>
    );
  }
  if (id === "spotlight")
    return (
      <SpotlightCard
        spotlightColor={config.colors.primary}
        intensity={tuning.intensity * 0.6}
        radius={tuning.spotlightRadius}
        className="min-h-72 p-5"
      >
        <RecipeContent id={id} />
      </SpotlightCard>
    );
  if (id === "glow")
    return (
      <GlowBorder
        colors={colors}
        borderWidth={tuning.borderWidth}
        duration={tuning.duration}
        className="min-h-72 p-5"
      >
        <RecipeContent id={id} />
      </GlowBorder>
    );
  if (id === "tilt")
    return (
      <div className="px-1 py-2">
        <TiltCard
          maxTilt={tuning.tilt}
          perspective={tuning.perspective}
          className="min-h-72 p-5"
        >
          <RecipeContent id={id} />
        </TiltCard>
      </div>
    );
  return (
    <Card
      appearance={config.material}
      className="flex min-h-72 flex-col items-center justify-center gap-5 p-6 text-center"
    >
      <span className="rounded-xl bg-accent p-3 text-primary">
        <MousePointer2 className="size-5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">
          {l("Follow your curiosity.", "Sigue tu curiosidad.")}
        </h3>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          {l(
            "An action that meets you halfway.",
            "Una acción que se acerca a ti.",
          )}
        </p>
      </div>
      <div className="p-3">
        <MagneticButton
          asChild
          strength={tuning.strength}
          maxDistance={tuning.distance}
        >
          <Button
            appearance="gradient"
            onClick={() =>
              toast.success(
                l("You're in good company.", "Estás en buena compañía."),
              )
            }
          >
            {l("Make your move", "Da el paso")}
            <ArrowUpRight aria-hidden="true" />
          </Button>
        </MagneticButton>
      </div>
    </Card>
  );
}

function recipeSource(
  id: RecipeId,
  config: AppearanceConfig,
  tuning: RecipeTuning,
  l: Translate,
) {
  const text = (en: string, es: string) => `{${JSON.stringify(l(en, es))}}`;
  const colors = JSON.stringify(Object.values(config.colors));
  const component = {
    aurora: "ShaderBackground",
    gradient: "GradientBackground",
    spotlight: "SpotlightCard",
    glow: "GlowBorder",
    tilt: "TiltCard",
    magnetic: "MagneticButton",
  }[id];
  let opening = "";
  let closing = "";
  let content = `
        <Badge variant="outline">${text("The next chapter", "El próximo capítulo")}</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">${text("Ideas deserve a little energy.", "Tus ideas merecen un poco de energía.")}</h1>
        <p className="text-sm leading-6 text-muted-foreground">${text("Make every interaction feel considered.", "Haz que cada interacción se sienta cuidada.")}</p>
        <label className="grid gap-2 text-xs font-medium">
          ${text("Name your idea", "Ponle nombre a tu idea")}
          <Input value={idea} onChange={(event) => setIdea(event.target.value)} placeholder=${JSON.stringify(l("Something extraordinary…", "Algo extraordinario…"))} />
        </label>
        <Button variant="outline" onClick={() => setSelected(true)}>${text("Take a closer look", "Mira más de cerca")}</Button>
        {selected && <p role="status" className="text-xs text-primary">${text("A good beginning.", "Un buen comienzo.")}</p>}`;

  if (id === "aurora") {
    opening = `<ShaderBackground kind=${JSON.stringify(tuning.shader)} colors={${colors}} speed={${tuning.speed}} scale={${tuning.scale}} intensity={${tuning.intensity}} paused={paused || ${config.motion === "off"}} className="rounded-2xl p-8">`;
    closing = "</ShaderBackground>";
    content = `
        <Badge variant="outline" className="border-white/25 bg-white/5 text-white">${text("A little atmosphere", "Un poco de atmósfera")}</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-white">${text("Stay curious.", "Mantén la curiosidad.")}</h1>
        <p className="text-sm text-white/75">${text("Let a little light lead the way.", "Deja que un poco de luz te guíe.")}</p>
        <Button variant="outline" disabled={${config.motion === "off" || tuning.shader === "none"}} onClick={() => setPaused((current) => !current)}>
          {paused ? ${JSON.stringify(l("Resume", "Reanudar"))} : ${JSON.stringify(l("Pause", "Pausar"))}}
        </Button>`;
  } else if (id === "gradient") {
    opening = `<GradientBackground kind=${JSON.stringify(tuning.gradient)} colors={${JSON.stringify(config.gradient.stops.map((stop) => stop.color))}} angle={${tuning.angle}} intensity={${tuning.intensity}} className="rounded-2xl p-8 [&>.afx-background-field]:[background-image:var(--af-gradient-color)]!">`;
    closing = "</GradientBackground>";
    content = `
        <Badge variant="outline" className="border-white/25 bg-white/5 text-white">${text("Color with intention", "Color con intención")}</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-white">${text("A brighter perspective.", "Una perspectiva más brillante.")}</h1>
        <p className="text-sm text-white/75">${text("Find a new angle on your next idea.", "Encuentra un nuevo ángulo para tu próxima idea.")}</p>
        <Button appearance="gradient" onClick={() => setSelected(true)}>${text("Explore color", "Explora el color")}</Button>
        {selected && <p role="status" className="text-xs text-white">${text("A brighter beginning.", "Un comienzo más brillante.")}</p>}`;
  } else if (id === "spotlight") {
    opening = `<SpotlightCard spotlightColor=${JSON.stringify(config.colors.primary)} intensity={${tuning.intensity * 0.6}} radius={${tuning.spotlightRadius}} className="p-6">`;
    closing = "</SpotlightCard>";
  } else if (id === "glow") {
    opening = `<GlowBorder colors={${colors}} borderWidth={${tuning.borderWidth}} duration={${tuning.duration}} className="p-6">`;
    closing = "</GlowBorder>";
  } else if (id === "tilt") {
    opening = `<TiltCard maxTilt={${tuning.tilt}} perspective={${tuning.perspective}} className="p-6">`;
    closing = "</TiltCard>";
  } else {
    opening = `<Card appearance=${JSON.stringify(config.material)} className="p-8 text-center">`;
    closing = "</Card>";
    content = `
        <Badge>${text("An invitation", "Una invitación")}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">${text("Follow your curiosity.", "Sigue tu curiosidad.")}</h1>
        <p className="text-sm text-muted-foreground">${text("An action that meets you halfway.", "Una acción que se acerca a ti.")}</p>
        <MagneticButton asChild strength={${tuning.strength}} maxDistance={${tuning.distance}}>
          <Button appearance="gradient" onClick={() => setSelected(true)}>${text("Make your move", "Da el paso")}</Button>
        </MagneticButton>
        {selected && <p role="status" className="text-xs text-primary">${text("A good beginning.", "Un buen comienzo.")}</p>}`;
  }
  const state =
    id === "aurora"
      ? `const [paused, setPaused] = useState(${tuning.paused});`
      : id === "spotlight" || id === "glow" || id === "tilt"
        ? 'const [idea, setIdea] = useState("");\n  const [selected, setSelected] = useState(false);'
        : "const [selected, setSelected] = useState(false);";
  return exportConfiguredExample(
    `"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
${id === "magnetic" ? 'import { Card } from "@/components/ui/card";\n' : ""}${id === "spotlight" || id === "glow" || id === "tilt" ? 'import { Input } from "@/components/ui/input";\n' : ""}import { ${component} } from "@/components/effects";

export default function ${component}Example() {
  ${state}

  return (
    <main className="mx-auto max-w-lg bg-background p-6 text-foreground">
      ${opening}
      <div className="grid min-h-64 justify-items-start gap-5">
        ${content.trim()}
      </div>
      ${closing}
    </main>
  );
}
`,
    config,
  );
}

function EffectRecipe({
  id,
  index,
  appearance,
}: {
  id: RecipeId;
  index: number;
  appearance: AppearanceConfig;
}) {
  const { l, locale, number } = useLanguage();
  const { setAppearance } = useAppearance();
  const [tuning, setTuning] = useState(initialTuning);
  const info = recipeInfo(id, l);
  const config = useMemo(
    () => recipeAppearance(appearance, id, tuning),
    [appearance, id, tuning],
  );
  const source = useMemo(
    () => recipeSource(id, config, tuning, l),
    [id, config, tuning, l],
  );
  const update = <K extends keyof RecipeTuning>(
    key: K,
    value: RecipeTuning[K],
  ) => setTuning((current) => ({ ...current, [key]: value }));
  const shaderOff = tuning.shader === "none";

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="mb-2 font-mono text-[9px] text-muted-foreground">
            {l("RECIPE", "RECETA")} {String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="text-base font-semibold tracking-tight">
            {info.name}
          </h2>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
            {info.description}
          </p>
        </div>
        <span className="rounded-lg bg-accent p-2.5 text-primary">
          {info.icon}
        </span>
      </div>
      <AppearanceScope
        appearance={config}
        className="min-w-0 bg-background px-4 py-4 text-foreground"
      >
        <RecipePreview
          id={id}
          config={config}
          tuning={tuning}
          onPause={() => update("paused", !tuning.paused)}
        />
      </AppearanceScope>
      <div className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="neutral">{info.category}</Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={l(`Reset ${info.name}`, `Restablecer ${info.name}`)}
            title={l("Reset recipe", "Restablecer receta")}
            onClick={() => setTuning(initialTuning())}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
        {id === "aurora" && (
          <>
            <Select
              label={l("Shader type", "Tipo de shader")}
              value={tuning.shader}
              onValueChange={(value) =>
                update("shader", value as RecipeTuning["shader"])
              }
              options={[
                { value: "aurora", label: l("Aurora", "Aurora") },
                { value: "waves", label: l("Waves", "Ondas") },
                { value: "iridescent", label: l("Iridescent", "Iridiscente") },
                { value: "none", label: l("None", "Ninguno") },
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <GalleryRange
                label={l("Speed", "Velocidad")}
                value={tuning.speed}
                disabled={shaderOff}
                onChange={(value) => update("speed", value)}
              />
              <GalleryRange
                label={l("Scale", "Escala")}
                value={tuning.scale}
                min={0.25}
                max={4}
                step={0.05}
                display={`${number(tuning.scale, { maximumFractionDigits: 2 })}×`}
                disabled={shaderOff}
                onChange={(value) => update("scale", value)}
              />
            </div>
            <GalleryRange
              label={l("Intensity", "Intensidad")}
              value={tuning.intensity}
              disabled={shaderOff}
              onChange={(value) => update("intensity", value)}
            />
          </>
        )}
        {id === "gradient" && (
          <>
            <Select
              label={l("Gradient type", "Tipo de degradado")}
              value={tuning.gradient}
              onValueChange={(value) =>
                update("gradient", value as RecipeTuning["gradient"])
              }
              options={[
                { value: "linear", label: l("Linear", "Lineal") },
                { value: "radial", label: l("Radial", "Radial") },
                { value: "mesh", label: l("Mesh", "Malla") },
              ]}
            />
            <GalleryRange
              label={l("Angle", "Ángulo")}
              value={tuning.angle}
              min={0}
              max={360}
              step={1}
              display={`${number(tuning.angle)}°`}
              onChange={(value) => update("angle", value)}
            />
            <GalleryRange
              label={l("Intensity", "Intensidad")}
              value={tuning.intensity}
              onChange={(value) => update("intensity", value)}
            />
          </>
        )}
        {id === "spotlight" && (
          <>
            <GalleryRange
              label={l("Light intensity", "Intensidad de luz")}
              value={tuning.intensity}
              onChange={(value) => update("intensity", value)}
            />
            <GalleryRange
              label={l("Spotlight size", "Tamaño del foco")}
              value={tuning.spotlightRadius}
              min={80}
              max={800}
              step={10}
              display={`${number(tuning.spotlightRadius)} px`}
              onChange={(value) => update("spotlightRadius", value)}
            />
          </>
        )}
        {id === "glow" && (
          <>
            <GalleryRange
              label={l("Edge width", "Ancho del borde")}
              value={tuning.borderWidth}
              min={1}
              max={6}
              step={0.1}
              display={`${number(tuning.borderWidth, { maximumFractionDigits: 1 })} px`}
              onChange={(value) => update("borderWidth", value)}
            />
            <GalleryRange
              label={l("Orbit duration", "Duración del giro")}
              value={tuning.duration}
              min={4}
              max={60}
              step={1}
              display={`${number(tuning.duration)} s`}
              onChange={(value) => update("duration", value)}
            />
          </>
        )}
        {id === "tilt" && (
          <>
            <GalleryRange
              label={l("Tilt angle", "Ángulo de inclinación")}
              value={tuning.tilt}
              min={0}
              max={12}
              step={0.5}
              display={`${number(tuning.tilt)}°`}
              onChange={(value) => update("tilt", value)}
            />
            <GalleryRange
              label={l("Perspective", "Perspectiva")}
              value={tuning.perspective}
              min={400}
              max={2000}
              step={50}
              display={`${number(tuning.perspective)} px`}
              onChange={(value) => update("perspective", value)}
            />
          </>
        )}
        {id === "magnetic" && (
          <>
            <GalleryRange
              label={l("Pull strength", "Fuerza de atracción")}
              value={tuning.strength}
              max={0.5}
              onChange={(value) => update("strength", value)}
            />
            <GalleryRange
              label={l("Travel distance", "Distancia de movimiento")}
              value={tuning.distance}
              min={0}
              max={24}
              step={1}
              display={`${number(tuning.distance)} px`}
              onChange={(value) => update("distance", value)}
            />
          </>
        )}
        <Link
          href={`/${locale}/studio/`}
          onClick={() => setAppearance(config)}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "min-h-10 justify-between whitespace-normal px-0 text-[11px] text-primary",
          )}
        >
          {l(
            "Refine this style in the studio",
            "Ajustar este estilo en el estudio",
          )}
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
      <CodeDisclosure source={source} filename={`aureform-effect-${id}.tsx`} />
    </article>
  );
}

export function EffectsTemplate() {
  const { l, locale } = useLanguage();
  const { appearance, setAppearance } = useAppearance();
  const recipes: RecipeId[] = [
    "aurora",
    "gradient",
    "spotlight",
    "glow",
    "tilt",
    "magnetic",
  ];

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        eyebrow={l(
          "Effect gallery · a little energy",
          "Galería de efectos · un poco de energía",
        )}
        title={l("Interfaces with a pulse.", "Interfaces que laten.")}
        description={l(
          "Six considered recipes for light, depth, and interaction. Tune the details, then take the complete code.",
          "Seis recetas cuidadas de luz, profundidad e interacción. Ajusta los detalles y lleva el código completo.",
        )}
        actions={
          <Link
            href={`/${locale}/studio/`}
            className={buttonVariants({ size: "sm" })}
          >
            {l("Open the studio", "Abrir el estudio")}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        }
      />
      <div className="grid items-center gap-6 rounded-2xl border border-border bg-surface p-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
        <div className="grid gap-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-accent p-3 text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">
                {l("A signature, in motion.", "Una identidad en movimiento.")}
              </h2>
              <p className="mt-1 max-w-lg text-xs leading-6 text-muted-foreground">
                {l(
                  "Hover, focus, and play. Every recipe responds to your palette and motion choice.",
                  "Pasa el cursor, usa el foco y explora. Cada receta responde a tu paleta y tu elección de movimiento.",
                )}
              </p>
            </div>
          </div>
          <div className="max-w-80">
            <Select
              label={l(
                "Motion across previews",
                "Movimiento en las vistas previas",
              )}
              value={appearance.motion}
              onValueChange={(motion) =>
                setAppearance((current) => ({
                  ...current,
                  motion: motion as AppearanceConfig["motion"],
                }))
              }
              options={[
                {
                  value: "off",
                  label: l(
                    "Off · a still composition",
                    "Ninguno · una composición quieta",
                  ),
                },
                {
                  value: "gentle",
                  label: l(
                    "Gentle · a subtle response",
                    "Suave · una respuesta sutil",
                  ),
                },
                {
                  value: "expressive",
                  label: l(
                    "Expressive · a little more energy",
                    "Expresivo · un poco más de energía",
                  ),
                },
              ]}
            />
          </div>
        </div>
        <PalettePicker compact />
      </div>
      {appearance.motion === "off" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-border bg-surface-subtle/40 px-4 py-3 text-xs leading-6 text-muted-foreground"
        >
          <Pause className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {l(
            "Motion is off. Your previews keep their color and stay still.",
            "El movimiento está desactivado. Las vistas conservan su color y permanecen quietas.",
          )}
        </div>
      )}
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {recipes.map((id, index) => (
          <EffectRecipe
            key={id}
            id={id}
            index={index}
            appearance={appearance}
          />
        ))}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        {l(
          "Pointer effects respond to a mouse or trackpad. Keyboard focus stays clear, and reduced motion keeps the composition calm.",
          "Los efectos de cursor responden al ratón o al panel táctil. El foco del teclado permanece claro y el movimiento reducido mantiene la composición serena.",
        )}
      </p>
    </div>
  );
}
