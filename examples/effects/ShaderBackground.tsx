"use client";

import { useState } from "react";
import { ShaderBackground, type ShaderKind } from "@/components/effects";

const scenes: { kind: ShaderKind; label: string; description: string }[] = [
  {
    kind: "aurora",
    label: "Aurora",
    description: "Soft curtains of northern light.",
  },
  {
    kind: "waves",
    label: "Waves",
    description: "Luminous ribbons, gently in motion.",
  },
  {
    kind: "iridescent",
    label: "Iridescent",
    description: "A shifting, pearlescent surface.",
  },
  {
    kind: "none",
    label: "Still",
    description: "A beautifully quiet color field.",
  },
];

export default function ShaderBackgroundExample() {
  const [kind, setKind] = useState<ShaderKind>("aurora");
  const [paused, setPaused] = useState(false);
  const selected = scenes.find((scene) => scene.kind === kind) ?? scenes[0];

  return (
    <div className="grid gap-5">
      <ShaderBackground
        kind={kind}
        paused={paused}
        className="min-h-96 rounded-3xl"
      >
        <div className="grid max-w-xl gap-6 p-8 sm:p-12">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-cyan-300"
            />
            Aureform studio
          </div>
          <h2 className="max-w-sm text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Give your ideas a little atmosphere.
          </h2>
          <p className="max-w-xs text-sm leading-7 text-slate-200">
            Expressive color. Considered movement. A calm space for everything
            that comes next.
          </p>
          <span className="w-fit rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-xs text-slate-100">
            {selected.description}
          </span>
        </div>
      </ShaderBackground>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-3 text-sm font-medium">
            Choose an atmosphere
          </legend>
          {scenes.map((scene) => (
            <button
              key={scene.kind}
              type="button"
              aria-pressed={kind === scene.kind}
              onClick={() => setKind(scene.kind)}
              className="rounded-full border border-violet-400/30 px-4 py-2 text-sm hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 aria-pressed:bg-violet-500/15"
            >
              {scene.label}
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          aria-pressed={paused}
          disabled={kind === "none"}
          onClick={() => setPaused((value) => !value)}
          className="rounded-full border border-violet-400/30 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 disabled:opacity-50"
        >
          {paused ? "Resume atmosphere" : "Pause atmosphere"}
        </button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {selected.label} selected{paused && kind !== "none" ? " · paused" : ""}.
      </p>
    </div>
  );
}
