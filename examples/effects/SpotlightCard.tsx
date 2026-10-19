"use client";

import { useState } from "react";
import { SpotlightCard } from "@/components/effects";

export default function SpotlightCardExample() {
  const [pinned, setPinned] = useState(false);

  return (
    <SpotlightCard as="article" className="grid max-w-md gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium">
          Studio notes
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="size-5 text-cyan-400"
        >
          <path
            d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <div className="grid gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          A considered workspace.
        </h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Keep the decisions that matter close. Make space for the next good
          idea, and let the rest fall into place.
        </p>
      </div>
      <button
        type="button"
        aria-pressed={pinned}
        onClick={() => setPinned((value) => !value)}
        className="w-fit rounded-full border border-violet-400/30 px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
      >
        {pinned ? "Unpin these notes" : "Pin these notes"}
      </button>
      <p role="status" className="text-xs text-muted-foreground">
        {pinned
          ? "Your notes are pinned in this example."
          : "Ready when inspiration arrives."}
      </p>
    </SpotlightCard>
  );
}
