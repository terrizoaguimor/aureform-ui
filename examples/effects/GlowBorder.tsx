"use client";

import { useState } from "react";
import { GlowBorder } from "@/components/effects";

export default function GlowBorderExample() {
  const [selected, setSelected] = useState(false);

  return (
    <GlowBorder as="article" className="grid max-w-md gap-6 p-8">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]">
        <span
          aria-hidden="true"
          className="size-2 rounded-full bg-emerald-400"
        />
        A space of your own
      </div>
      <h2 className="text-3xl font-semibold tracking-tight">
        The studio collection.
      </h2>
      <p className="text-sm leading-7 text-muted-foreground">
        Thoughtfully made essentials for a clearer, more expressive product.
        Small details that make every day feel a little more considered.
      </p>
      <ul className="grid gap-3 text-sm">
        {[
          "A cohesive visual language",
          "Room for your own personality",
          "Details that feel good to use",
        ].map((item) => (
          <li key={item} className="flex items-center gap-3">
            <span aria-hidden="true" className="text-emerald-400">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => setSelected((value) => !value)}
        className="w-fit rounded-full border border-violet-400/30 px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
      >
        {selected ? "Collection selected" : "Choose this collection"}
      </button>
      <p role="status" className="text-xs text-muted-foreground">
        {selected
          ? "Added to your local shortlist."
          : "Make something that feels like you."}
      </p>
    </GlowBorder>
  );
}
