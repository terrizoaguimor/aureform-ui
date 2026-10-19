"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAppearance } from "@/components/appearance-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { palettePresets, type PaletteId } from "@/lib/appearance";
import { cn } from "@/lib/utils";

export function paletteDisplayName(
  palette: PaletteId,
  l: ReturnType<typeof useLanguage>["l"],
) {
  const names: Record<PaletteId, [string, string]> = {
    aurora: ["Aurora", "Aurora"],
    violet: ["Violet", "Violeta"],
    ocean: ["Ocean", "Océano"],
    mint: ["Mint", "Menta"],
    ember: ["Ember", "Brasa"],
    rose: ["Rose", "Rosa"],
  };
  return l(...names[palette]);
}

export function PalettePicker({
  value,
  onValueChange,
  compact = false,
  className,
}: {
  value?: PaletteId;
  onValueChange?: (value: PaletteId) => void;
  compact?: boolean;
  className?: string;
}) {
  const { l } = useLanguage();
  const { appearance, setAppearance } = useAppearance();
  const selected = value ?? appearance.palette;
  const choose = (id: PaletteId) => {
    if (onValueChange) {
      onValueChange(id);
      return;
    }
    const preset = palettePresets.find((item) => item.id === id);
    if (!preset) return;
    setAppearance((current) => ({
      ...current,
      palette: id,
      colors: {
        primary: preset.colors[0],
        secondary: preset.colors[1],
        tertiary: preset.colors[2],
      },
      gradient: {
        ...current.gradient,
        stops: current.gradient.stops.map((stop, index) => ({
          ...stop,
          color: preset.colors[index % preset.colors.length],
        })),
      },
    }));
  };

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-3 text-xs font-semibold">
        {l("Color palette", "Paleta de color")}
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {palettePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={selected === preset.id}
            onClick={() => choose(preset.id)}
            className={cn(
              "group relative min-h-16 min-w-0 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected === preset.id
                ? "border-primary bg-accent"
                : "border-border bg-surface hover:border-primary/50 hover:bg-surface-subtle",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mb-2 flex overflow-hidden rounded-md",
                compact ? "h-4" : "h-6",
              )}
            >
              {preset.colors.map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  className="flex-1"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span className="flex items-center justify-between gap-1 text-[11px] font-medium">
              <span className="truncate">
                {paletteDisplayName(preset.id, l)}
              </span>
              {selected === preset.id && (
                <Check
                  className="size-3 shrink-0 text-primary"
                  aria-hidden="true"
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function AppearanceControls({
  className,
  showLabel = true,
  studioHref,
}: {
  className?: string;
  showLabel?: boolean;
  studioHref?: string;
}) {
  const { l } = useLanguage();
  const { appearance, setAppearance, resetAppearance } = useAppearance();
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        render={
          <Button
            variant="ghost"
            size={showLabel ? "sm" : "icon-sm"}
            className={className}
            aria-label={l("Customize appearance", "Personalizar apariencia")}
          />
        }
      >
        <SlidersHorizontal aria-hidden="true" />
        {showLabel && l("Appearance", "Apariencia")}
      </DrawerTrigger>
      <DrawerContent
        closeLabel={l(
          "Close appearance controls",
          "Cerrar controles de apariencia",
        )}
        className="w-[min(400px,calc(100%-16px))] p-5 sm:p-6"
      >
        <div className="mb-7 pr-10">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
            {l("Your visual signature", "Tu identidad visual")}
          </p>
          <DrawerTitle className="text-xl font-semibold tracking-tight">
            {l("Make it yours.", "Hazlo tuyo.")}
          </DrawerTitle>
          <DrawerDescription className="mt-2 text-xs leading-6 text-muted-foreground">
            {l(
              "A few small changes. A whole new feel.",
              "Unos pequeños cambios. Una sensación nueva.",
            )}
          </DrawerDescription>
        </div>

        <div className="grid gap-6">
          <fieldset>
            <legend className="mb-3 text-xs font-semibold">
              {l("Theme", "Tema")}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(["dark", "light"] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  aria-pressed={appearance.theme === theme}
                  onClick={() =>
                    setAppearance((current) => ({ ...current, theme }))
                  }
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-lg border text-xs font-medium",
                    appearance.theme === theme
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-surface text-muted-foreground hover:bg-surface-subtle",
                  )}
                >
                  {theme === "dark" ? (
                    <Moon className="size-4" aria-hidden="true" />
                  ) : (
                    <Sun className="size-4" aria-hidden="true" />
                  )}
                  {theme === "dark" ? l("Dark", "Oscuro") : l("Light", "Claro")}
                </button>
              ))}
            </div>
          </fieldset>
          <PalettePicker compact />
          <Select
            label={l("Surface material", "Material de superficie")}
            value={appearance.material}
            onValueChange={(material) =>
              setAppearance((current) => ({
                ...current,
                material: material as typeof current.material,
              }))
            }
            options={[
              {
                value: "flat",
                label: l("Flat · clean and quiet", "Plano · limpio y sereno"),
              },
              {
                value: "elevated",
                label: l(
                  "Elevated · soft depth",
                  "Elevado · profundidad suave",
                ),
              },
              {
                value: "glass",
                label: l(
                  "Glass · light through layers",
                  "Cristal · luz entre capas",
                ),
              },
              {
                value: "gradient",
                label: l(
                  "Gradient · a touch of color",
                  "Degradado · un toque de color",
                ),
              },
            ]}
          />
          <Select
            label={l("Motion", "Movimiento")}
            value={appearance.motion}
            onValueChange={(motion) =>
              setAppearance((current) => ({
                ...current,
                motion: motion as typeof current.motion,
              }))
            }
            options={[
              { value: "off", label: l("Off", "Desactivado") },
              { value: "gentle", label: l("Gentle", "Suave") },
              { value: "expressive", label: l("Expressive", "Expresivo") },
            ]}
          />

          <Card
            appearance={appearance.material}
            className="overflow-hidden p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold">
                {l("A little preview", "Una pequeña vista previa")}
              </span>
              <Badge>{l("Live", "En vivo")}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">{l("Primary", "Principal")}</Button>
              <Button size="sm" variant="outline">
                {l("Secondary", "Secundario")}
              </Button>
            </div>
          </Card>

          <div className="grid gap-3 border-t border-border pt-5">
            {studioHref && (
              <Link
                href={studioHref}
                onClick={() => setOpen(false)}
                className={cn(buttonVariants(), "min-h-11 w-full")}
              >
                {l("Open Appearance Studio", "Abrir Estudio de Apariencia")}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAppearance}
              className="text-muted-foreground"
            >
              <RotateCcw aria-hidden="true" />
              {l("Reset appearance", "Restablecer apariencia")}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
