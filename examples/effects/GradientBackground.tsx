"use client";

import { useState } from "react";
import { GradientBackground, type GradientKind } from "@/components/effects";

const kinds: { kind: GradientKind; label: string }[] = [
  { kind: "mesh", label: "Mesh" },
  { kind: "linear", label: "Linear" },
  { kind: "radial", label: "Radial" },
];

export default function GradientBackgroundExample() {
  const [kind, setKind] = useState<GradientKind>("mesh");

  return (
    <div className="grid gap-5">
      <GradientBackground kind={kind} className="min-h-80 rounded-3xl">
        <div className="grid max-w-xl gap-5 p-8 sm:p-12">
          <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            A fresh point of view
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Room for a brighter idea.
          </h2>
          <p className="max-w-sm text-sm leading-7 text-slate-200">
            A quiet wash of violet, cyan and emerald gives your next story a
            beautiful place to begin.
          </p>
        </div>
      </GradientBackground>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-3 text-sm font-medium">
          Choose a composition
        </legend>
        {kinds.map((item) => (
          <button
            key={item.kind}
            type="button"
            aria-pressed={kind === item.kind}
            onClick={() => setKind(item.kind)}
            className="rounded-full border border-violet-400/30 px-4 py-2 text-sm transition-colors hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 aria-pressed:bg-violet-500/15"
          >
            {item.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
