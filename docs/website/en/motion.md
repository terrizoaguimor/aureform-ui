# Motion and effects

Aureform's motion system adds finite entrances to ordinary content. GSAP manages scoped animations; Lenis supplies optional smooth scrolling. Appearance settings and the operating system's reduced-motion preference control whether movement runs.

## Add a scoped entrance

1. Install `motion-system` through the [local CLI](cli.md), then install the merged dependencies in the consumer.
2. Include the kit's global and effect styles.
3. Render `MotionSystem` beneath `AppearanceProvider`, or beneath the full suite's `Providers`.

```tsx
"use client";

import { AppearanceProvider } from "@/components/appearance-provider";
import { MotionSystem } from "@/components/motion-system";

export default function MotionExample() {
  return (
    <AppearanceProvider>
      <MotionSystem>
        <main className="mx-auto max-w-3xl p-6">
          <h1 data-motion="intro">A clear place to begin</h1>
          <section data-motion="reveal">
            <h2>Your next workflow</h2>
            <p>This content remains visible before animation.</p>
          </section>
        </main>
      </MotionSystem>
    </AppearanceProvider>
  );
}
```

`data-motion="intro"` marks initial entrances; `data-motion="reveal"` marks viewport entrances. Each target enters at most once per mounted wrapper. These animations preserve opacity and restore original inline styles. Content remains visible in server HTML and without application JavaScript.

## Choose the appropriate motion level

Appearance supports `off`, `gentle` and `expressive`. System reduced motion overrides the requested level. Focusing a marked element restores it and its marked ancestors immediately.

Keep independently animated transforms, fixed overlays and sticky navigation on separate elements. The wrapper uses `display: contents`; put padding, backgrounds and layout classes on children rather than relying on its own box.

## Keep application scrolling native

`smoothScroll` defaults to `false`. Enable it only for a landing experience with one smooth-scroll owner per window. Lenis starts only with enabled motion, a fine pointer and no reduced-motion request.

Touch navigation, dialogs, textareas, source blocks and `data-lenis-prevent` regions retain native scrolling. Live preference changes and unmount clean up animations, observers, listeners and the scrolling runtime.

## Compose reusable effects

The six effects are `GradientBackground`, `ShaderBackground`, `SpotlightCard`, `GlowBorder`, `TiltCard` and `MagneticButton`. Their source contracts differ: use the documented props and composition rather than applying one generic slot API to all primitives.

The shader includes a static fallback; decorative motion must not carry essential information. Review effects in both themes and with motion disabled after changing colors. See the [runtime contract](../../../docs/motion-runtime.md), [complete example](../../../examples/MotionSystem.tsx), [effect contracts](../../../docs/effects.es.md) and [shader guide](../../../docs/shaders.md) for deeper integration.
