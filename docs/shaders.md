# Aureform UI 1.1 effects and original shaders

The six reusable effects live in [`src/components/effects`](../src/components/effects/index.ts). They require React and the kit's existing Tailwind utilities, but **no AppearanceProvider, GSAP ticker, Lenis instance, network asset or new package**. Each component directly imports [`effects.css`](../src/components/effects/effects.css), so a registry dependency closure contains its mechanics.

```tsx
import {
  GradientBackground,
  ShaderBackground,
  SpotlightCard,
  GlowBorder,
  TiltCard,
  MagneticButton,
} from "@/components/effects";

<ShaderBackground>
  <div className="max-w-lg p-10">
    <h1 className="text-4xl font-semibold text-white">
      Make room for possibility.
    </h1>
    <p className="mt-4 text-sm leading-7 text-slate-200">
      A considered space for your next good idea.
    </p>
  </div>
</ShaderBackground>;
```

## Public API

All effects have useful defaults. All accept `className` and `children`. Backgrounds use a dark ink surface, a permanently rendered color field, a legibility scrim and a separate content layer. Their default minimum height is 16rem; override it with Tailwind such as `min-h-96` or `min-h-0`. Decorative layers never receive pointer events. The canvas is `aria-hidden` and has no tab stop.

| Component            | Options and defaults                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GradientBackground` | `kind?: "linear" \| "radial" \| "mesh"` = `"mesh"`; `colors?: string[]`; `angle?: number` = `135`; `intensity?: number` = `.55`                                                                       |
| `ShaderBackground`   | `kind?: "aurora" \| "waves" \| "iridescent" \| "none"` = `"aurora"`; `colors?: string[]`; `speed?: number` = `.2`; `scale?: number` = `1`; `intensity?: number` = `.55`; `paused?: boolean` = `false` |
| `SpotlightCard`      | `spotlightColor?: string` = scoped primary / violet; `radius?: number` = `320` px; `intensity?: number` = `.22`                                                                                       |
| `GlowBorder`         | `colors?: string[]`; `borderWidth?: number` = `1.5` px; `duration?: number` = `12` seconds per orbit                                                                                                  |
| `TiltCard`           | `maxTilt?: number` = `6` degrees; `perspective?: number` = `900` px                                                                                                                                   |
| `MagneticButton`     | Native button props; `strength?: number` = `.18`; `maxDistance?: number` = `10` px; `asChild?: boolean` = `false`; `type` defaults to `"button"`                                                      |

Cards accept ordinary HTML attributes, `style`, a forwarded `ref`, `as?: "div" | "article" | "section"` and `asChild?: boolean`. `asChild` requires one native element or ref-forwarding component. Its semantics, handlers, classes, styles and ref are preserved. There is no artificial button role or tab stop on a static card.

```tsx
<TiltCard asChild>
  <a href="/collection">Explore the collection</a>
</TiltCard>

<SpotlightCard as="article">
  <h2>A quiet place to work.</h2>
  <button type="button">Pin these notes</button>
</SpotlightCard>

<MagneticButton asChild>
  <a href="/studio">Open the studio</a>
</MagneticButton>
```

The first three color entries are used; missing entries resolve `--af-color-primary`, `--af-color-secondary`, `--af-color-tertiary`, with original fallbacks `#8B5CF6`, `#22D3EE`, `#34D399`. Explicit CSS colors override these, including hex, RGB, HSL, named colors and scoped CSS variables. Browser color resolution converts shader colors to normalized RGB. Invalid explicit shader colors fall back to the original corresponding color.

Shader speed is clamped to `[0, 1]`, scale to `[.25, 4]`, intensity to `[0, 1]`. Non-finite values use the defaults. Speed zero or `paused` keeps an already rendered frame and otherwise shows the CSS field. Intensity zero and `kind="none"` never initialize a renderer. `"none"` retains the attractive static field.

## Motion, visibility and cleanup

GPU initialization waits until the host intersects the viewport, the document and host are visible and motion is permitted. The shader module is dynamically imported at that point; compilation is scheduled during an idle period when that API is available. Pending idle work is canceled when eligibility changes, and visibility is checked again before importing and allocating the renderer. A paused, reduced-motion, hidden or offscreen initial render allocates no WebGL context.

The nearest ancestor with `[data-motion-level]`, including the host itself, supplies the local motion setting. If none exists, the document root supplies it. `"off"` disables motion; other values allow it, subject to `prefers-reduced-motion: reduce`. A local scope can permit motion beneath a globally disabled scope; reduced motion and forced colors always take precedence. No provider or context read is required. Attribute observers and `aureform:appearance-change` keep global and scoped settings current; palette variables are read from the actual host scope, not from event detail. Style, class, hidden and open attribute changes on the host's ancestry also update visibility, including `visibility: hidden`, zero opacity and `content-visibility: hidden` where the browser supports visibility checking.

Each shader owns its RAF loop. Actual GPU draws are spaced at least **1/30 second** apart, including irregular RAF timing and rapid pause/resume; missed frames are never caught up. Device-pixel ratio is capped at **1.5**, with at most **1,300,000 drawing-buffer pixels** and a **2048 px maximum dimension**. CSS size remains full resolution. Time advances only while running, with a 100ms maximum delta per tick to avoid jumps. Pause/resume preserves the phase; prop changes update uniforms without recompiling. Kind changes replace the canvas and program.

Out-of-view hosts, CSS-hidden hosts and hidden documents cancel the shader RAF rather than merely skipping draws. The glow border's CSS animation also pauses and uses steps at no more than 30 changes per second. Tilt and magnetism are permitted only for hover-capable fine pointers; text entry, selection/dragging, pointer down/cancel, focus, scroll, disabled controls and preference changes settle their transforms. Pointer updates are coalesced and limited to 30 writes per second without rerendering React; native CSS transitions can interpolate between these writes. The environment observer ignores effects-owned pointer variable writes to avoid observation feedback. No effect calls pointer capture, prevents a pointer event, sets touch-action, intercepts wheel events or takes over scrolling.

WebGL2 absence, allocation/compile/link failure and context loss immediately reveal the already rendered CSS mesh. The context-loss listener permits restoration; the restored context lazily rebuilds the program when motion and visibility allow it. Active resize uses a static fallback until the next permitted draw. A paused, hidden or offscreen renderer defers buffer resize until it resumes, preserving its frozen frame. Cleanup cancels pending idle work and RAF, removes media/window/canvas listeners, disconnects observers, deletes the program, shaders and vertex array, shrinks an available drawing buffer to one pixel, and discards the color-conversion canvas. Failure during initial color resolution also releases the allocated program and vertex array. Forced context loss is deliberately avoided because React Strict Mode can reuse a canvas.

The dark scrim reduces contrast variation behind white text. Keyboard focus outlines are independent of motion. Reduced motion preserves static color and focus cues. In forced-colors mode, native system colors and outlines replace decoration. Application authors should still choose legible foreground colors and retain meaningful labels for their own content.

## QA hooks

`ShaderBackground` exposes these attributes on its outer element and canvas:

| Attribute                      | Meaning                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `data-shader-kind`             | `aurora`, `waves`, `iridescent`, or `none`                                                                           |
| `data-shader-state="loading"`  | A visible, eligible shader is awaiting lazy initialization or the first draw into a new or resized buffer             |
| `data-shader-state="running"`  | The renderer has produced a frame and its RAF is active                                                              |
| `data-shader-state="paused"`   | Paused prop, zero speed, hidden document or out-of-view host                                                         |
| `data-shader-state="fallback"` | SSR static field, unavailable WebGL2 or context loss                                                                 |
| `data-shader-state="off"`      | Kind none, motion disabled, reduced motion, forced colors or zero intensity                                          |
| `data-shader-frame`            | Draw count for this kind's current mounted lifetime, starting at `0`; continues across pause and context restoration |

The `"none"` kind has no canvas. DOM attributes are updated without a React render per frame. For QA, compare counts over a time interval, allow one boundary frame, and inspect both state and count; a CSS-only field is intentionally a complete visual outcome.

## GLSL source and WGSL handoff

**The exact original source is [`shaders.ts`](../src/components/effects/shaders.ts).** It exports `shaderVertexSource`, `shaderCommonSource`, `auroraFragmentSource`, `wavesFragmentSource`, `iridescentFragmentSource`, and `shaderFragmentSources`. Each complete fragment string includes the shared source. [`shader-runtime.ts`](../src/components/effects/shader-runtime.ts) is the reference for uniform uploads and resource ownership. Do not import shader strings through the component barrel; keeping the source module separate preserves lazy loading.

```ts
import {
  shaderVertexSource,
  shaderCommonSource,
  shaderFragmentSources,
} from "@/components/effects/shaders";

const completeAuroraGLSL = shaderFragmentSources.aurora;
```

All three shaders are texture-free, deterministic GLSL ES 3.00. A full-screen triangle comes from `gl_VertexID`; there are no mesh buffers, samplers or derivatives.

| Uniform       | GLSL type | Reference value / units                                                                     |
| ------------- | --------- | ------------------------------------------------------------------------------------------- |
| `uResolution` | `vec2`    | Actual drawing-buffer width and height in pixels                                            |
| `uTime`       | `float`   | Accumulated active seconds × speed; starts at `0`, advances continuously when speed changes |
| `uScale`      | `float`   | `1`; higher values zoom out to expose more folds/ribbons                                    |
| `uIntensity`  | `float`   | `.55`; multiplies light before tone mapping                                                 |
| `uColorA`     | `vec3`    | `(139, 92, 246) / 255`, violet                                                              |
| `uColorB`     | `vec3`    | `(34, 211, 238) / 255`, cyan                                                                |
| `uColorC`     | `vec3`    | `(52, 211, 153) / 255`, emerald                                                             |

Coordinate and color conventions:

```glsl
vec2 uv = gl_FragCoord.xy / uResolution;
vec2 p = (2.0 * gl_FragCoord.xy - uResolution)
       / max(min(uResolution.x, uResolution.y), 1.0) * uScale;
```

GLSL's fragment origin is **bottom left**. For a WGSL fill whose pixel origin is top left, pass `vec2f(position.x, resolution.y - position.y)` into the equivalent scene functions. This preserves aurora direction, lighting and static grain orientation. Use the fill's actual pixel dimensions; do not normalize each axis independently because that would stretch the forms.

The palette weights are `(.5 + .5 × cos([0, 2π/3, 4π/3] + phase))²`, normalized by their sum. They blend the supplied RGB colors rather than introducing unrelated rainbow hues. RGB values are supplied in normalized **sRGB numeric space**, with no explicit linearization in this reference implementation.

The shared finish adds ink `(0.018, 0.023, 0.052)`, multiplies light by intensity and a soft vignette, then maps `color` to `1 − exp(−1.28 × color)`. A fixed spatial hash adds at most `.004` RGB grain. Alpha is always `1`. The browser separately overlays the dark legibility scrim from `effects.css`; reproduce that overlay in Figma if matching the complete surface rather than the raw fill.

| Kind         | Construction                                                                                                                                                           | Distinctive appearance                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `aurora`     | Three Gaussian vertical curtains; diagonal shear `p.x += .22 × p.y`; 4-octave value noise warps each center; narrow sinusoidal filaments; broad bloom and upward drape | Layered violet/cyan/emerald northern-light curtains on deep ink |
| `waves`      | Three horizontal Gaussian ribbons; slope `p.y += .16 × p.x`; two sine swells per lane; paired thin luminous edges and fine engraved contours                           | Smooth, overlapping spectral ribbons with sharply lit edges     |
| `iridescent` | Analytic crossed sine folds, gently warped domain, approximate analytic surface normal, diffuse key light, narrow pearl specular, Fresnel tint and subtle contours     | A flowing, pearlescent folded material with clean highlights    |

WGSL translation details:

- Use `fract`, `floor`, `mix`, `smoothstep`, `exp`, `pow`, `normalize`, `dot` and `clamp` with matching scalar/vector types.
- GLSL `mat2(1.67, 1.12, -1.12, 1.67)` is column-major: WGSL `mat2x2f(vec2f(1.67, 1.12), vec2f(-1.12, 1.67))`.
- Copy `hash21` exactly, including the `q.yzx` swizzle and constants. Fixed grain uses pixel coordinates, while curtain noise uses scene coordinates.
- Use fixed loops of 4 noise octaves and 3 curtains/ribbons. Cast loop indices to `f32`.
- The iridescent normal uses derivatives with respect to the warped `q` field as written. Preserve this artistic approximation rather than adding domain-warp derivatives if seeking the same look.
- Supply the three color vectors, size, time, scale and intensity from the fill API. The GLSL source uses separate uniforms; use the actual Figma fill interface when packing WGSL parameters.
- If the target is an sRGB attachment with automatic linear-to-sRGB conversion, account for that conversion once so the displayed values match this sRGB-numeric reference.

Complete Figma fill sidecars are available for [Waves](../.figma/shaders/waves/main.ts) and [Iridescent](../.figma/shaders/iridescent/main.ts). Each uses the `defineProperties` SDK contract, five `vec4f` uniform slots (80 bytes), a 96-byte fullscreen quad and a pipeline built for the actual output format. Both expose the same three palette controls, speed, scale, intensity and pause. The absolute millisecond frame clock is converted to seconds and frozen while paused. Their source reads time and no mouse input, so upload metadata must use `isAnimated: true` and `usesMouse: false`. The files contain no DOM access or fill-input sampling; upload the exact file content as `main.ts`.

## Complete copyable examples

Each file below has its Client directive, all imports, a named default component and its own local state, labels, handlers and original content. Copy the entire file into an App Router page or Client component. No other example or appearance provider is needed.

- [GradientBackground](../examples/effects/GradientBackground.tsx) — switch among three static compositions.
- [ShaderBackground](../examples/effects/ShaderBackground.tsx) — switch all shader kinds and pause/resume.
- [SpotlightCard](../examples/effects/SpotlightCard.tsx) — an article with a native pin action.
- [GlowBorder](../examples/effects/GlowBorder.tsx) — an orbiting rim and a local shortlist action.
- [TiltCard](../examples/effects/TiltCard.tsx) — compose onto a native collection link.
- [MagneticButton](../examples/effects/MagneticButton.tsx) — a native button with a local idea counter.

The bounded checks typecheck the effects and examples, lint their TypeScript and verification scripts, exercise actual draw spacing with a deterministic clock, verify the registry dependency closure, and hydrate an isolated SSR harness. Browser checks cover all shader kinds, lazy allocation gates, pending idle cancellation, scoped motion and colors, hidden/offscreen suspension, dormant resize, context loss/restoration, resource cleanup, semantic composition, pointer cadence, reduced motion, forced colors and working example controls with axe.

Run them using existing dependencies and a temporary artifact directory:

```sh
AUREFORM_EFFECTS_DEPS=/tmp/aureform-ui-build \
AUREFORM_EFFECTS_ARTIFACTS=/tmp/aureform-effects-verification \
node examples/effects/verification/verify.mjs
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, `PLAYWRIGHT_FIREFOX_EXECUTABLE` and `PLAYWRIGHT_WEBKIT_EXECUTABLE` when selecting existing browser binaries. Chromium exercises software WebGL2 through ANGLE SwiftShader. Firefox and WebKit check their native headless WebGL2 availability and, when available, render all three shader kinds, measure the draw cap and verify pause. Both also exercise live pointer effects, keyboard and native control semantics, scoped motion, reduced motion and all six example controls with axe. The visibility-change check simulates the document visibility event; it does not claim coverage of operating-system tab suspension. Hardware GPU performance and Figma's hosted shader compiler require their own integration checks.

The isolated October 18, 2026 pass completed all 21 grouped checks with Chromium 156.0.8078.4, Firefox 155.0 and WebKit 27.2. All three engines rendered every shader kind within the 30 FPS cap. The six examples had zero axe violations in each engine, and tracked application resources returned to zero after unmount. Both WGSL sidecars also compiled and rendered in local WebGPU: at 320 × 192 pixels, time 7.5 seconds, speed `.2`, scale `1.2` and intensity `.6`, comparison with the original GLSL had a mean RGB channel difference below `.08` on the 0–255 scale, a 99th-percentile difference of `2`, and a maximum difference of `3`.
