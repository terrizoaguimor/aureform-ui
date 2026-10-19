# Aureform registry compatibility

## Open-source delivery

The original Aureform source, starter, sample and image collection use [Apache 2.0](../LICENSE), including all 32 image masters. Registry and archive versions follow `package.json`; the 1.2.1 image manifest and native review remain immutable image checkpoints. The catalog has 107 registry entries, 69 views and 44 core families. Regenerate registry metadata for a new source release and validate the delivered payloads; the historical checks below do not certify a new installation.

## Image delivery introduced in 1.2.1

The [image manifest](../public/assets/generated-images.json) contains 32 assets: 18 avatars (16 fictional portraits and two organization identities), eight product photos and six editorial images. Each item supplies:

- `src`: a local `/assets/<group>/<id>.svg` for component/registry use.
- `downloadSrc`: the corresponding optimized `/assets/<group>/<id>.webp`.
- Dimensions, EN/ES alternative text, byte counts and SHA-256 values for both representations.

The SVG embeds the exact WebP bytes as a `data:image/webp;base64,...` image. It is a self-contained raster container, **not native vector artwork**. Aureform's registry generator serializes text assets into `registry:file` entries targeting `public/assets/...`; the official **shadcn 4.22.0** installer can write this text file without a binary registry transport. Raw binary WebP files remain in the source kit and image ZIP; the local CLI copies assets as buffers. No API key, image generation SDK, external image host or runtime generation is needed to use either representation.

Assets follow the selected dependency closure. The minimal starter and eight-component Apache sample include no generated photos. Customer screens reach the 18 identity SVGs, and Media Studio reaches six editorial SVGs and their WebP siblings. Avatar and product SVGs also contain their exact optimized WebP bytes; their downloads do not require a separate binary file. Source and the complete optional `aureform-ui-images.zip` contain all 32 WebP/SVG pairs, the manifest, full [prompt catalog](generated-images/catalog.json) and original masters in `design/images/masters`.

The [native image ledger](../.figma/native-generated-images-1.2.1.json) has its own 1.2.1 asset/placement proof scope and must match its checkpoint state and image manifest before packaging. Preserve that state as `.figma/history/state-1.2.1-final.json` before changing the current native state; when no separate checkpoint exists, the unchanged current state supplies those same recorded bytes. Generated content IMAGE fills are allowed; whole-UI rasterization is excluded. The immutable [1.2 audit](../.figma/native-audit-1.2.json) instead matches [state-1.2-final](../.figma/history/state-1.2-final.json). Its 69-root baseline and retained runtime checks remain historical. Regenerating image metadata changes hashes and requires a corresponding new review; it is not automatically accepted by packaging.

Historical source, image and browser results are recorded in [the scoped 1.2.1 QA receipt](qa-runtime-1.2.1.json): two image consumers passed 1,802 checks, including actual shadcn installation, photo decoding and WebP downloads. Its archive identities are recorded separately in `public/downloads/verification-1.2.1.json`. The retained `verification-1.2.json` and `verification-1.2.1.json` must not be compared with a new checksum manifest. The original 1.2 artifacts remain in the owner's historical workspace archive; the open-source release has its own delivery record. See the [1.2.1 release checklist](release-checklist-1.2.1.md).

## Historical 1.1 composition checkpoint

The following records the executed **1.1** checkpoint. Its official installation verified the provider and composition fix: 12 installed items from an 83-entry registry, 14 unchanged copied UI exports and **85 passing checks: 71 production UI checks plus 14 provider synchronization checks**. Local CC and the 65-view native structural audit passed against that frozen state. These results keep their original input identities and scope; they are not new generated-image QA.

## Confirmed cause

The failed consumer uses `style: "base-nova"`. In the installed shadcn 4.22.0 / `@shadcn/registry` 0.2.0, that style enables the `asChild` migration. It recognizes named JSX `asChild` attributes without checking the imported component’s API. With `{children}` rather than a literal JSX child element, it removes the attribute. With a literal child, it rewrites composition to a `render` prop. The [upstream transformer](https://github.com/shadcn-ui/ui/blob/main/packages/registry/src/transformers/transform-aschild.ts) describes this migration; the installed package was independently inspected and executed for this checkpoint.

That migration removed `asChild={asChild}` from the registry-installed MagneticButton’s EffectSurface call. The public `<MagneticButton asChild><Button>…</Button></MagneticButton>` then produced nested buttons and React hydration error 418. The [independent consumer report](consumer-verification-1.1.md) records the original browser failure.

## Targeted payload change

`registrySafeContent` in `scripts/generate-registry.mjs` parses TSX and recognizes imports of EffectSurface and the six public effects. It preserves their custom `asChild` attributes as an equivalent object spread at the same position:

```tsx
<EffectSurface
  {...props}
  as="button"
  {...{ asChild }}
  type={asChild ? undefined : type}
>
  {children}
</EffectSurface>
```

The implementation preserves dynamic values, explicit `false`, bare attributes, aliased imports and namespace imports. It processes real JSX rather than strings containing downloaded examples. Other components continue through the normal shadcn migration. Import, RSC, CSS, icon, font and cleanup transforms remain enabled. CLI source copying and the public effect API are unchanged.

The current frozen EffectSurface/MagneticButton source uses this registry fix. Any future custom slot component needs explicit handling based on its actual source contract; a Base UI primitive should retain the installer's normal migration.

## Completed scoped checks

| Check                                                     | Result                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Installed shadcn named-attribute deletion                 | Reproduced with the current MagneticButton source                            |
| Official transform pipeline                               | All ten installer transform stages executed on the protected source          |
| Dynamic, false, aliased and namespace slots               | Preserved                                                                    |
| All six public effect slots                               | Preserved                                                                    |
| Base UI Button migration                                  | Still runs, including link `nativeButton={false}`                            |
| Real Button/MagneticButton/EffectSurface server rendering | Original CLI: one button; unprotected registry: two; protected registry: one |
| Protected server markup                                   | Matches the original CLI markup                                              |
| Standalone button, link and disabled child                | Pass                                                                         |
| Child/outer handlers, preventDefault, classes and styles  | Pass                                                                         |
| Composed refs and their cleanup functions                 | Pass                                                                         |
| Registry index version                                    | Read package version 1.1.0 at this historical checkpoint                     |

Rendering used actual React 19.3.1 and canonical component source compiled in memory. The pointer hook was a no-op fixture so these scoped checks isolate composition; they do not certify pointer animation or browser hydration. No installer, production build, registry generation or final packaging command ran during those scoped checks. The owner's actual consumer run is recorded below.

## Fresh official consumer result

The latest report is `artifacts/consumer-registry-provider-refresh-1.1-report.json`, copied identically from the owner's fresh workspace. It records successful official shadcn 4.22.0 installation, frozen dependency install, typecheck, lint and an eight-page production build; all 12 recorded commands exited zero. The served index reports 1.1.0; it and all 12 selected registry payloads remained unchanged through the run.

All 14 actual Studio/effect UI exports were freshly captured and copied byte for byte without source transforms in Ocean Light and Ember Dark. The production browser passed 71/71 checks, including one button for MagneticButton composition, preserved child handlers, saved-theme reload and no nested buttons, React 418/page errors or compiled-resource failures. A separate installed-provider probe passed 14/14 checks: changed initial props, document-scope flag transitions, current configuration in child layout commits, synchronized functional-updater refs and native storage preservation. Installed source used no product-source substitution or local payload repairs. The installed, live-registry and canonical provider hashes all match `d4c5cf01f252483f2edb2fee28f5f56a0b5a5b844b39bf323abe4dad4a06a7d5`.

The captured 83-entry inventory hash is `813050730ed001d57e6f44778cc7a28a7fc517cf4e40e571b449bc815f5dd381`. This is the inventory hash, distinct from the index and report file hashes. The earlier 71-check refresh remains historical evidence for the initial composition fix; the latest 85-check run verifies the changed provider.

The minimal consumer must still supply or adapt suite navigation destinations. The report does not consume final ZIPs, whose verification remains pending. Its compact result is in [verification-results.json](verification-results.json).

## Reproduce after future source changes

The current generated registry and application passed production QA and are frozen. For a future source change, the owner can regenerate from the canonical root against the restored dependencies:

```sh
AUREFORM_DEPENDENCIES=/tmp/aureform-ui-build/node_modules \
  node scripts/generate-registry.mjs
```

After generation, this read-only check verifies the actual payload and version:

```sh
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const [pkg, index, item] = await Promise.all(
  ["package.json", "public/r/index.json", "public/r/magnetic-button.json"]
    .map(async p => JSON.parse(await readFile(p, "utf8")))
);
assert.equal(index.version, pkg.version);
const file = item.files.find(f => f.path.endsWith("/magnetic-button.tsx"));
assert(file, "MagneticButton source missing");
assert.match(file.content, /\{\.\.\.\{\s*asChild:\s*asChild\s*\}\}/);
console.log("Registry version and custom slot payload pass");
NODE
```

The normal build also regenerates tokens and registry. The application/registry are currently frozen for QA; use the [recorded consumer procedure](consumer-verification-1.1.md) for a later source change or final distribution check.

For a later retest, run `/copied/` with actual downloaded Studio/effect examples, fresh and saved appearance settings and the recorded Light/Dark configurations. Preserve one-button composition, interaction and the absence of hydration errors, and record the new input identity rather than replacing the original evidence.

All 65 native route IDs and expanded Chart/Table/Button records are recorded. Final local Code Connect passes against frozen state: 92 templates, 1,646 evaluations, 556 typed examples and zero diagnostics/pending mappings. The actual 65-view structural audit and scoped owner PNG reviews pass independently. Final distributed-archive consumers and private publication remain separate gates, recorded by version and exact archive SHA256 in the excluded delivery receipt. See [the release checklist](release-checklist-1.1.md) and [the 1.1 handoff](handoff-1.1.md).
