# Aureform UI 1.1 — verification

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

Current build 17106 passed compilation/types with 133 pages and 83 registry entries. The final browser matrix passed **780/780 EN/ES combinations**, with 780 axe audits, no serious/critical findings, page errors or document overflow, and **130 English gallery previews**. Appearance passed **44/44 scenarios / 348 checks**, motion **14/14 / 74**, and the fresh official consumer **85/85 checks** on the current provider. Final local CC passes against frozen state: **92 templates / 1,646 evaluations / 556 typed examples**, zero diagnostics and zero pending mappings. The actual **65-root native structural audit** and scoped owner PNG reviews pass. Docs-only coverage and source/design docs are closed for packaging; new ZIP consumers and private publication remain pending.

**Current runtime QA passes; distribution closure remains pending.** [Español](verification.es.md) · [Machine-readable results](verification-results.json).

Version 1.1 has **65 views: 64 suite routes plus the landing**, with six palettes, Appearance Studio and six reusable effects. Its completed browser matrix contains **780 combinations**: 65 × EN/ES × Light/Dark × 360/768/1440 px. Palette, preset, import/export, material and effect runtime checks are additional recorded scope.

The final browser report supersedes the initial matrix checkpoint. Its canonical and mirror copies are identical, and all 130 preview files match the owner mirror byte for byte. The gallery previews cover **65 routes × Light/Dark in English**, captured at 1440×900 and resized to WebP at 960 px width. The runtime matrix separately covers both EN and ES. All 122 application files match the owner's build-17106 freeze, including provider `d4c5cf…` and the unchanged docs UI. The provider correction is covered by current appearance, motion and official-consumer runs; no unresolved runtime defect is recorded. Earlier unit, clipboard, E2E and focused Chart/Button/table proofs retain their own source scope. The [current local CC summary](../.figma/code-connect/validation/validation-summary.json), [manifest](../.figma/code-connect-manifest.json) and accepted [65-route native audit](../.figma/native-audit.json) bind state SHA256 `7520e555c299b0978de6837e2f504271117a8e563a7538683cd61fc043c1aa52`. [Chart scope and acknowledgment](charts.md).

Owner-recorded native inventory: **65 roots, 714 variables (332 primitives), eight collections, 14 text styles, 36 paint styles and six effect styles**. These totals describe native inventory, separate from generated source colors. [Page 2:5](../.figma/native-owner-default-fix-2-5-1.1.json) records 86 font/18 mode assignments and [page 2:6](../.figma/native-owner-default-fix-2-6-1.1.json) records 45/36, applied with zero errors and no state/ID/property/axis changes. The [owner's scoped visual review](../.figma/proofs/defaults-1.1/owner-visual-review.json) passed with zero findings after those 185 assignments, 198 token and transparent surface corrections, four version-label fixes and two Table slot clips. Huygens' 21-root read at `2026-10-19T08:20:56.047Z` and the [owner's 44-root read](../.figma/native-owner-final-route-audit-2-6-1.1.json) at `2026-10-19T08:25:51.154Z` pass all 65 roots with zero flags, missing fonts or UI image fills and zero canvas mutations. White-layout checks include SLOT at minimum height 8 px; scoped PNG review remains separate from the full structural read.

| Current 1.1 check                                                    | Status / evidence                                                                                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Canonical source coverage and registry dependency graphs             | PASS docs-only refresh: 65 source/native views, 44 core examples, 83 registry graphs and 92 local CC templates; zero missing IDs |
| Local Code Connect, source appearance types and six effect contracts | PASS against frozen state: 92 templates, 1,646 evaluations, 556 typed examples, zero diagnostics/pending mappings; synthetic runtime |
| Production typecheck, lint and static build                          | Owner build 17106 passed types/build: 133 pages, 83 registry entries; lint has zero warnings; prior unit log has 79/79 passes |
| Production browser and current previews                              | PASS: 780/780 EN/ES combinations, 780 axe audits with zero serious/critical findings, 130 English Light/Dark previews         |
| Motion runtime                                                       | PASS: 14/14 scenarios, 74/74 checks, zero errors                                                                              |
| Appearance, palettes, presets, exports and shader/effect behavior    | PASS: full 44/44 scenarios, 348/348 checks, zero errors and unchanged source                                                  |
| Native 1.1 roots, palette foundations and appearance/effect masters  | PASS: actual read-only 21 + 44 root audit against frozen state; scoped owner PNG reviews also pass with their recorded limits   |
| Fresh official registry consumer                                     | PASS: 12 installed items, frozen install/type/lint/eight-page build, 14 unchanged UI exports and 85/85 checks                 |
| Final starter/source/sample archives and fresh archive consumers     | Pending owner’s final native/docs/previews, packaging and archive-specific verification                                       |

The [original consumer report](consumer-verification-1.1.md) preserves the official-registry MagneticButton hydration failure. The [latest official consumer](registry-compatibility.md) passes **71 production UI checks plus 14 installed-provider checks**, including changed props, scope flags, child layout commits, synchronized refs and native storage. Ocean Light and Ember Dark pass with no nested buttons, hydration/page errors or compiled-resource failures, and no installed-source substitutions or local repairs. Full evidence is `artifacts/consumer-registry-provider-refresh-1.1-report.json`; the compact result is in the JSON. The final browser evidence is `artifacts/browser/report.json`, completed at `2026-10-19T03:34:22.638Z`. Follow the [release checklist](release-checklist-1.1.md) for the completed source/native/docs handoff and remaining new ZIP/private publication gates.

| Focused checkpoint             | Recorded result                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Table behavior                 | 10/10 distinct passing proofs across baseline/label/material runs; source checkpoints match the freeze                           |
| Chart/Button behavior          | Owner reports 12 fresh cases, three feature groups and 22 deep checks; copied-label fix built/rechecked                          |
| Prior unit/lint/build          | Before provider correction: 79/79 unit tests, lint without warnings and build with 133 pages                                     |
| Final actual-copy checks       | 176 dynamic clipboard payloads plus 12 responsive captures; all 188 strictly compiled with zero diagnostics                      |
| Targeted appearance            | EN/ES controls pass; current provider build and full appearance 44/348 supersede the earlier targeted checkpoint                 |
| Desktop/mobile E2E             | Nine desktop cases and corrected mobile case pass on their recorded checkpoint; current full-route QA passes separately          |
| Native palette/control runtime | Six palettes, 12 control gradients and 15 new primitives recorded; owner Light postshots and final 65-root structural audit PASS |

The table consolidation is `/tmp/aureform-table-audit-45mi6l56/runtime3010/merged-proofs.json`. It preserves earlier failures and each case's latest passing result rather than presenting a single full-suite rerun. The glass-contrast incomplete result and static footer/loading/error/ref/callback fixture limits remain documented in the JSON. Bounded native resync remains recorded in [the owner ledger](../.figma/native-runtime-resync-1.1.json); subsequent owner records added Studio/Themes/Effects, completing all 65 root IDs. The accepted final structural audit retains its separate scope.

## Historical 1.0 results

The completed **1.0** run recorded **744 browser combinations, 10 functional E2E tests, 14 motion scenarios / 74 checks, 44 complete clipboard examples and three separate Next.js consumer installations**. The table below and `previousRelease` in the JSON preserve that evidence. It does not certify changed 1.1 source or archives.

| Check                                        | Result                                                                                                             | Evidence                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| TypeScript, ESLint, Node tests and build     | PASS; no lint warnings; 10 tests; 127 static pages                                                                 | Portable commands below                                                                        |
| Production browser matrix                    | 744/744; 62 views × EN/ES × Light/Dark × 360/768/1440 px                                                           | `verification-results.json` → `previousRelease`                                                |
| Runtime, document overflow and accessibility | 0 runtime errors, 0 px document overflow, 0 serious/critical axe findings                                          | WCAG 2 A/AA and 2.1 A/AA tags                                                                  |
| Functional behavior                          | 10/10                                                                                                              | `artifacts/e2e-report.json`                                                                    |
| Motion and effects                           | 14/14 scenarios, 74/74 checks                                                                                      | `artifacts/motion-report.json`                                                                 |
| Source examples and actual copy buttons      | 44 files + 44 identical payloads; 0 type diagnostics; 12 code-dialog combinations                                  | `artifacts/examples-validation/validation-summary.json`, `artifacts/copy-examples-report.json` |
| Local Code Connect                           | 82 templates; 754 cases; 239 variant combinations; 367 typed emitted examples; 0 diagnostics                       | `verification-results.json` → `previousRelease`                                                |
| Native Figma                                 | 62 editable route roots; 44 specimens; 46 editable previews; 0 image fills                                         | `.figma/native-audit.json`                                                                     |
| Starter ZIP consumer                         | Fresh extraction, installation, typecheck, lint and build passed                                                   | `artifacts/consumer-starter-zip-report.json`                                                   |
| Local CLI consumer                           | MotionSystem, DateRangePicker and AIComposer; installation, typecheck, lint and build passed                       | `artifacts/consumer-cli-motion-report.json`                                                    |
| Official shadcn consumer                     | Independent minimal host; DataTable, RevenuePanel and MotionSystem; installation, typecheck, lint and build passed | `artifacts/consumer-registry-effects-report.json`                                              |

Full historical reports were generated under `artifacts/` and excluded from the ZIP. The historical 127 build pages include localized routes and framework pages; that release contained 62 unique views. Current source inventory is generated in [coverage](coverage.json).

## Behavioral coverage

The historical functional run covered customer CRUD and confirmed deletion, persisted records, sorting/filtering/paging/selection, CSV downloads, dialog focus trapping and restoration, command navigation, AI cancellation and retry, local identity/OTP flows, calendar persistence, IndexedDB file bytes and downloads, profile settings, all six shell layouts, 200% zoom, Spanish mobile navigation and persistent theme changes. Repeat the relevant checks against the changed 1.1 export.

The motion suite observes actual GSAP styles and real wheel/anchor scrolling. It checks live reduced-motion cleanup and restoration, keyboard focus, fine/coarse pointers, gradients, hover and server-rendered content in both languages. Its two no-JavaScript scenarios keep application scripts disabled on the original page; axe uses a script-free copy of that observed DOM after checking presentation equality. See [the motion verification guide](motion-verification.md).

The server emits the correct document language before hydration, including Spanish at `/` and `/es/`. Avatars have an explicit image role and accessible name.

## Reproduce

Use Node.js 22.16+ and pnpm 10 from the extracted kit root. Chromium is required for browser checks. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to your executable if necessary; the runner otherwise tries `/usr/bin/chromium-browser` or Playwright's installed Chromium.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
python3 scripts/generate-code-connect.py
pnpm verify:examples
pnpm verify:code-connect
pnpm coverage
```

```sh
# Terminal 1
PORT=3010 pnpm start

# Terminal 2
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:motion
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:appearance
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:copy
AUREFORM_BASE_URL=http://127.0.0.1:3010 \
  node --experimental-strip-types scripts/verify-browser.mjs --full --capture
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm test:e2e
```

The E2E runner starts its own preview on port 3001 while the environment variable selects the target. Keeping the other suites on 3010 avoids coupling their lifecycle to that temporary server.

For installation checks, follow the [root README](../README.md), then run `pnpm install`, `pnpm exec tsc --noEmit`, `pnpm lint` and `pnpm build` in each independent destination. The recorded consumer checks validate installation and compilation; browser behavior is covered by the suite above.

For canonical handoff checks using the owner’s restored dependencies, follow [handoff-1.1.md](handoff-1.1.md). `AUREFORM_DEPENDENCIES` selects installed types; `node scripts/generate-coverage.mjs --docs-only` avoids writing public coverage. Regenerate Code Connect after source/native changes: the validator rejects stale generation-time hashes.

## Scope and limits

The demo uses local, deterministic adapters. Real authentication, authorization, models, email and billing require server integration. Automated axe results are scoped to Chromium, the stated widths, tags and severities; gradient contrast and other incomplete results require human review and do not establish certification.

Code Connect is locally validated against an API stub and actual source types. Live Figma template execution and cloud publication have not been performed. The native design is editable and reviewed; dense table compositions consolidate records. See [the Figma handoff](figma-handoff.es.md) and [coverage](coverage.json).

After current QA, the owner runs `pnpm package:source` to create the source, starter and eight-component MIT sample with the 1.1 version and SHA256 checksums. Fresh 1.1 archive extraction/install/build checks are pending. Release archives exclude installed dependencies, build output, Git data, secrets and hosting identity.

For delivery verification, consult `public/downloads/verification-1.1.json` and `public/downloads/checksums.json` for the matching release version, exact archive SHA256 and actual archive-consumer/publication outcomes. Detailed reports belong in `artifacts/`; these receipt locations are excluded from the source ZIP. Freeze all included canonical files before ZIP creation and keep them unchanged through the independent archive runner. An included-doc change requires a controlled repack with new archive hashes and independent CRC/code-hash conservation proof.
