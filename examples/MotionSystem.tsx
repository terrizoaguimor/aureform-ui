"use client";

import { MotionSystem } from "@/components/motion-system";
import { Button } from "@/components/ui/button";

export default function MotionSystemExample() {
  return (
    <MotionSystem>
      <main className="mx-auto max-w-3xl p-6">
        <header data-motion="intro" className="mb-8">
          <h1 className="editorial text-5xl">A considered beginning.</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Subtle movement, shared depth and a clear next action.
          </p>
        </header>
        <section
          data-motion="reveal"
          className="af-surface-gradient af-shadow-soft rounded-xl border border-border p-6"
        >
          <h2 className="text-sm font-semibold">
            Make room for your next idea.
          </h2>
          <p className="my-4 text-sm text-muted-foreground">
            This content is visible before JavaScript loads and respects reduced
            motion.
          </p>
          <Button onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}>
            Back to the beginning
          </Button>
        </section>
      </main>
    </MotionSystem>
  );
}
