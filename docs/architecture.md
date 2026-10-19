# Architecture and integration

## Source contract

The suite uses one typed catalog with 68 suite routes plus the landing: 69 views before locale expansion. A statically generated `[locale]/[[...slug]]` route dispatches each entry to an actual template. Studio, Themes and Effects extend the 44 core families. Shared primitives follow shadcn conventions and use Base UI. The local CLI copies source; there is no npm-hosted Aureform runtime dependency.

The locale layout renders the document's `lang` on the server. A separate entry layout serves the Spanish landing at `/`; both share `DocumentLayout`, local fonts and metadata. English and Spanish content carry the correct language before JavaScript executes.

UI components take explicit props. Templates own demo state and compose blocks. The shell controls navigation, workspace selection, command search, language and theme. Component imports remain individually addressable; consumers need not import the entire demo.

## Data boundaries

| Boundary                 | Delivered behavior                                              | Production integration                                      |
| ------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------- |
| `useDemoStore`           | Seeded browser records, localStorage updates, reset             | An authenticated query/mutation layer and server validation |
| `streamDemoReply`        | Async iterable text, AbortSignal, recoverable simulated failure | Server streaming endpoint with cancellation                 |
| `prepareDemoVisuals`     | Original prepared SVG/WebM previews, AbortSignal and retry      | Image/video provider through your own server                |
| `localFileAdapter`       | IndexedDB blobs, downloads, removal                             | Authorized object storage and upload validation             |
| Authentication templates | RHF/Zod validation and inert verification flow                  | Session provider with server-side authorization             |
| Billing/settings         | Local plan, team, key and integration preferences               | Billing provider, roles, invitations and audit logs         |
| Mail/chat/support        | Local messages and ticket records                               | Authenticated messaging and delivery services               |
| `RouteMap`               | Original schematic GeoJSON, MapLibre, SVG fallback              | Appropriate geospatial data and licensed map source         |

Keep provider credentials on the server. Replace the adapter rather than changing loading, error, empty, retry or cancellation behavior in the UI. The demo authorization boundary is intentionally absent: it must never be treated as a security boundary.

## Rendering and persistence

The first client render uses the same seed as the static page. Browser state loads in an effect, which avoids hydration mismatches. The language provider formats dates and numbers explicitly for EN/ES; date-only strings are anchored locally to avoid a timezone shift. Theme values come from shared CSS variables.

LocalStorage operations fail gracefully when browser storage is unavailable. File uploads use IndexedDB and object URLs are revoked after previews/downloads. Demo reset clears Aureform records and the task-owned file database; appearance has its own reset and preset controls.

`AppearanceProvider` validates and persists a complete browser configuration and applies resolved variables to the document. `AppearanceScope` supplies an isolated configuration for exported/preview examples. Named presets support apply, duplicate and delete in Studio; complete JSON can be validated/imported and JSON/CSS/React exported. No preset backend is included.

For a production backend, treat browser records as untrusted input. Do not send user-supplied HTML into the DOM. The demo renders model text and code as text; it does not execute generated code.

## Styling and tokens

`src/lib/appearance.ts` is the pure appearance contract for six palettes and Light/Dark, materials, radii, density, typography, gradients, shades and motion. `scripts/lib/appearance-tokens.mjs` derives token defaults from it before `scripts/generate-tokens.mjs` writes JSON/CSS. Node type stripping is required because the helper imports the pure TypeScript configuration. Tailwind radius aliases use the resolved appearance variables. Current primitive and native-variable totals belong to generated coverage and the owner’s ledger, not fixed prose counts.

Manrope and Instrument Serif are bundled with OFL notices and loaded locally by Next.js. There are no remote font requests. Original artwork, an eight-second silent WebM clip, descriptive captions and 32 generated images are included. The generated collection includes original masters, optimized WebP files and SVG containers with the exact raster embedded for text-based registry delivery.

Fifteen effect tokens define three shadows, three gradients, five interaction shades and four motion values in both themes. `af-hover-card` is opt-in for actionable surfaces; button variants provide matching hover and focus states. Disabled controls and reduced-motion preferences suppress decorative movement.

Button/Badge appearance choices are solid, soft, outline, glass and gradient; Card choices are flat, elevated, glass and gradient. These are additive source props and preserve existing variant/size APIs.

The six effects have individually addressable exports and shared CSS/runtime helpers: GradientBackground, ShaderBackground, SpotlightCard, GlowBorder, TiltCard and MagneticButton. The shader runtime remains a literal dynamic import in the dependency graph; it is not omitted from copied source. See [appearance](appearance.md) and [effects](effects.es.md).

`MotionSystem` scopes GSAP entrances to its markers, reads Off/Gentle/Expressive from appearance, restores inline styles and cleans up observers on navigation. Optional Lenis scrolling runs only on a landing with a fine pointer, motion enabled and no reduced-motion preference. Application screens and touch navigation keep native scrolling. See [the runtime contract](motion-runtime.md).

## Installation

The local CLI resolves the source graph before writing, including dynamic imports and text assets. It does not mistake code snippets for imports. It understands root wildcard aliases and the destination’s shadcn aliases for UI, components, libraries and hooks.

Existing source files are protected and all destinations are checked before copying. Traversal names and paths following symlinks outside the selected project are rejected. Dependencies are merged; an incompatible declared major version produces an actionable error. `add` does not run a package manager. `init` installs with pnpm unless `--no-install` is supplied.

The registry uses the official shadcn schema, target aliases and semantic theme fields. Local JSON is a portable installation method; the public demo also serves registry files under its deployment path. See [registry compatibility](registry-compatibility.md). Earlier private preview URLs require access and remain historical publication checkpoints.

Registry inventory is automatic across UI, blocks, templates and effects, with explicit provider/control/MotionSystem entries. The CLI starter seeds all six effects and appearance controls and follows the copied token generator into its helper and pure configuration. Packaging follows that same token graph for the eight-component sample; release/sample/checksum versions come from `package.json`. The starter, sample and full source all use Apache 2.0 for original Aureform work.

## Figma handoff

The companion library uses editable native nodes and original vectors. Full application screenshots are not embedded as a substitute for editable UI. Actual node IDs are recorded in `.figma/state.json` and the coverage manifest.

Current parserless `.figma.ts` files are generated under `.figma/code-connect/`; legacy root templates remain preserved. The manifest covers all 44 core families and records source appearance contracts, exact reported axes and generation-time source/template hashes. Unknown native IDs are pending entries. Publication into Code Connect and a shared Figma team library is separate and depends on the owner’s Figma account.

## Delivery model

The open-source release includes the complete suite, installation CLI, registry, examples, tokens, original image masters and design evidence. Source, starter, eight-component sample, images and versioned native-evidence companions are deterministic ZIPs with checksums. Current source, starter, sample and image packages include `LICENSE`, `LICENSE.md`, `NOTICE` and upstream notices. The historical native-evidence companions retain their exact checkpoint bytes. The source archive includes native proof PNGs and all 32 original masters, so packaging can be reproduced from the distributed source. Its GitHub-friendly size gate is 90 MiB; the smaller packages retain a 25 MiB gate.

Apache 2.0 permits adapting and redistributing original Aureform source and design assets, including commercial applications and reusable kits, subject to the license's notice requirements. There are no Aureform seat limits or paid source tiers. GSAP, icons and fonts retain their independent licenses in [third-party notices](../THIRD_PARTY_NOTICES.md).

The 1.1, 1.2 and generated-image 1.2.1 reports retain their recorded source checkpoints and test scopes. A later license or deployment release does not turn them into freshly executed checks. Current launch verification belongs in its own release record.

The repository uses fictional demonstration records and does not supply active subscriptions, live provider credentials or proprietary TailAdmin Pro assets. Historical market observations record the date they were consulted; their old proposals do not define current Aureform permissions.
