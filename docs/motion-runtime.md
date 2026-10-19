# Motion runtime — Aureform 1.1

`src/components/motion-system.tsx` exports a React Client component:

```tsx
MotionSystem({
  children,
  smoothScroll = false,
  className,
}: {
  children: ReactNode;
  smoothScroll?: boolean;
  className?: string;
});
```

It imports `gsap`, `lenis`, `lenis/dist/lenis.css` and `useAppearance`. The kit includes GSAP 3.15.0 and Lenis 1.3.27 in its dependency manifest and lockfile. The local CLI resolves the runtime, appearance provider and their dependencies:

```sh
node bin/aureform.mjs add motion-system --cwd ../my-product
pnpm --dir ../my-product install
```

The same component is available as `public/r/motion-system.json` for the official shadcn installer. [MotionSystem.tsx](../examples/MotionSystem.tsx) provides a complete usage example.

## Integration

```tsx
import { MotionSystem } from "@/components/motion-system";
import { AppearanceProvider } from "@/components/appearance-provider";

export function Landing() {
  return (
    <AppearanceProvider>
      <MotionSystem smoothScroll>
        <main>
          <header>
            <p data-motion="intro">Aureform UI</p>
            <h1 data-motion="intro">
              Refined interfaces for ambitious products.
            </h1>
            <a className="inline-flex" data-motion="intro" href="#collection">
              Explore the collection
            </a>
          </header>
          <section id="collection" data-motion="reveal">
            {/* Ordinary, fully visible content. */}
          </section>
          <pre data-lenis-prevent>{/* Scrollable source example. */}</pre>
        </main>
      </MotionSystem>
    </AppearanceProvider>
  );
}
```

Use the default `smoothScroll={false}` for application screens. Enable it on the landing only, with one smooth-scroll owner per window. Nested motion wrappers manage their own markers. React portals retain native scrolling.

The wrapper uses `display: contents`; it creates no layout box and is never animated. `className` can supply inherited styles or selectors, but padding, backgrounds, dimensions, and layout classes belong on a child.

## Entrance behavior

The appearance provider controls Off, Gentle and Expressive. The full suite’s `Providers` includes it; a standalone consumer wraps MotionSystem in AppearanceProvider. System reduced-motion preference overrides the requested level. Current 1.1 motion QA passes 14 scenarios / 74 checks with zero errors; [verification](verification.md) records that report separately from historical 1.0 evidence.

| Marker                 | Gentle                                        | Expressive                       |
| ---------------------- | --------------------------------------------- | -------------------------------- |
| `data-motion="intro"`  | 8 px / 420 ms; 45 ms stagger capped at 135 ms | 16 px / 640 ms; same stagger     |
| `data-motion="reveal"` | 10 px / 460 ms on viewport entry              | 20 px / 640 ms on viewport entry |

Off and reduced motion leave content static and do not enable Lenis.

Both use `power2.out` and preserve the element's initial vertical transform. Content stays at its original opacity throughout. Server HTML, hydration, disabled JavaScript, and elements awaiting viewport entry remain visible and usable. Reveal observation uses the browser's `IntersectionObserver`; ScrollTrigger is unnecessary for these finite entrances.

Each element enters at most once during the wrapper's mounted lifetime, including live media-query changes. A mutation observer registers markers added by client navigation or conditional rendering and releases removed targets. Without `IntersectionObserver`, reveals remain in their original visible state.

Focus within a marked element immediately restores that element and every marked ancestor to their original inline styles. Already focused content skips its entrance. Apply markers to ordinary content containers; keep independently animated transforms, fixed overlays, and sticky chrome on separate elements. There is no pinning, parallax, scaling, rotation, looping, or 3D transform.

The component uses a ref-scoped [`gsap.matchMedia`](<https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/>). Observer callbacks enter its context through a named callback, following [GSAP's context lifecycle](<https://gsap.com/docs/v3/GSAP/gsap.context()/>).

## Smooth scrolling and cleanup

Lenis is created only when `smoothScroll` is true, appearance motion is enabled, the primary pointer is fine, and `prefers-reduced-motion` is `no-preference`. Its settings include `anchors: true`, `syncTouch: false`, `autoRaf: false`, finite scrolling, and native nested scrolling. Wheel events are listened for on the wrapper; touch, Ctrl/Shift gestures, dialogs, alert dialogs, `pre`, textareas, selects, editable content, and `data-lenis-prevent` regions keep native scrolling.

The GSAP ticker drives Lenis in milliseconds. Keyboard scrolling and focus changes, including focus in a portalled dialog, settle current inertia without cancelling native events. A previously active Lenis instance is not replaced. These choices follow the [official Lenis options and integration guidance](https://github.com/darkroomengineering/lenis#settings).

Live reduced-motion changes revert active entrances, destroy Lenis, and remove its ticker callback and document listeners. Pointer changes also create or destroy Lenis as appropriate. Unmount performs the same cleanup, disconnects both observers, removes the scoped focus listener, and reverts the GSAP match-media context. Completed entrances restore their original inline styles. No global ticker settings, scroll methods, or GSAP defaults are patched.

## Runtime hooks

The wrapper exposes `data-motion-system` for ownership and these observable states:

| Attribute            | Values                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `data-motion-mode`   | `static` in server HTML or without media-query support; `animated` while entrances are enabled; `reduced` when motion is reduced. |
| `data-smooth-scroll` | `native` by default; `lenis` only while this wrapper owns an active Lenis instance.                                               |

The hooks describe the installed runtime, not merely the requested prop. Light/Dark changes do not reset motion. Changing the appearance motion level reconfigures and cleans up the runtime through its effect dependency.

Run `pnpm verify:motion` against a production preview to check actual entrances, scrolling, anchors, keyboard focus, hover, theme changes, mobile pointers and live reduced-motion cleanup. The [motion verification guide](motion-verification.md) explains the 14 scenarios and the separate measurement used for accessibility of server-rendered pages with application JavaScript disabled.
