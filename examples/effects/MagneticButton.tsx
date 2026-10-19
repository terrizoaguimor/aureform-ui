"use client";

import { useState } from "react";
import { MagneticButton } from "@/components/effects";

export default function MagneticButtonExample() {
  const [ideas, setIdeas] = useState(0);

  return (
    <div className="grid justify-items-start gap-5 py-4">
      <div className="grid gap-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Follow a little curiosity.
        </h2>
        <p className="max-w-sm text-sm leading-7 text-muted-foreground">
          Good ideas start with one small move. Save a spark for your next
          project.
        </p>
      </div>
      <MagneticButton onClick={() => setIdeas((value) => value + 1)}>
        Collect inspiration
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="size-4"
        >
          <path
            d="M5 12h14m-6-6 6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </MagneticButton>
      <p role="status" className="text-sm text-muted-foreground">
        {ideas === 0
          ? "Your inspiration collection starts here."
          : `${ideas} ${ideas === 1 ? "idea" : "ideas"} collected in this example.`}
      </p>
      {ideas > 0 && (
        <button
          type="button"
          onClick={() => setIdeas(0)}
          className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
        >
          Clear the collection
        </button>
      )}
    </div>
  );
}
