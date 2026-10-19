"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  GradientBackground,
  ShaderBackground,
  SpotlightCard,
  GlowBorder,
  TiltCard,
  MagneticButton,
  type ShaderBackgroundProps,
} from "@/components/effects";
import {
  GradientBackgroundExample,
  ShaderBackgroundExample,
  SpotlightCardExample,
  GlowBorderExample,
  TiltCardExample,
  MagneticButtonExample,
} from "../index";

export type HarnessMode =
  "shader" | "gallery" | "interactions" | "examples" | "defaults";
type Scope = {
  motion?: "off" | "gentle" | "expressive";
  colors?: [string, string, string];
};

declare global {
  interface Window {
    afxHarness?: {
      patchShader: (patch: ShaderBackgroundProps) => void;
      setMounted: (mounted: boolean) => void;
      setScope: (scope: Scope) => void;
      refTag: () => string | undefined;
    };
  }
}

export default function EffectsVerificationHarness({
  mode = "shader",
}: {
  mode?: HarnessMode;
}) {
  const [mounted, setMounted] = useState(true);
  const [shader, setShader] = useState<ShaderBackgroundProps>({});
  const [scope, setScope] = useState<Scope>({});
  const [clicks, setClicks] = useState(0);
  const [childClicks, setChildClicks] = useState(0);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const api = {
      patchShader: (patch: ShaderBackgroundProps) =>
        setShader((previous) => ({ ...previous, ...patch })),
      setMounted,
      setScope,
      refTag: () => linkRef.current?.tagName,
    };
    window.afxHarness = api;
    return () => {
      if (window.afxHarness === api) delete window.afxHarness;
    };
  }, []);

  const scopeStyle = scope.colors
    ? ({
        "--af-color-primary": scope.colors[0],
        "--af-color-secondary": scope.colors[1],
        "--af-color-tertiary": scope.colors[2],
      } as CSSProperties)
    : undefined;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-cyan-300">
            Aureform UI 1.1
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            A little atmosphere.
          </h1>
        </div>
        <p className="text-sm text-slate-400">
          Original effects · local verification
        </p>
      </header>
      <div
        data-testid="scope"
        data-motion-level={scope.motion}
        style={scopeStyle}
        className="grid gap-8"
      >
        {mounted && mode === "shader" && (
          <ShaderBackground {...shader} className="min-h-[420px] rounded-3xl">
            <div className="grid max-w-lg gap-6 p-10">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-200">
                The next good idea
              </p>
              <h2 className="max-w-sm text-5xl font-semibold tracking-tight text-white">
                Make room for possibility.
              </h2>
              <p className="max-w-xs text-sm leading-7 text-slate-200">
                Expressive color. Considered movement. Small details that make
                every day feel a little more beautiful.
              </p>
            </div>
          </ShaderBackground>
        )}
        {mounted && mode === "gallery" && (
          <div className="grid gap-5 md:grid-cols-3">
            {(["aurora", "waves", "iridescent"] as const).map((kind) => (
              <ShaderBackground
                key={kind}
                kind={kind}
                className="min-h-[420px] rounded-3xl"
              >
                <div className="flex min-h-[420px] flex-col justify-end gap-3 p-7">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-200">
                    Original Aureform
                  </p>
                  <h2 className="text-3xl font-semibold capitalize text-white">
                    {kind}
                  </h2>
                  <p className="text-sm text-slate-200">
                    Violet. Cyan. Emerald.
                  </p>
                </div>
              </ShaderBackground>
            ))}
          </div>
        )}
        {mounted && mode === "interactions" && (
          <div className="grid gap-6 md:grid-cols-2">
            <SpotlightCard as="article" data-testid="spotlight">
              <h2 className="mb-3 text-xl font-semibold">
                A considered workspace.
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                A quiet highlight follows a fine pointer.
              </p>
              <label htmlFor="notes" className="block text-sm">
                Project notes
              </label>
              <input
                id="notes"
                defaultValue="Keep the important ideas close."
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/20 p-3 text-sm"
              />
              <button
                type="button"
                className="mt-4 rounded-full border border-white/20 px-4 py-2"
                onClick={() => setClicks((count) => count + 1)}
              >
                Pin notes
              </button>
            </SpotlightCard>
            <TiltCard asChild data-testid="tilt" ref={linkRef}>
              <a href="#details" className="grid gap-4">
                <div
                  aria-hidden="true"
                  className="h-20 rounded-lg bg-gradient-to-r from-violet-500/25 via-cyan-400/20 to-emerald-400/20"
                />
                <h2 className="text-xl font-semibold">Objects in orbit.</h2>
                <p className="text-sm text-muted-foreground">
                  A native link with a considered perspective.
                </p>
                <span className="text-sm underline underline-offset-4">
                  Explore the collection ↗
                </span>
              </a>
            </TiltCard>
            <GlowBorder data-testid="glow" className="grid gap-4">
              <h2 className="text-xl font-semibold">The studio collection.</h2>
              <p className="text-sm text-muted-foreground">
                A luminous, slowly orbiting rim.
              </p>
              <button
                type="button"
                className="w-fit rounded-full border border-white/20 px-4 py-2"
              >
                Choose this collection
              </button>
            </GlowBorder>
            <div className="grid content-center justify-items-start gap-6">
              <MagneticButton
                data-testid="magnetic"
                onClick={() => setClicks((count) => count + 1)}
              >
                Collect inspiration →
              </MagneticButton>
              <MagneticButton
                data-testid="magnetic-link"
                asChild
                onClick={() => setClicks((count) => count + 1)}
              >
                <a
                  href="#details"
                  onClick={() => setChildClicks((count) => count + 1)}
                >
                  Visit the collection ↗
                </a>
              </MagneticButton>
              <MagneticButton data-testid="disabled" disabled>
                Unavailable action
              </MagneticButton>
            </div>
            <section id="details" className="scroll-mt-8">
              <h2 className="text-lg font-semibold">Collection details</h2>
              <p className="text-sm text-muted-foreground">
                Native selection, navigation and scrolling remain available.
              </p>
              <output data-testid="clicks" className="block">
                Outer actions: {clicks}
              </output>
              <output data-testid="child-clicks" className="block">
                Child actions: {childClicks}
              </output>
            </section>
          </div>
        )}
        {mounted && mode === "defaults" && (
          <div className="grid gap-6">
            <GradientBackground>
              <p className="p-6">Default gradient</p>
            </GradientBackground>
            <ShaderBackground>
              <p className="p-6">Default shader</p>
            </ShaderBackground>
            <SpotlightCard>Default spotlight</SpotlightCard>
            <GlowBorder>Default glow</GlowBorder>
            <TiltCard>Default tilt</TiltCard>
            <MagneticButton>Default magnetic button</MagneticButton>
          </div>
        )}
        {mounted && mode === "examples" && (
          <div className="grid gap-12">
            <GradientBackgroundExample />
            <ShaderBackgroundExample />
            <SpotlightCardExample />
            <GlowBorderExample />
            <TiltCardExample />
            <MagneticButtonExample />
          </div>
        )}
      </div>
    </main>
  );
}
