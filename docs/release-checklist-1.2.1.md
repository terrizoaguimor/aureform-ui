# Aureform UI 1.2.1 — generated images and delivery

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

This patch adds 32 images generated with **GPT Image 2.5 Flare**, snapshot `gpt-image-2.5-flare-2026-09-08`: 16 fictional portraits, two organization avatars, eight product photographs and six editorial scenes. The kit retains 96 registry entries, 69 views and 44 core component families.

The [current scoped QA receipt](qa-runtime-1.2.1.json) records executed checks and their evidence hashes. Final ZIP identities are recorded **after packaging**, outside the Source ZIP, in `public/downloads/verification-1.2.1.json`. Native publication is a separate host acknowledgment. This checklist describes the verified source and delivery contract; it does not duplicate changing archive hashes.

## Verified current source and images

| Check | Executed result |
| --- | --- |
| Generation | One canary and 31 batch images; exact GPT Image 2.5 snapshot; high quality; all 32 visually accepted |
| Optimized assets | 32 WebP, **712,622 bytes** total; 32 portable SVG containers, **958,716 bytes** total; every SVG embeds its exact matching WebP |
| Current source | Typecheck and whole-source lint passed; changed source/delivery scripts checked with zero warnings |
| Unit suite | **184 passed**, five suites, zero failures; this is an actual patch run |
| Copy examples | **733 strict root files**, 44 complete component families, zero diagnostics |
| Production export | **141 static pages**, successful build with the current image-bearing UI |
| Image-bearing routes | **72 cases**: nine routes × EN/ES × Light/Dark × 360/1440 px; decoded images, dimensions and horizontal overflow checked |
| Scoped accessibility | **16 Axe runs** on the main content of Team, Profile, Products and Media; zero violations; incomplete checks retained in the raw report |
| Identity behavior | Profile photo survives rename/reload; new notes retain explicit author identity; unknown and failed photos use real Avatar initials |
| Application previews | **138 actual browser previews** of the 69 EN desktop views in Light/Dark; zero page errors or required broken images; these are application screenshots |
| Fresh image consumers | Local CLI and official shadcn **4.22.0**, actual dependency installation and frozen replay; **1,802/1,802 checks**, 32 installed photos per consumer, actual decoding/download helpers |
| Local Code Connect | 92 preserved templates, 99 current source snapshots, 1,646 evaluations, 556 distinct typed examples, zero diagnostics; current state/source validation, cloud unpublished |
| New native image review | 32 reusable image asset components; seven exact owner-reviewed PNGs; current manifest/state hashes; zero rasterizations of complete UI |
| Native continuity | All **69 canonical route IDs** and four protected historical files preserved; no fresh full 69-view native visual matrix claimed |

The new native scope includes 293 direct photo placements, 11 Media image areas and five product thumbnails. The ledger distinguishes placements from the current suite readback and from the seven visual exports. The Figma connector did not render its accepted WebP uploads correctly; native fills therefore use lossless PNG encodings of the **same decoded optimized WebP pixels**, with separate hashes and upload receipts. The website uses the optimized WebP content.

Current files:

- [Image manifest](../public/assets/generated-images.json) and [full generation prompts](generated-images/catalog.json).
- [Generated image documentation — English](generated-images/README.md) / [Español](generated-images/README.es.md).
- [Native image ledger](../.figma/native-generated-images-1.2.1.json) and [current state](../.figma/state.json).
- Runtime artifacts in `artifacts/image-assets-1.2.1/`, retained in the workspace and excluded from Source packaging.
- Original model outputs, generation receipt and contact sheets in `output/imagegen/`, retained in the workspace and excluded from public delivery.

## Portable installation

Each SVG contains real raster image content; it is not editable vector artwork. The text registry installs it at its `public/assets/` target without unsupported binary encoding fields. Downloads recover the exact optimized WebP from this container, including in a registry consumer that has no binary sibling.

Assets follow the selected source graph. The minimal Starter and Free sample include **zero generated photos**. Customer screens reach the identity SVGs; Media Studio reaches six editorial SVGs and six WebP siblings. Source and the optional image ZIP contain all 32 WebP/SVG pairs. Generic Avatar, caller data and user uploads remain independent of the prepared fictional photo collection.

No image API key, model SDK, backend or remote image host is required to display or download the included assets. Model generation happened outside the frontend.

## Historical evidence

| Baseline | Preserved files | Original scope |
| --- | --- | --- |
| Native 1.1 | `.figma/native-audit.json`, `.figma/history/state-1.1-final.json`, 23 original PNGs | Original 1.1 review |
| Native 1.2 | Immutable `.figma/native-audit-1.2.json`, `.figma/history/state-1.2-final.json`, 22 original PNGs | 69-root composite and six SaaS routes, nine sets / 68 variants |
| Code Connect 1.2 | `.figma/history/code-connect-manifest-1.2-final.json`, `.figma/history/code-connect-validation-1.2-final.json` | Frozen local checkpoint, cloud unpublished |
| Runtime 1.2 | `docs/qa-runtime-1.2.json`, feature QA and `docs/release-checklist-1.2.md` | Original integrated runtime review |
| Delivery 1.2 | `artifacts/release-1.2-original/` and retained public `verification-1.2.json` | Original five ZIPs, checksums and receipt |

Historical checks keep their original inputs and scope. The original 74 integrated browser tests were not relabeled as patch reruns. The current image consumers exercise installed assets and their real download helpers; they do not claim a new complete template interaction/build certification.

## Packaging and final receipt

`scripts/package-source.mjs` checks exact current image/state/manifest hashes, all 32 pairs, retained historical hashes, preserved route IDs, new approved PNG bytes and the absence of complete-UI rasterization before producing seven archives:

| Archive | Contents |
| --- | --- |
| `aureform-ui-source.zip` | Source, ready WebP/SVG, previews, docs, native source assets, ledgers/history and scripts; no raw generation outputs or proof PNGs |
| `aureform-ui-starter.zip` | Minimal CLI-generated starter and reached dependencies/assets |
| `aureform-ui-free.zip` | Eight original MIT components and required source/styles/fonts; generic Avatar |
| `aureform-ui-images.zip` | 32 WebP + 32 SVG, manifest, full prompt catalog, README and kit license |
| `aureform-ui-native-evidence-1.1.zip` | 23 unchanged approved historical PNGs |
| `aureform-ui-native-evidence-1.2.zip` | 22 unchanged approved historical PNGs |
| `aureform-ui-native-evidence-1.2.1.zip` | Seven new approved generated-image review PNGs |

Each archive has a **25 MiB** gate. The final delivery receipt pins the seven ZIPs, CRC/path checks, exact Source payload, image collection, Starter/Free asset scope and evidence companions. Original archive bytes remain under `artifacts/release-1.2-original/`.

Coverage is a source/design inventory, not archive certification. Its delivery fields contain only the receipt status and checksum version, with no archive hashes or generated timestamps. The owner first packages and inspects actual archives, records that result, refreshes these derived coverage fields, then packages and inspects the final frozen payload. The final external receipt is updated with those final archive hashes. Because hashes are not embedded in coverage, this has no recursive Source checksum dependency.

To reproduce packaging, restore the three versioned evidence companions at their original `.figma/proofs/` paths, then:

```sh
pnpm coverage
pnpm package:source
```

The frontend build and runtime verification apply to the image-bearing code recorded in the current QA receipt. Later coverage, proof metadata and downloads are static delivery files; they are copied into the verified export before publication.
