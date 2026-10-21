# Softphone validation

Reviewed **2026-10-21**. Base HEAD: `966a00586d4d7d48bbe1ed16416323247fe68694`. The evidence concerns the **unreleased working tree**, identified by the repository-relative source hashes in [VALIDATION.json](VALIDATION.json). Deployment verification is separate: the deployed `/build-info.json` identifies its Git commit. These local results do not attest a deployed release.

The frontend, reference backend and optional provider bindings have bounded local evidence. **No real PSTN call, physical audio, complete authenticated browser-media flow, production certification or live Telnyx inbound-only certification is claimed.** See [implementation status](IMPLEMENTATION-STATUS.md) for scope and production gates.

## Evidence reviewed

| Check | Observed result | Boundary |
| --- | --- | --- |
| Root unit run | **963 passed**, zero failed, cancelled or skipped | Local tests; includes communications domain and fake-SDK/mocked HTTP/SSE provider tests. |
| Reference backend run | **54 passed**, zero failed, cancelled or skipped | Synthetic carriers, loopback HTTP and local Twilio server-SDK token minting; no provider traffic. |
| Root TypeScript | **PASS**, `tsc --noEmit` | Current repository source compilation. |
| Root ESLint | **PASS**, zero errors, **one warning** | `design/rebuild-plugin/backend.js:44`: unused `afRebuild`. |
| Installed official browser SDK types | **PASS**, two packages | `@twilio/voice-sdk` **2.18.5** and `@telnyx/webrtc` **2.28.0**, TypeScript 5.9.3, strict/noEmit. `skipLibCheck` skips upstream declaration diagnostics; consumer factory/loader signatures remain checked. No official browser SDK was connected. |
| Reference engine → browser schema | **18 stages passed**, nine per provider | Actual engine/envelopes/commands and actual browser parser, with injected provider observations. Zero provider requests; no browser SDK runtime. |
| Installed CLI consumer | **PASS**, **29** distinct source files + **4** assets | Installed `softphone-workspace`, `communications-live`, `twilio-browser-voice`, `telnyx-browser-voice`. All recorded source/target hashes matched. Strict TypeScript rerun passed without emission or incremental writes. |
| Mounted build/export | **315** prerendered routes; successful export | Build manifests inspected. The number of generated routes differs from the final HTML-file count. |
| Final mounted destination audit | **332 HTML / 25 chapters / 560 local destinations / 0 failures** | Read-only rerun of the actual export verifier at `/aureform-ui`; static output and links, not browser media or deployment. |
| Manual local-demo browser check | **3 active views**, no recorded errors | Desktop light/dark 1440px and mobile light 390px; body width matched viewport, and both displayed Twilio image instances loaded in each view. |
| Final root browser E2E | **22/22 passed**, **35.8s** | Local demo, EN/ES; zero skipped, unexpected or flaky cases, all retries zero. |
| Final mounted browser E2E | **22/22 passed**, **21.4s** | Independent full run against the static build at `/aureform-ui`, with the same zero skipped/unexpected/flaky/retry result. |
| Retained Code Connect | **92 templates / 103 source snapshots**, zero diagnostics | Synthetic Figma API stub; strict emitted examples checked against canonical source/dependencies. No live Figma runtime or cloud registration. |
| Canonical examples | **PASS**, 688 typed payloads across 44 families | Strict source/example compilation; negative controls detected the expected invalid cases. No browser runtime. |
| Integration examples | **PASS**, 11 typed payloads | Strict TypeScript; no provider execution. |
| Communication artwork | **PASS**, two original official assets; 24 static logo renders | Hash/byte/XML checks and root/mounted paths. Source provenance is not a trademark permission grant or native Figma proof. |

The root total includes provider tests; it must not be added to the provider module count as if they were independent tests. The backend total is a separate run.

The public JSON embeds normalized summaries and SHA-256 digests of the inspected runner artifacts. Raw external logs/receipts are not published by this documentation task, so their public paths are `null`. Public source and screenshot references use repository-relative paths.

## Reference interop scope

The 18-stage proof replaces the earlier two-provider initial/queued-only check. Each provider passed:

1. Session envelope.
2. Queued call with pending native IDs represented as `null`.
3. Offered call with an owned reservation.
4. Accept intent.
5. Injected connected observation.
6. Mute, DTMF and notes.
7. Hangup retaining remote state until reconciliation.
8. Disconnect reconciliation.
9. Terminal end reason and history.

These are actual reference-engine/browser-parser boundaries with synthetic provider effects. They do not establish network authentication, real webhook delivery, official SDK registration, microphone access or audible call termination. The independent fake-SDK tests and installed-package compile proof cover different boundaries.

The live client exposes controls only when backend grants and a confirmed usable native leg/state/registration agree. The reference backend grants no live hold. Its policy fixtures reject ambiguous Telnyx outbound access; they do not certify a real Telnyx account as inbound-only.

## Browser evidence

Published desktop viewport captures: [light](../images/aureform-softphone-light.webp) and [dark](../images/aureform-softphone-dark.webp), both 1440×1000. They show the simulated active-call workspace, not a carrier call. The 390px mobile-light result is recorded in the inspected browser receipt; that capture has no published path in this record. Mobile-dark, exhaustive responsive behavior, accessibility and physical-device audio are not certified by these captures.

The final [22-case suite](../../tests/e2e/communications.spec.ts) passed independently at root and against the mounted static build. Both runs cover EN/ES local Twilio/Telnyx selections, controls/history, FIFO/admission/recovery, schedules/date overrides, 390px layout, keyboard/focus, navigation retention/reload/reset and browser-stub microphone denial/unavailability/late-track cleanup. The source guard confirmed unchanged tested files and matching mounted source copies where present.

Default axe rules reported **zero total and critical violations** within the active `#softphone-workspace` in EN/ES in both runs. The server/browser-clock disagreement case reported **zero console, page and hydration errors** in each run. This is scoped accessibility and temporal-hydration evidence, not all-state/whole-site accessibility or physical-device certification.

The earlier mounted preview 404 was corrected by restarting the preview with its `/aureform-ui` base path. Both final EN/ES mounted routes returned 200 and the full mounted suite passed. Historical configuration failures are superseded, not interpreted as a remaining source failure.

## Source compatibility provenance

The [retained Code Connect manifest](../../.figma/code-connect-manifest.json) records `sourceCompatibilityRefresh` at `2026-10-21T22:48:17.324664+00:00`: **12** current source digests refreshed, comprising **3** changes in this work and **9** pre-existing HEAD digest drifts. All 12 refreshed hashes matched the inspected source. Native ledgers and retained template bytes were unchanged by that refresh.

The local check evaluated 1,312 top-level cases, 338 variant combinations and 556 distinct typed examples. Its `liveFigmaRuntimeTested` and `cloudRegistered` flags are false. These retained templates do not certify a new Softphone binding or native/browser parity.

Official Twilio/Telnyx artwork provenance is recorded in the [asset manifest](../../public/assets/communications/manifest.json). Original SVG bytes and colors were preserved. The logos have no separately established open-source license and are excluded from Aureform's Apache grant. Twilio's corporate-logo permission has not been established; technical validation does not resolve that usage condition.

## Handoff and carrier acceptance

| Gate | Status at this review | Evidence to add |
| --- | --- | --- |
| Complete root E2E | **PASS, 22/22** | Final normalized run, exact cases/measurements and inspected receipt/report hashes are embedded in `VALIDATION.json`. |
| Complete mounted E2E | **PASS, 22/22** | Independent final normalized run at `/aureform-ui`, with source guards and the same embedded evidence. |
| Implemented native Figma source | **PASS, scoped readback** | [Current source map](../../design/figma/softphone-native-source-2026-10-21.json): 14 Light/Dark state previews, 12 compositions, 10 dialogs, 20 source hashes and actual native screenshots. |
| Publication source | **Checked separately** | Git history identifies these files; `/build-info.json` identifies each deployed build. This receipt records local validation, not a release certification. |
| Twilio real carrier/media acceptance | **NOT DEMONSTRATED** | Independently authorized incoming-call test, correlated backend/SDK events, audible media, controls and termination. |
| Telnyx real carrier/media and inbound-only acceptance | **NOT DEMONSTRATED** | Independent account-policy/credential checks and the same real-media acceptance. |

The [implemented native source](../../design/reports/softphone-native-source-2026-10-21.md) is separate from the research prototypes. Scoped readback and selected visual reviews passed; native radial background washes remain approximate, and exhaustive pixel parity is not certified. Two new parserless templates passed 23 synthetic/emitted-source cases. These local templates are unpublished and unregistered.

## Reproduce local checks

Run from the repository with its dependencies installed:

```sh
pnpm test
pnpm verify:communications-backend
pnpm typecheck
pnpm lint
pnpm verify:code-connect
pnpm verify:communications-design
pnpm verify:examples
pnpm verify:integrations
pnpm verify:communications-ui
```

For an existing mounted static export, run `NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm verify:pages` from that source/export checkout. In the installed CLI consumer, run `tsc --noEmit --incremental false` with `strict: true`. The [English](../website/en/communications.md) and [Spanish](../website/es/communications.md) guides document installation and adapter setup.

None of these commands authorizes paid calls, number purchases or other carrier operations. Full carrier acceptance still requires a separately secured backend, explicit consent/cost authorization and independent evidence for each provider.
