# Aureform 1.1 release checklist

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

The source archive includes all 23 final PNG proofs selected by the accepted native audit. The 17 historical iteration PNGs remain in the local project and are excluded from distribution. Their records remain historical evidence; application sources, final native records, local Code Connect templates and final proof bytes are preserved. This keeps the complete downloadable source below the hosting platform's 25 MiB per-file limit.

Current build 17106 passed compilation/types with 133 pages and 83 registry entries. Final runtime evidence passes **780/780 EN/ES browser combinations**, 780 axe audits with zero serious/critical findings, **130 English gallery previews**, **44 appearance scenarios / 348 checks**, **14 motion scenarios / 74 checks** and **85 fresh official-consumer checks**. Final canonical CC passes against frozen state with **92 templates / 1,646 evaluations / 556 distinct typed examples**, zero diagnostics and zero pending mappings. The actual **65-root native structural audit** and scoped owner PNG reviews pass. Source/design docs and docs-only coverage are closed for packaging; new ZIP consumers and private publication remain pending.

The current provider correction passes the full appearance/motion retakes and the latest actual official-consumer run; public APIs, runtime colors and export generators remain unchanged. The final route report closes the initial matrix checkpoint. All 122 application files match the owner's freeze, and all 130 gallery previews match the mirror. Those previews cover **65 routes × two themes in English**, captured at 1440×900 and resized to WebP at 960 px width; the 780-case runtime matrix covers both locales. The owner froze state SHA256 `7520e555c299b0978de6837e2f504271117a8e563a7538683cd61fc043c1aa52`. Final CC was regenerated and verified against that SHA before the read-only audit gate. Current documentation preparation preserves state, app and CC manifest and does not run MCP.

Owner-recorded native inventory: **65 roots, 714 variables including 332 primitives, eight collections, 14 text styles, 36 paint styles and six effect styles**. Native primitive totals and generated source-color totals are different inventories. The scoped defaults/gallery visual review and the complete read-only 65-route structural audit pass as separate evidence.

## Completed checkpoint

| Check                                                         | Recorded result                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Fresh official shadcn 4.22 install                            | PASS: 12 selected items from the captured 83-entry registry; index version 1.1.0                                                     |
| Consumer frozen install, typecheck, lint and production build | PASS; all recorded command exit codes are zero                                                                                       |
| Actual copied Studio/effect exports                           | 14 files, copied without source transforms, in Ocean Light and Ember Dark                                                            |
| Consumer production browser                                   | 71/71 UI checks plus 14/14 provider prop/flag/layout-commit/ref/storage checks; no runtime or compiled-resource errors               |
| Registry composition regression                               | Actual installed `asChild` spread, child handlers and one-button composition pass                                                    |
| Input stability                                               | Registry index and all 12 selected payloads remained unchanged through the run                                                       |
| Pure configuration tests                                      | Owner reports 71 named tests passing, including 24 custom and 12 preset contrast cases                                               |
| Chart and Button UI                                           | Owner reports 12 fresh matrix cases, three feature groups and 22 deep functional checks across EN/ES and 13 charts                   |
| Table UI                                                      | 10/10 distinct meaningful tests pass; consolidated baseline and targeted label/material retests match frozen source                  |
| Native palette/control resync                                 | Recorded: six palettes, 120 mode values, 12 control gradients, 15 new primitives; owner Light postshots viewed PASS                  |
| Native Table/DataTable                                        | PASS: 16 Table + 28 sparse DataTable variants structurally; 20 representative Light/Dark instances visually reviewed                |
| Native Button Shapes and appearance review                    | PASS: nine shape/size masters; 54 actual Light/Dark examples, including 15 appearance cases and three add-ons per theme             |
| Cover and Brand Guide                                         | Owner PNG review PASS: 1.1, 64 suite routes, 44 families; current Aurora copy and Large icon foreground corrections verified         |
| Native Chart13                                                | PASS: 13 actual Kind variants and 12 exact Boolean definitions; final library/screen PNG review after legend and October-axis fixes |
| Canonical local Code Connect                                  | PASS: 92 templates, 338 variant combinations, 1,646 evaluations, 556 typed examples, zero diagnostics and zero pending mappings     |
| Owner state freeze                                            | Completed steps and resolved validations recorded by owner; frozen SHA above matches the accepted actual 65-root audit              |
| Native inventory                                              | Recorded: 65 roots; 714 variables/332 primitives/8 collections; 14 text, 36 paint and 6 effect styles                               |
| Native defaults/gallery corrections                           | Scoped owner PNG review PASS: 185 font/mode assignments, 198 token/transparent surfaces, four version labels and two Table slot clips |
| Native final structural audit                                 | PASS: 21 + 44 actual roots, zero flags/missing fonts/UI image fills, SLOT/minHeight8 coverage and zero canvas mutations              |
| Distribution source graph                                     | Starter and sample include the token generator, `scripts/lib/appearance-tokens.mjs` and `src/lib/appearance.ts`                      |
| Prior owner unit/lint/build                                   | Before the provider change: 79/79 unit tests; owner reports lint without warnings and build with 133 pages                           |
| Final actual copied payloads                                  | PASS: 176 dynamic clipboard payloads across 44 families plus 12 responsive captures; all 188 strictly compiled with zero diagnostics |
| Copied-label accessibility fix                                | Owner build/recheck passed; no API/export change                                                                                     |
| Completed E2E checkpoints                                     | Owner reports nine desktop cases and the corrected mobile case passed; these do not certify the new provider build                   |
| EN/ES controls                                                | Both targeted cases pass; the current full appearance retake passes 44 scenarios / 348 checks                                        |
| Provider lifecycle correction                                 | Current lint/build 17106, appearance 44/348, motion 14/74 and fresh official consumer 85/85 pass on provider `d4c5cf…`               |
| Final route/theme/locale/width matrix                         | 780/780; 65 routes × EN/ES × Light/Dark × 360/768/1440 px; zero errors or document overflow                                          |
| Final axe audits                                              | 780 audits; zero serious/critical findings in the recorded scope                                                                     |
| Actual gallery previews                                       | 130 English previews: 65 routes × Light/Dark; canonical files match the mirror                                                       |

The latest consumer evidence is `artifacts/consumer-registry-provider-refresh-1.1-report.json`; the compact result is retained in [verification-results.json](verification-results.json). All 12 recorded commands exited zero, including official shadcn 4.22.0, frozen install, types, lint and the eight-page build. The installed provider matches the live and canonical source. Detailed `artifacts/` reports are excluded from the source ZIP. This run consumes the current HTTP registry and actual UI exports; it does not certify the final archives. The original [consumer failure checkpoint](consumer-verification-1.1.md) remains historical evidence.

The table proof is `/tmp/aureform-table-audit-45mi6l56/runtime3010/merged-proofs.json`: ten distinct cases pass across three recorded runs, with all included source checkpoints matching the freeze. It covers actual labels, four material choices and real glass blur, rather than ten repetitions of one check. It is a consolidation, not a single rerun of the whole latest suite. Its documented glass contrast and static fixture limits remain in the compact result. Native resync and the owner's Light review are recorded in [native-runtime-resync-1.1.json](../.figma/native-runtime-resync-1.1.json).

Final copy evidence is `/tmp/aureform-ui-build/artifacts/owner-final-1.1/copy-final/copy-examples-report.json`. It records an unchanged source checkpoint and zero compilation diagnostics, with accessibility incomplete findings retained. The current appearance run separately closes the recorded runtime regression; the copy pass does not certify final archives.

## 1. Complete the native handoff

- [x] Complete the bounded token/alias/style resync: the owner recorded six palettes, 120 mode values and 12 control gradients, with 15 new primitive variables and a passing Light palette/appearance review. Final inventory totals still derive from the owner's ledger and generated tokens.
- [x] Complete and accept the actual 65-route audit, including the seven composed roots and recorded targeted fixes. The read-only 21 + 44 root receipts pass with zero flags, missing fonts or UI image fills; white-layout checks include SLOT and minimum height 8 px. Retain the separate structural, text/font, color-mode and scoped visual results without counting existing roots as new routes.
- [x] Create and verify `studio`, `themes` and `effects`: owner state records roots `134:8412`, `135:8894` and `136:9476`, with native and visual proofs under `entities.appearanceScreens`. All 65 routes now have actual root IDs; the final 65-view audit is still required.
- [x] Execute the approved [Button builder](../.figma/scripts/buttons-1.1.js) and [Cover update](../.figma/scripts/cover-counts-1.1.js), preserving legacy/appearance masters and frozen application source. Shapes set `176:4598`, default `176:4562` and exact Label/Show icon/Icon definitions are recorded in [native-buttons-1.1.json](../.figma/native-buttons-1.1.json). Lossless affected IDs and actual sequential returns are retained in the journals. [Owner visual review](../.figma/proofs/buttons-1.1/owner-visual-review.json) passes 54 examples and both scoped post-fixes; [Cover review](../.figma/proofs/buttons-1.1/owner-cover-review.json) passes.
- [x] Record the complete native Table44 checkpoint: [report](../.figma/proofs/table-1.1/native-table-1.1-report.json), actual state definitions and [owner visual review](../.figma/proofs/table-1.1/owner-visual-review.json). Loading footer overflow is corrected in all four material variants.
- [x] Record the actual native Chart13 expansion and all 12 Boolean definitions in [the receipt](../.figma/native-charts-1.1.json), [exact definitions](../.figma/code-connect/Chart.native-definitions-1.1.json) and owner state. [Final owner review](../.figma/proofs/charts-1.1/owner-visual-review.json) passes both PNGs after legend-wrap and October-axis fixes. Preserve the original six IDs, 44 core families and exact suffixes.
- [x] Retain applied [page 2:5](../.figma/native-owner-default-fix-2-5-1.1.json) and [page 2:6](../.figma/native-owner-default-fix-2-6-1.1.json) default corrections: font assignments 86/45 and mode assignments 18/36, zero errors, no IDs/properties/axes/state changes.
- [x] Retain the [owner's scoped defaults/gallery PNG review](../.figma/proofs/defaults-1.1/owner-visual-review.json): zero findings after 185 font/mode assignments, 198 token and transparent surface corrections, four version-label fixes and two Table slot clips. This visual result and the accepted complete read-only 65-route structural audit retain their separate scopes.
- [x] Record current palette/effect/library inventory and the scoped preview receipts alongside the accepted final audit. Keep shader uniforms separate from component properties and retain arbitrary children content instead of inventing React `title` props.

Native IDs and a successful visual audit are separate requirements. No MCP writes run as part of this checklist preparation.

## 2. Generate and validate Code Connect after the native checkpoint

- [x] Record actual Table16/DataTable28/Shapes9/Chart13 inputs in [native-additions.json](../.figma/code-connect/native-additions.json), using the [record guide](code-connect-records-1.1.md). Canonical generator/verifier checks preserve all 44 core maps and add Shapes separately, with exact suffixes and the actual Rounded/Medium default.
- [x] Validate mappings for the four Table/DataTable materials and both densities, plus Loading/Error source APIs. Retain the 16 Table and 28 sparse DataTable variants; no selected-state prop or 40-variant native matrix is invented. Both the earlier checkpoint and final state-bound run retain this scope.
- [x] Reflect all 13 source/native Chart kinds, optional tertiary data and signed diverging fixtures; preserve native Donut → source `pie`. Map Show legend/Glow/Series only to actual `legend`/`appearance`/`visibleSeries` props. Keep Show data and Category 1–6 visual-only.
- [x] Retain Newton's actual Chart13 readback and completed legend/October-axis post-fixes, plus final owner PNG review. Preserve the previous 62-view audit as historical evidence.
- [x] Generate and verify the canonical **checkpoint**, now approved:

```sh
python3 scripts/generate-code-connect.py
AUREFORM_DEPENDENCIES=/tmp/aureform-ui-build/node_modules \
  node scripts/verify-code-connect.cjs
```

- [x] After the checkpoint passed, the owner recorded actual completed CC/native steps, cleared resolved pending validations and froze `.figma/state.json` at the SHA above. Scripts did not infer or close owner validations.
- [x] Regenerate and verify **final** Code Connect against the frozen state before the read-only audit consumes its current CC gate. The commands above passed again; manifest SHA256 is `618a0e2d6f871793ddcb3d5d717e7c398fe2fbd352b4b5737a7e8a8b1337815c`, flat summary SHA256 is `635f0f197129bbe20fe2219e2789c6b370a52c6168b1c3f0e635eb375c4f6329`.
- [x] Confirm zero diagnostics/pending mappings, 338 recorded variant combinations, all source appearance/effect contracts, the complete CLI starter and generation-time hash checks on the final state-bound run.
- [x] Accept the actual read-only 65-root audit bound to the same frozen state SHA, retaining the separate scoped owner PNG receipts. No state edit follows this freeze. Regenerate CC again only if an authoritative input changes.
- [x] After actual audit acceptance, write docs-only coverage:

```sh
AUREFORM_DEPENDENCIES=/tmp/aureform-ui-build/node_modules \
  node scripts/generate-coverage.mjs --docs-only
```

- [x] Confirm the accepted actual audit binds the same state SHA as the final CC manifest and flat summary. Complete and freeze shipping docs and local CC files before the owner pins the full package inventory. Keep `docs.tsx` and all frozen application files unchanged.
- [x] Preserve the distinction between synthetic local validation, owner native visual QA and cloud publication. These templates remain local/unpublished unless a separate publication workflow actually occurs.

The [Chart13 checkpoint](../.figma/code-connect/validation/chart13-checkpoint-1.1.json) preserves the earlier state SHA as historical proof. The current [flat summary](../.figma/code-connect/validation/validation-summary.json) and manifest come from the subsequent final state-bound generation/verification. The scoped defaults/gallery fixes changed no IDs, props, axes or state, so CC remains current. Native audit, README and docs are excluded from CC's authoritative inputs. The completed read-only 65-route receipts provide the actual structural result independently of local CC and scoped owner visual review; docs-only coverage now consumes that accepted audit.

## 3. Attach current application QA

- [x] Record provider build 17106: types/build passed with 133 pages and 83 registry entries, lint has zero warnings. Preserve the earlier 79-unit checkpoint with its actual source scope.
- [x] Build and recheck the small copied-label accessibility fix, preserving the frozen APIs and actual export payloads.
- [x] Verify final actual copies: 176 dynamic payloads plus 12 responsive captures, all 188 strictly compiled without diagnostics.
- [x] Complete both EN/ES controls retests; the owner reports both passed on their recorded source checkpoint.
- [x] Correct and retest the mobile E2E stale-headline expectation; the owner reports the mobile case passed. Preserve it and the nine desktop cases as scoped evidence.
- [x] Finish provider build 17106 and the full appearance 44/348 and motion 14/74 retakes. Its initial-prop state update now uses a guarded update during the provider's own render rather than a passive-effect configuration update; unchanged APIs/colors/exports do not substitute for runtime QA.
- [x] Record current full appearance 44/348 and motion 14/74; both reports pass with zero errors.
- [x] Attach the genuine fresh current-source official-registry consumer: 85/85 checks, 14 actual unchanged UI exports, no installed-source substitutions or local repairs.
- [x] Record final full-route QA: `artifacts/browser/report.json` passes all 780 combinations and 780 axe audits, with zero failures/errors and 130 current English previews. Retain the earlier functional/E2E/copy proofs with their recorded scopes.
- [x] Record the built fixes and actual scenario proofs for reduced-motion transitions, Components Flat, Studio disabled-input opacity and Chrome glass.
- [x] Retain current appearance/motion scope for Off/OS reduced motion, the 30 FPS shader cap, fallback/visibility behavior, custom contrast and gradient-interior checks.

The Chart/Button UI passes, consolidated ten-test table proof and native palette resync retain their scoped evidence. Final route, appearance, motion and official-consumer reports pass. Native Tables44, Buttons/Cover/Brand Guide, final Chart13 and defaults/gallery PNGs pass their actual scoped reviews. The complete 65-root structural read passes as 21 Huygens roots plus 44 owner roots against frozen state.

## 4. Close documentation and preview inventory

- [x] Refresh [coverage](coverage.json), [verification](verification.md) and [the handoff](handoff-1.1.md) from the final recorded results and IDs. Retain 64 suite routes plus landing, 44 core families, six palettes and six public effects.
- [x] Verify the existing EN/ES documentation template and complete appearance/shader examples against the frozen source. Its current text covers Studio JSON/CSS/React and custom colors in the pure configuration; `docs.tsx` remains unchanged.
- [x] Owner updated `README.es.md` to 1.1 with actual 65/83/13/6/44 counts and runtime QA, keeping final ZIP verification pending. This agent did not edit that file.
- [x] Confirm the intended current Code Connect configuration: `.figma/code-connect/figma.config.json` selects current generated templates; root `figma.config.json` preserves the legacy template selection. Local verification follows the current manifest.
- [x] Keep [chart attribution](charts.md), the independently owned [data-table guide](data-table.md), [community references](community-design-references.md), notices and licenses. No community reference raster is distributed or claimed as an editable original-library import.
- [x] Record 130 current English route/gallery previews, Light/Dark, matching the owner mirror. They are separate from the bilingual 780-case runtime matrix.
- [x] Retain the actual scoped native preview reviews and check final handoff links/captions/provenance. All 65 root IDs and the accepted final structural audit are recorded; visual reviews retain their actual sampled scope.

## 5. Owner final packaging

Run packaging only after the native handoff, final docs and previews are complete:

- [ ] Freeze every canonical file included in the source ZIP, including README/docs, Code Connect and `.figma` records. Pin the full included-file inventory before packaging and compare it unchanged at the end of the independent ZIP runner.
- [x] Record the delivery proof location before packaging: `public/downloads/verification-1.1.json` and `artifacts/` are excluded from the source ZIP by `scripts/package-source.mjs`. Verification is reported by release version and exact archive SHA256, paired with `public/downloads/checksums.json`. Actual consumer and publication results belong in those receipts; this handoff creates no archive pass.

```sh
pnpm package:source
```

| Archive                   | Required contents/checks                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `aureform-ui-source.zip`  | Frozen source, current docs/tokens/registry, complete local handoff and current notices/licenses                                  |
| `aureform-ui-starter.zip` | Its own palette/provider/motion controls, six effects, local fonts, pure config and working token generator/helper imports        |
| `aureform-ui-free.zip`    | Eight sample components and their source dependencies, generated styles, pure config/helper, font assets and separate MIT license |

- [ ] Confirm archive/checksum versions derive from the current package, all three SHA256 values match their actual ZIPs and the final native/docs/previews are included.
- [ ] Confirm the generated MagneticButton payload retains registry-safe custom slot composition. Preserve the official installer transforms.
- [ ] Confirm the token command uses Node type stripping and every copied generator import resolves; do not edit the owner's pure helper.
- [ ] Verify exclusions and keep build output, installed dependencies, detailed artifacts, secrets and hosting identity outside the source archive.

## 6. Verify the actual final ZIPs

- [ ] Extract each new archive into an independent destination. Install the applicable dependencies and verify types, lint/build and token generation where those commands apply.
- [ ] Exercise the starter and an existing-host CLI add independently; verify palette/provider/motion/effect behavior and the full copyable exports.
- [ ] Retest actual official-registry installation/composition from the final distributed payloads. Keep the fresh 85-check HTTP-registry/provider report as its own evidence.
- [ ] Verify the sample in a configured host with all copied helper/config imports intact.
- [ ] After actual ZIP verification, write the release version, archive-specific checksums, test results, inventory fingerprints and browser scope to the excluded delivery record `public/downloads/verification-1.1.json` and/or `artifacts/`. Match each result to its actual version and archive SHA256. Keep included shipping documentation frozen; do not edit it to announce a later ZIP pass.
- [ ] Confirm the full included canonical inventory stayed unchanged from the independent runner's start to end. Existing public ZIPs remain the previous distribution until the owner writes the new packs/checksums.
- [ ] If included documentation must change after ZIP creation, perform a controlled documentation-only repack. Record the new ZIP hashes, independently check CRCs and code-file hash conservation, and verify that new archive; the prior archive's pass does not certify the repack.

## 7. Owner private publication

- [ ] Publish the verified frozen source and final downloads with the existing private audience after native, Code Connect and ZIP closure.
- [ ] Attach the actual deployment result and final archive proof to the version-matched delivery receipt outside the frozen source ZIP. Preserve the tested source and archive fingerprints.
