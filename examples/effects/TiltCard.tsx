"use client";

import { useId } from "react";
import { TiltCard } from "@/components/effects";

export default function TiltCardExample() {
  const detailsId = useId();

  return (
    <div className="grid max-w-md gap-6">
      <TiltCard asChild className="block p-8">
        <a href={`#${detailsId}`}>
          <div
            aria-hidden="true"
            className="relative mb-8 flex h-40 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/25 via-cyan-400/10 to-emerald-400/20"
          >
            <span className="absolute size-28 rounded-full border border-cyan-300/50" />
            <span className="absolute size-20 rounded-full border border-emerald-300/50" />
            <span className="size-12 rounded-full bg-gradient-to-br from-violet-400 to-cyan-300 shadow-lg shadow-violet-500/30" />
          </div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Featured collection
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Objects in orbit.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Quiet geometry. Unexpected color. A collection built around the
            pleasure of small discoveries.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">
            Explore the collection <span aria-hidden="true">↗</span>
          </span>
        </a>
      </TiltCard>
      <section
        id={detailsId}
        aria-label="About Objects in orbit"
        className="scroll-mt-8 rounded-xl border border-violet-400/20 p-5"
      >
        <p className="text-sm leading-7">
          Objects in orbit pairs three simple circles with Aureform&apos;s
          violet, cyan and emerald palette. The entire card is a native link,
          ready for pointer or keyboard navigation.
        </p>
      </section>
    </div>
  );
}
