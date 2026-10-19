# Appearance 1.1 verification

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

The QA scripts target the existing production build at `http://127.0.0.1:3010`.
They never start or rebuild the application. Reports from the earlier 1.0 build
are historical evidence only; they do not verify 1.1.

## Current evidence

The owned 1.1 QA handoff is complete. The final appearance and motion runs used
the owner's production preview from build session 17106 and the frozen QA
files. Both reports recorded unchanged source fingerprints.

| Verification | Actual passing result | Authoritative evidence |
| --- | --- | --- |
| Complete appearance matrix | 44/44 scenarios; 348/348 checks; zero errors | [appearance-full-final/appearance-report.json](/tmp/aureform-ui-build/artifacts/owner-final-1.1/appearance-full-final/appearance-report.json) |
| Motion | 14/14 scenarios; 74/74 checks; zero errors | [motion-rerun/motion-report.json](/tmp/aureform-ui-build/artifacts/owner-final-1.1/motion-rerun/motion-report.json) |
| Actual clipboard exports | 44 families; 176 dynamic + 12 responsive payloads; all 188 strictly compiled; zero diagnostics | [copy-final/copy-examples-report.json](/tmp/aureform-ui-build/artifacts/owner-final-1.1/copy-final/copy-examples-report.json) |
| Unit tests | 79/79 named tests: 68 appearance, seven installer, four adapters | [release-1.1-final/unit.log](/tmp/aureform-ui-build/artifacts/release-1.1-final/unit.log) |
| Functional flows | Nine desktop passes plus one corrected mobile pass from two actual invocations | [functional-consolidation-report.json](/tmp/aureform-ui-build/artifacts/owner-final-1.1/functional-consolidation-report.json) |
| Owner browser matrix and captures | 780 checks and 780 Axe checks; zero failures; 130 actual previews | [browser/report.json](/home/terrizoaguimor/VultrDrive/intelligence-ui/artifacts/browser/report.json) |

Owner appearance run 43816 completed at **2026-10-19T03:28:07.546Z**.
Every full-matrix case ran exactly once, including both shader lifecycle
cases with strict runtime-error assertions. Its report records
`fullMatrixComplete: true` and `releaseVerified: true`. The captured provider
source is
`d4c5cf01f252483f2edb2fee28f5f56a0b5a5b844b39bf323abe4dad4a06a7d5`.
The independent final review confirmed all 22 captured appearance fingerprints
still match both canonical and mirror files.

The final handoff, report hashes and QA file hashes are saved in
[qa-owned-final-handoff.json](/tmp/aureform-ui-build/artifacts/owner-final-1.1/qa-owned-final-handoff.json).
There is no remaining work in the owned QA scope. The owner's separate
run 25352 completed at **2026-10-19T03:34:22.638Z**: all 780 browser checks
and 780 Axe checks passed, with zero errors and 130 actual captures.
The independent review confirmed the canonical and mirror reports match,
and all 130 captured files under `public/previews` are present, nonempty
and byte-identical in both trees. Final Kit packaging and native work remain
separate owner stages.

## Historical checkpoints and validation details

The initial canonical pure appearance and installer tests passed **42/42** on
2026-10-18; the mirror run including adapters passed **46/46**. The strict export
verifier passed for
**44 families × 14 configurations = 616 configured specimens**, plus **28
complete studio examples** in EN/ES. It compiled 733 roots, including 688
virtual consumer TSX payloads, against the actual kit implementations and
package declarations. Its negative control rejected a missing import, missing
named export, invalid button appearance, and invalid radius type.
The latest canonical strict rerun also passed with zero diagnostics across the
same 688 payloads and 733 roots, resolving 63 actual source files. Its report is
`/tmp/aureform-ui-build/artifacts/qa-canonical-checkpoint/examples-validation/validation-summary.json`.
Scoped lint and a typecheck passed; Playwright listed all 44 scenarios without
launching a browser.

The initial 1.1 production checkpoint was executed and archived under
`/tmp/aureform-ui-build/artifacts/qa-checkpoint-1.1-initial/`:

| Runner | Actual execution | Result |
| --- | --- | --- |
| Appearance | 44 scenarios, 301 checks | 32 scenarios passed; 12 failed |
| Motion | 14 scenarios, 49 checks | 2 scenarios passed; 12 failed |
| Clipboard | All 44 families in four dynamic states | 176/176 actual configured clipboard captures agreed with derived configuration |
| Responsive clipboard | 12 actual captures | 8 health checks passed; four failed contrast |

The checkpoint is **not a 1.1 release pass**. It exposed light-theme primary
contrast, chart-tooltip contrast, and an older mirror shader visibility guard.
QA corrections also address stale `#kit` links (1.1 retains the destination),
entrance timing, import-error wording, and same-document preview disposal.
The initial clipboard runner stopped before strict compilation after its
health/completeness failures; that checkpoint has **zero actual clipboard
payloads strictly compiled**. The completed runner now retains all captures and
compiles them even if an independent accessibility check fails.

Expanded canonical tests cover 12 custom extreme colors in both themes.
The checkpoint before the gradient fix ran **60 named appearance tests and seven named
installer tests**: appearance passed **55/60** and installer passed **7/7**.
All 12 palette/theme pairs passed; 19 of 24 custom-extreme profiles passed.
Five custom dark profiles failed: one fractional
brand-tint contrast of 4.49791:1 and four interpolated custom gradients below
4.5:1 (minimum 3.59159:1). Exact profiles and the test log are saved in
`/tmp/aureform-ui-build/artifacts/contrast-extremes-current.json` and
`/tmp/aureform-ui-build/artifacts/contrast-extremes-current.tap`; those are
historical failing evidence. The full 67-test checkpoint is archived under
`/tmp/aureform-ui-build/artifacts/qa-checkpoint-before-gradient-fix/`.

After the owner announced the pure gradient patch and regenerated tokens,
the independent canonical rerun passed **71/71 named tests**: **64 appearance**
(the existing 60 plus four named two-/four-stop tests) and **7 installer**.
All 12 palette/theme pairs and 24 custom-extreme profiles pass. The four added
tests exercise 36 profiles across both themes, all three decorative gradient
kinds, three color sets, reversed stop order, and angles 0/123.5/360.
They require explicit `linear-gradient(angledeg in srgb, ...)`, check the
continuous interior minimum independently, and verify all four control-color
aliases, including last-color fallback for two stops.

The run observed **270 generated primitives**, with no count assertion.
Fingerprints of all 13 checked pure-test/dependency files were unchanged
through execution. Actual results are saved in
`/tmp/aureform-ui-build/artifacts/canonical-pure-gradient-patch.json` and
`/tmp/aureform-ui-build/artifacts/canonical-pure-gradient-patch.tap`;
`latest-canonical-pure-checkpoint.json` and `latest-canonical-pure.tap` point
to this passing checkpoint. The full 688-payload compiler was not rerun for
this color-only patch; its earlier execution remains separately identified.

An additional pure audit exercised the actual browser QA math without
launching a browser. Across those 72 palette/custom/two-/four-stop profiles,
the minimum primary/backdrop ratio was **4.54868001:1** and the minimum
continuous control-gradient ratio was **4.55120984:1**. HEX and rendered-RGB
inputs agreed. A green/magenta negative control had endpoint ratios
14.16687:1 and 6.19847:1 but an interior minimum of 4.24625:1; the completed
browser auditor rejected it. Transparent foregrounds were also rejected.
The full profiles, extrema, and unchanged source fingerprints are saved in
`/tmp/aureform-ui-build/artifacts/contrast-gradient-patch-evidence.json`.
This is math verification, not browser execution.

Installer assertions require the 21 named semantic HEX colors and 15 named
effect tokens, plus the full resolved font/radius/config variables. They
compare generated primitives and all six palette profiles with the real
resolver, require generated control-stop primitives, and verify synchronization
is idempotent. They impose no blanket
token-count limit; the newly generated tokens pass these assertions.

The owner executed the fresh production candidate with real Chromium, rather
than the agent's sandbox-blocked launch attempts. Its actual reports are under
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/`:

| Runner | Actual execution | Result |
| --- | --- | --- |
| Appearance | 44 scenarios, 344 checks | 37 scenarios passed; 331 checks passed; 13 checks failed across seven scenarios |
| Motion | 14 scenarios, 58 checks | Six scenarios passed; 50 checks passed; eight checks failed |
| Clipboard | First Button capture rejected by an outdated expectation | Twelve responsive captures and health checks passed; duplicate filenames prevented strict compilation |

All three reports recorded unchanged sources during execution. They are
**failing candidate evidence, not a 1.1 release pass**. The original reports
and captures are preserved in `appearance-initial-owner-run/`,
`motion-initial-owner-run/`, and `copy-examples-before-contract-fix/`.
The earlier `qa-final-production/20261019T015732Z/launch-sandbox-failures/`
files contain zero browser execution and must never be treated as passes.

The clipboard contract now loads the actual pure `buttonShowcaseSource` from
the live template. It independently checks selected shape, size and material
against the controls and rendered button; audits complete localized local
state, guarded asynchronous saving, loading, input binding and status output;
and requires the full derived appearance wrapper. The browser case also saves
a real preview and checks its disabled, pending, trimmed-name and usable
states. Button selections persist when appearance overrides reset.
Responsive filenames include locale, theme, palette, width, phase and family.

The canonical checkpoint after those two corrections passed **74/74 named
tests**: 67 appearance and seven installer tests. Three new tests strictly
compiled six localized Button configurations with real imports, rejected eight
broken prop/saving/localization variants, and reproduced the old six-filename
collision before proving twelve unique identities. Its report and TAP log are
`owner-final-1.1/qa-contract-fix/pure-tests-report.json` and `pure-tests.tap`.
The full 688-payload compiler was not rerun.
The twelve actual responsive clipboard sources from the failed owner run were
also compiled independently with corrected identities and **zero diagnostics**.
Their source bytes were unchanged. This consumer-only check is saved in
`qa-contract-fix/actual-responsive-consumer-report.json`; it is not a new
browser run or a complete 44-family pass.

The owner's subsequent real clipboard run **passed all 44 families**:
**176 dynamic clipboard payloads plus 12 responsive payloads = 188 actual
sources strictly compiled**, with zero errors and unchanged source fingerprints.
Its report is
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/copy-final/copy-examples-report.json`;
its captured sources are identified by `actualClipboardArtifact` in that report.
This verifies the actual clipboard, displayed code and derived configuration,
including the dynamic localized Button implementation and separate responsive
identities. It is separate from the earlier theoretical 688-payload compiler.

The owner's final unit checkpoint passed **79/79 named tests**: 68 appearance,
seven installer and four adapter tests. The additional appearance test verifies
that targeted reports cannot certify the complete matrix. The actual log is
`/tmp/aureform-ui-build/artifacts/release-1.1-final/unit.log`.
The owner also reported the full lint command passed; its log is `lint.log` in
the same directory. Motion's seven fixture regression checks and the pointer
probe's four checks are separate pure audits, not additional browser passes.

The functional E2E evidence contains **ten passing proofs from two actual
Playwright invocations**:

| Invocation | Actual results | Evidence used |
| --- | --- | --- |
| Owner run 38716, original ten-spec invocation | Nine desktop tests passed; the mobile test failed on its stale Spanish H1 | The nine passing desktop results only |
| Owner run 99937, corrected mobile-only retake | One mobile test passed, zero errors, skips or flaky results; 1,350 ms test / 1,755 ms runner | The corrected mobile result |

The original report remains
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/flows-mobile/e2e-report.json`;
it has **not** been relabeled as a complete suite pass. The mobile retake is
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/mobile-rerun/mobile-report.json`.
It asserts the exact EN/ES dashboard headings, native mobile navigation,
the actual dark default, a native toggle to light, and light-theme persistence
after reload and the switch to English. **Mobile is passed, not pending.**

The owner confirms both runs used the unchanged application served by preview
88953. Playwright's JSON records tests and timing but does not itself capture
build/source hashes; that cross-run application continuity is owner-confirmed.
The consolidation preserves both original report hashes, selected test results,
the excluded historical mobile failure and this provenance distinction in
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/functional-consolidation-report.json`.
It explicitly records `singleFullSuitePassed: false` and `releaseVerified: false`.
Those fields describe the two-run functional consolidation; the final complete
appearance and motion reports separately verify their own runner contracts.

Appearance triage preserved product failures. In the earlier failing candidate,
both emitted CSS chunks retained only a prefixed `-webkit-backdrop-filter`
declaration on `.af-card`; Chromium supported the standard property and rejected
the prefix. That historical evidence is saved in
`qa-contract-fix/compiled-glass-and-magnetic-evidence.json`.
The owner reordered the declarations and confirmed the rebuilt CSS emits both.
The subsequent real EN/ES controls reports independently observed
**`backdrop-filter: blur(18px)`** and passed the material assertions.
Disabled shader range wrappers had also dimmed numeric readouts to 3.17:1.
The owner corrected their opacity placement; final layout/accessibility checks
passed in both controls retakes.

Fixture corrections use a same-origin intercepted document for the
script-free Axe measurement, preserving real fonts and images rather than
using the null origin of `about:blank`. Native no-JS navigation waits for
the actual 220 ms `page-enter` animation, loaded fonts and stable readable
layout. Dialog focus must settle inside the dialog after file validation and
each Tab; no trap requirement is removed. Magnetic pointer testing starts
unfocused, records actual pointer variables and focus guards, and still
requires displacement followed by zero displacement under keyboard focus.
The owner executed the seven selected appearance cases: **four passed and three
failed**, with 59/63 checks passing. EN interchange, EN shader lifecycle and both
no-JS cases passed. Both controls cases failed their magnetic gesture fixture;
ES shader lifecycle recorded a real intermittent React #185 error during native
keyboard range input. That report is preserved in
`appearance-targeted-before-pointer-geometry/appearance-report.json`.

The corrected gesture leaves the target, waits for loaded fonts and eight stable
geometry/scroll observations, verifies the actual hit point, then sends one
native mouse entry. Its read-only timeline records trusted pointer events,
scroll/reset signals, attribute changes and element identity. It requires both
nonzero hook variables and actual CSS displacement, followed by the existing
zero-displacement keyboard focus guard and a new success toast.

The owner's controls retake, run 57101, **passed both EN and ES cases and all
24 checks** with unchanged source fingerprints and no runtime errors. The
actual button displacement was **−4.22 px in EN and −5.08 px in ES**; trusted
native mouse events reached the correct button, and focus/keyboard assertions
passed. The test script fingerprint begins `8806008a9da3973a`.
Its actual report is
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/appearance-controls-rerun/appearance-report.json`.
This targeted pass keeps `releaseVerified` false.

The owner subsequently reported isolated ES shader runs passed in production
and development. Those passes do not erase the real React #185 failure in the
seven-case invocation, and the QA script retains its strict runtime-error
assertion.

The owner then applied the bounded provider prop-sync correction and supplied
the actual native-input diagnostic from build session 17106. Maximum observed
nested updates changed from **9 in EN / 20 in ES to 0 / 0**. The diagnostic
used **1,600 native Arrow inputs plus 16 Home/End inputs**; all sixteen rounds
ended with matching input and appearance values at the expected endpoint, with
zero errors. The browser probe only read React's existing guard; it did not
change the counter or scheduling. Its report is
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/provider-prop-sync/report.json`,
with the underlying `before.json` and `after.json` beside it. This supports
the correction but does not isolate the cause of the earlier intermittent
React #185 failure or substitute for the full appearance run.

The owner's first/repeated-fragment probes confirmed the motion fixture's
immediate history reset and fragment assignment could cause Next to restore
the cleared URL in both DOM and Playwright. The corrected fixture completes
that reset through eight stable URL observations before a separate native
fragment activation. It still requires `#kit` in both URLs, actual scrolling,
a readable destination and the original document.

Catalog readiness now checks actual route content, navigation, language, theme,
overflow and absence of Lenis. The source still has a shared `MotionSystem`
and generic `PageHeading` marker; the catalog case does not claim proof of GSAP
entrance animation. Landing retains its actual intro/reveal style observations,
run-once, Lenis, focus and reduced-motion checks. Card readiness observes its
own CSS presentation.
The motion runner is frozen and mirrored; syntax, scoped lint, real dependency
imports and seven pure fixture checks passed. The owner's final actual motion
run 63930 against the rebuilt preview from build session 17106 **passed all
14 planned scenarios and all 74 checks**, with zero errors and unchanged
source fingerprints. Its authoritative report is
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/motion-rerun/motion-report.json`.
The `MotionSystem` application source fingerprint also matches the earlier
owner run; no motion implementation change was needed. The earlier 58-check
report remains a historical failed checkpoint, not the final motion result.

The owner's subsequent complete appearance run 43816 **passed all 44 scenarios
and all 348 checks**, with zero errors, a complete matrix and unchanged sources.
The final report is
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/appearance-full-final/appearance-report.json`.
Both shader lifecycle cases passed on the corrected provider source, including
the strict native-keyboard and runtime-error checks. The earlier intermittent
React #185 failure remains preserved as historical evidence; it is not a
failure in the final full run. The previous 13/44 progress checkpoint is
superseded by this completed report.
Targeted appearance reports verify only their selected cases and explicitly
keep `releaseVerified` false; they cannot substitute for the complete matrix.

## Reproduce

Run from the fully synchronized mirror after the owner confirms its production
build is ready. Only the assigned QA scripts and tests should be copied from the
canonical workspace; the owner manages application source and build output.

```sh
cd /tmp/aureform-ui-build
node --experimental-strip-types --test --test-isolation=none tests/adapters.test.mjs tests/appearance.test.mjs tests/installer.test.mjs
node scripts/verify-component-examples.cjs
AUREFORM_BASE_URL=http://127.0.0.1:3010 node --experimental-strip-types scripts/verify-appearance.mjs
AUREFORM_BASE_URL=http://127.0.0.1:3010 node --experimental-strip-types scripts/verify-motion.mjs
AUREFORM_BASE_URL=http://127.0.0.1:3010 node --experimental-strip-types scripts/verify-copy-examples.mjs
```

For canonical pure tests while its `node_modules` is empty:

```sh
AUREFORM_QA_NODE_MODULES=/tmp/aureform-ui-build/node_modules node --experimental-strip-types --test --test-isolation=none tests/appearance.test.mjs tests/installer.test.mjs
```

Node 26's default isolated runner previously hid the individual assertions
behind a terse file-level result in this environment. Use `--test-isolation=none`
or execute a test file directly to see every case and failure.

The same appearance cases are executable through Playwright without changing
the repository's existing E2E configuration:

```sh
pnpm exec playwright test --config scripts/verify-appearance.mjs --list
pnpm exec playwright test --config scripts/verify-appearance.mjs
```

Exact owner commands for the 44-case Playwright suite, seven failing-case
rerun, clipboard, navigation probe and existing flows/mobile projects are
saved in
`/tmp/aureform-ui-build/artifacts/owner-final-1.1/qa-contract-fix/owner-commands.md`.
The external `artifacts/owner-final-1.1/e2e-production.config.mjs` preserves
the existing nine desktop flows and one mobile test, uses production port
3010 and disables the repository's port-3001 web-server command.
Their actual execution and the separate corrected mobile retake are recorded
above; the ten passing functional proofs are a consolidation of two runs.

`AUREFORM_QA_CASE_IDS` accepts a comma-separated list of exact appearance case
IDs. Empty IDs within a supplied list, duplicate and unknown IDs are rejected. A targeted report checks
all selected cases exactly once, records the full 44-case matrix separately
and never certifies the release.

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects an installed Chromium binary.
`AUREFORM_QA_SWIFTSHADER=1` explicitly enables the software WebGL backend for the
appearance runner. `AUREFORM_QA_REPORT_DIR` redirects report output.

## What is asserted

- All six palettes in both themes and both locales apply the complete profile
  to the document and preview. Independent WCAG luminance calculations check
  text, muted text, semantic actions, focus rings, chart colors, actual solid
  and gradient button colors at rest/hover. Every adjacent pair has 101
  unrounded sRGB samples plus an independent stationary-point calculation
  using derivative bisection and transfer-function breakpoints. Control CSS
  must explicitly choose sRGB. Native CSSOM serialization of the declaration
  is compared with the actual rendered control image.
- Primary text is checked independently on background, surface, subtle surface,
  accent, and unrounded sRGB brand tints (27% dark / 16% light), including
  black, white, saturated RGB/CMY, gray, near-black, near-white, and the darkest
  background hue. Raw palette colors and the base shade must remain unchanged.
- The studio exercises color validation, normalized hex values, gradient kinds,
  angles, opacity, stop limits/positions, all materials, radius, shadow, border,
  density, typography, six hover choices, native keyboard input, and a real
  preview form submission. Glow requires a named running conic-border animation
  and an advancing computed orbit angle. Keyboard activation must create a new
  visible success toast rather than matching one from an earlier interaction.
  Adding/removing stops checks preservation of the existing configuration and
  verifies complete two-/four-stop rendered control gradients independently.
- Presets save a detached complete snapshot; duplication uses the saved source
  while another profile is active, assigns a unique ID/name, and survives
  reload. Applying and deleting persist. Two actual tabs prove synchronization
  using trusted native storage events. Invalid storage and blocked storage
  have separate recovery cases.
- Actual JSON, CSS, and complete React exports must agree across the visible
  code, a newly reset system clipboard, and downloaded files. JSON round trips,
  CSS includes every resolved variable, and captured TSX compiles strictly with
  real imports. Malformed, unsupported, incomplete, invalid, and oversized
  imports must leave the valid profile unchanged.
- The shader observer preserves native RAF and WebGL. It attributes actual
  draw calls and pending callbacks to each canvas, excluding GSAP tickers.
  It checks the 30 Hz cap, one owned callback, DPR/buffer limits, uniform updates
  without recompilation, retained paused frames, phase on resume, offscreen
  suspension, CSS-hidden hosts, reduced motion, forced colors, explicit off,
  zero speed/intensity, native context loss/restoration, shader kind changes,
  resource disposal, and detached-loop cleanup.
- The clipboard runner checks all 44 families in four actual states: global
  appearance, local material/radius/density overrides, a subsequent global
  theme change, and reset to global settings. All 176 captured values must
  equal `exportConfiguredExample(source, derivedConfiguration)` and preserve
  the original component body and imports. Button uses the real dynamic
  showcase generator plus independent prop, state, saving and localization
  assertions; other families retain their complete catalog sources.
  Twelve EN/ES, light/dark, and
  360/768/1440 px code views add responsive/accessibility checks; all 188 real
  clipboard payloads undergo strict consumer compilation.
- Motion verifies the current expressive/glow default against an independent
  **4 px** vertical lift expectation (gentle is 2 px; off is 0). It uses actual
  current gradient elements and hover cards. Its desktop, mobile, dashboard,
  and scripting-disabled scenarios also check keyboard navigation, live
  preferences, GSAP state, Lenis cleanup, native URL-fragment navigation to
  `#kit`, and accessibility. The runner records that 1.1 has no `#kit` links;
  it does not inject a link or claim a nonexistent click.

## Evidence and limits

Each browser report includes new timestamps, its actual base URL, browser,
source fingerprints, individual checks/failures, and completeness accounting.
Source changes during a run invalidate its acceptance. The appearance runner
writes a report before launch, updates it after every case, and finalizes it
even after failure. Both entry points execute genuine cases; importing the
runner does not silently launch a browser. Failed cases include screenshots
and HTML when available. Downloaded files remain beside the report.

Reports default to `artifacts/appearance-report.json`,
`artifacts/motion-report.json`, `artifacts/copy-examples-report.json`, and
`artifacts/examples-validation/validation-summary.json`. The Playwright entry
point additionally writes `artifacts/appearance-playwright-results.json`.

Deterministic unit tests run the actual shader renderer and environment code
against simulated browser/GPU boundaries; they do not establish browser
performance. Headless draw observations are a scheduler/buffer verification,
not a hardware frame-rate benchmark. Controlled document visibility events
test the real listener and cleanup but do not claim that the OS hid a tab.
No-WebGL and blocked-storage cases explicitly identify their injected API
boundaries. The no-JavaScript document stays scripting-disabled; Axe runs on a
separate script-free copy whose presentation must equal the original.
