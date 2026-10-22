# Communications implementation status

Source review date: **2026-10-21**. This document supplements the original research and RFCs; it does not replace their proposed phases or certify a production contact center.

The initial Softphone [validation record](VALIDATION.md) and [machine-readable receipt](VALIDATION.json) retain the reviewed working tree at base commit `966a00586d4d7d48bbe1ed16416323247fe68694`, with source hashes. That checkpoint includes 963 passing root tests, 54 passing backend tests, compilation against two installed official browser SDKs, 18 reference-backend/browser-schema interop stages, a strictly compiled CLI consumer and the mounted static export. Its final local-demo browser E2E passed **22/22 at root and 22/22 mounted**, with no skipped, unexpected or flaky cases. Implemented native Figma source passed scoped readback: 14 Light/Dark state previews, 12 compositions and 10 dialogs. Source hashes identify the reviewed files; deployment verification is separate and the deployed `/build-info.json` identifies its Git commit.

The subsequent [automatic setup reference](AUTOMATIC-SETUP.md) and [separate validation receipt](AUTOMATIC-SETUP-VALIDATION.md) extend that checkpoint with a two-field provider wizard, encrypted provisioning journal, connected consumer host and authenticated private laboratory. Its public browser suites passed **38/38 at root and 38/38 mounted**; the private browser check verifies owner authentication and empty editable Twilio fields only. [Page 14 in Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=585-59) records the editable source and its bounded structural/visual checks. **Real account configuration, SDK registration and audible carrier calls remain unverified.** Twilio is the selected first real acceptance target and requires an active Full account, primary Auth Token and eligible owned US1 voice number.

## Scope and evidence

The current coding slice targets one browser agent, an inbound offer, business hours, a FIFO queue and call controls through an editable adapter contract. The default experience is local. A Twilio or Telnyx label in that experience does not establish a carrier connection.

| Layer | Evidence boundary |
| --- | --- |
| Domain contracts | [Typed snapshots, commands, errors and demo scenarios](../../src/lib/communications/contracts.ts). Provider references remain optional; local calls must not fabricate carrier IDs. |
| Business hours | [Validated IANA timezone policy](../../src/lib/communications/business-hours.ts), Monday–Friday 08:00–18:00 Bogotá by default. Holidays are explicit ISO dates, with no bundled official country calendar. |
| Demo fixtures | [Fictional callers and fixed local history](../../src/lib/communications/fixtures.ts). Fixture timestamps and completed calls are not observed carrier events. |
| Demo adapter | [In-memory state machine](../../src/lib/communications/demo-adapter.ts) with no network, SDK, audio capture, microphone prompt or browser storage. Local controls, bounded history/events, explicit scenarios and teardown are implemented. |
| Softphone frontend | The [workspace](../../src/components/blocks/softphone-workspace.tsx), [controlled call surface](../../src/components/blocks/softphone.tsx) and [suite template](../../src/components/templates/softphone-template.tsx) are built. Source includes session/presence/provider controls, demo scenarios, context/queue tabs, notes, capability-gated controls, history/CSV, hours, audio checks and recovery. Live and complex local hours are read-only. Source review is not browser interaction proof. |
| Device checks | [Explicit microphone and speaker hook](../../src/hooks/use-softphone-audio.ts). Source includes a four-second temporary microphone meter, track cleanup and denied/unavailable/error states. Final browser tests exercise denial, unavailability and late-stream cleanup with stubs; actual device permission, microphone capture and audible output remain unverified. |
| Live client | [`createLiveCommunicationsAdapter`](../../src/lib/communications/live-adapter.ts) implements the versioned session/command/SSE contract, scoped snapshots and native-leg correlation. Construction has no network or SDK side effects; connection requires a consumer SDK factory. Fake-SDK/mocked HTTP/SSE tests and 18 actual reference-engine/browser-schema stages passed. These are separate from an authenticated browser-media flow; no real carrier call is certified. |
| Provider SDK bindings | [Twilio](../../src/lib/communications/twilio-browser.ts) exports `createTwilioBrowserVoiceClient`; [Telnyx](../../src/lib/communications/telnyx-browser.ts) exports `createTelnyxBrowserVoiceClient`. The consumer installs the optional official SDK and supplies its factory/loader. Structural factories compiled against installed `@twilio/voice-sdk` 2.18.5 and `@telnyx/webrtc` 2.28.0. Runtime tests use fake native SDK objects. Actual SDK connection, browser media, real calls and uninterrupted token/media renewal remain unverified. |
| Backend laboratory | The [standalone server](../../examples/communications-backend/server.js), [engine](../../examples/communications-backend/lib/engine.js), [provider operations](../../examples/communications-backend/lib/providers.js) and [signature/session helpers](../../examples/communications-backend/lib/security.js) have landed. Carrier operations are disabled by default and the example approval list is empty. Local domain/security/HTTP tests passed with fake carriers. The [setup guide](../../examples/communications-backend/README.md) and [implementation reference](INBOUND-VOICE-REFERENCE.md) document each topology and its limits. A reference server is not a hosted service or a production security certification. |

Local unit tests, UI inspection, native Figma readback and real carrier calls are separate evidence classes. No local provider switch can substitute for independently testing both providers.

The [suite session host](../../src/lib/communications/demo-session.ts) retains demo state across same-tab client navigation in memory, without browser storage. The standalone [consumer example](../../examples/communications-softphone.tsx) uses a workspace-owned adapter. Consumers own the teardown and retention of an injected adapter.

The read-only local CLI inventory confirms `softphone-workspace`, the separate controlled `softphone`, and `softphone-template`. Optional source entries are `communications-demo`, `communications-live`, `twilio-browser-voice` and `telnyx-browser-voice`; the official browser SDKs remain consumer-installed dependencies. Public registry/deployment publication is a separate step; this source-side review does not certify the deployed artifact.

The automatic extension adds `communications-setup-contracts`, `communications-setup-live`, `communications-setup-demo`, `communications-setup`, `connected-softphone` and `communications-softphone-template`. The new template retains the local softphone and opens an inert setup demonstration; an authenticated private consumer can inject the live connection. This distinction is explicit in the [setup guide](AUTOMATIC-SETUP.md). The existing domain, live-client and controlled softphone contracts remain intact.

A direct source-level Node smoke check on 2026-10-21 passed for both local provider selections: connect, two arrivals/FIFO, accept, mute, hold/resume, DTMF, notes, hangup/history, retained-offer disconnect/reconnect and an explicit holiday closure. It also checked demo-only events, absent carrier IDs and unchanged microphone permission. This is local adapter evidence, not a browser test or a real carrier call.

The landed [domain test suite](../../tests/communications-domain.test.mjs) also passed on 2026-10-21:

```sh
node --experimental-strip-types --test tests/communications-domain.test.mjs
```

It covers timezone/DST boundaries, explicit date overrides, FIFO admission, capacity, timeouts, duplicate commands, interrupted answers, recovery, bounded notes/history/events and cleanup. Its simulated clocks and local adapters do not exercise a provider SDK, backend or real media.

The [client/provider tests](../../tests/communications-providers.test.mjs) and reference backend suites also passed on 2026-10-21:

```sh
node --experimental-strip-types --test tests/communications-providers.test.mjs
cd examples/communications-backend
node --test test/domain.test.js test/http.test.js test/security-providers.test.js
```

The final root run passed 963 tests, including the provider module suite; the separate reference backend run passed 54 tests. These use synthetic tokens, fake native SDK objects, fake carrier transports and loopback HTTP. The backend also tests local token minting with the actual Twilio server SDK; this makes no carrier request. The installed CLI consumer passed strict TypeScript with 29 distinct source files and four communication assets, whose hashes matched the current source. Repository `pnpm typecheck` passed. `pnpm lint` passed with zero errors and one warning in `design/rebuild-plugin/backend.js`; it was not warning-free.

A subsequent cross-module proof supersedes the earlier initial/queued-only check. It fed actual reference `InboundEngine` envelopes and commands, with injected synthetic provider observations, into the actual browser Zod parser. Nine stages passed independently for each provider: session, queued null IDs, owned offer, accept intent, connected observation, mute/DTMF/notes, hangup retaining remote state, disconnect reconciliation and terminal reason/history. All 18 stages passed with zero provider requests. This demonstrates those reference state/schema boundaries, including terminal history; it does not demonstrate a complete authenticated HTTP/SSE/official-SDK browser lifecycle or audible media.

The mounted build contains 315 prerendered routes. Its final export check passed for 332 HTML files, 25 documentation chapters and 560 unique local destinations, with no failures. The bounded manual browser receipt covers active local-demo views at desktop light/dark 1440px and mobile light 390px: body width equalled viewport width, Twilio images loaded, and no errors were recorded. [Light](../images/aureform-softphone-light.webp) and [dark](../images/aureform-softphone-dark.webp) desktop captures are available. This is not a full responsive, accessibility or lifecycle certificate.

The final [browser suite](../../tests/e2e/communications.spec.ts) passed all 22 cases at root in 35.8 seconds and all 22 against the mounted static build in 21.4 seconds. It exercises both local provider selections in EN/ES, call controls/history, queue/admission/recovery, explicit hours/dates, 390px layout, keyboard/focus, navigation retention/reset and browser-stub microphone denial/unavailability/late-track cleanup. Default axe rules found zero violations in the active EN/ES workspace in both runs; the server/browser-clock disagreement case recorded zero hydration errors. Source guards confirmed unchanged tested files and matching mounted copies where present. The earlier mounted 404 was a corrected preview-base-path configuration issue, superseded by the final full pass. These results do not test physical audio, live SDK registration or carrier media.

Retained Code Connect compatibility passed for 92 templates against 103 recorded current sources, using a synthetic Figma API stub and strict source/example compilation. The [manifest](../../.figma/code-connect-manifest.json) records `sourceCompatibilityRefresh`: 12 source digests refreshed, comprising three changes in this work and nine pre-existing HEAD digest drifts. Native ledgers and template bytes were retained. `verify:examples` and `verify:integrations` also passed. These checks do not publish Code Connect or certify the new Softphone native design.

## Local acceptance workflow

Validate connect/disconnect, available/away/offline presence, one offered or active call, FIFO ordering, accept/decline, mute, hold, DTMF logging, notes and terminal history. Include ring timeout, overflow, closed hours, an explicit holiday override and disconnect/reconnect.

Check that failed or cancelled commands cannot leave an orphaned call, that teardown stops timers and subscriptions, and that forbidden state transitions report an error. Test both local provider selections without interpreting those tests as carrier compatibility.

Microphone access requires an explicit browser action. Denied, unavailable and recovered permission states need their own checks. Demo call state alone proves neither microphone permission nor audio transport. Use fictional data; do not persist private call notes or access tokens in a public demonstration.

## Gates before real carrier acceptance

| Gate | Required evidence |
| --- | --- |
| Backend authority | Authenticated and tenant-scoped sessions, short-lived browser tokens, authorized commands and server-owned routing. A static Cloudflare/Pages deployment remains the frontend only. |
| Event handling | Provider signature checks, bounded replay protection, idempotency, out-of-order/duplicate events, reconciliation and disconnect recovery. |
| Twilio | An explicitly authorized real incoming call through that provider, with offer, accepted audible media, control behavior, termination and correlated backend events. |
| Telnyx | The same independent end-to-end evidence through that provider. Shared frontend contracts do not waive this check. |
| Media reliability | Actual browser/SDK errors, microphone denial, network loss, concurrent arrivals, agent loss and failed commands. Honor reported capabilities; an unsupported live hold/DTMF control must stay unavailable. Measure latency rather than inferring it from UI state. |
| Costs and consent | Explicit authorization for numbers, calls and paid resources; review applicable consent, recording, emergency, privacy and jurisdictional obligations before enabling the relevant functions. |
| Operations | Retention/deletion, redaction, abuse controls, quotas, secret rotation, monitoring, incident recovery and provider upgrades. |

No production rollout or paid carrier action is authorized by the research roadmap itself. Refer to [SECURITY-COMPLIANCE.md](SECURITY-COMPLIANCE.md) for the fuller threat and compliance analysis.

The backend's [example schedule](../../examples/communications-backend/lab-config.example.json) uses `America/New_York`, 09:00–17:00; it is independent of the frontend's Bogotá default. The domain and reference backend contain separate hours evaluators. The demo can offer already admitted callers after closing; the reference backend stops new offers when service hours close. Choose and test the desired server policy; the browser's open-hours badge is not routing authority.

The workspace reads optional `snapshot.caps` for mute, hold and DTMF. The live client intersects backend grants with the confirmed usable native leg, registration and state; missing grants, pending/mismatched IDs or a lost SDK connection are not support. The reference backend advertises `hold: false`, so its live hold control must remain unavailable even though local demo hold is implemented. Live hangup does not synthesize remote termination: the reservation remains until a reconciled terminal observation.

The reference backend is one process with bounded memory, not a durable multitenant service. It lacks production OIDC, SQL/outbox, persistent audit, HA and distributed abuse controls. A restart loses its ledgers; unknown remote calls need operator reconciliation. Operational duration/action limits do not guarantee a financial cap. Review jurisdiction, consent and account eligibility before an authorized carrier laboratory session.

No real PSTN call, physical microphone/speaker audio, production security or live Telnyx inbound-only policy is certified. The Telnyx laboratory rejects ambiguous/outbound-enabled policy fixtures, but real account restrictions and browser credentials still require independent acceptance. Token-shape/expiry checks do not verify provider grants or signatures; SDK renewal, autoplay, mobile background behavior and media continuity remain unmeasured.

The [communication artwork manifest](../../public/assets/communications/manifest.json) records original official Twilio/Telnyx files and source hashes. Technical asset/render checks do not grant trademark rights. The marks are excluded from the Apache grant; express written permission for Twilio's corporate logo has not been established.

## Design source and limits

The existing native design is research material: [desktop](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=317-298), [Softphone state set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=313-167), [mobile light](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=538-1520) and [mobile dark](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=542-1807). IDs are recorded in the [native source ledger](../../design/reports/communications-native-source-2026-10-21.json).

The [implemented source supplement](../../design/reports/softphone-native-source-2026-10-21.md) records the new workspace, state set, dialogs and actual source hashes separately from those research nodes. Its scoped native readback and two local Code Connect templates passed; [VALIDATION.json](VALIDATION.json) links the evidence. Native chrome and radial washes remain approximate, so exact pixel parity is not certified. Browser accessibility/layout checks are separate; exhaustive coverage and carrier behavior remain unverified.

## Further scope

The automatic extension implements reviewed routing configuration for an existing owned number and the internal resources needed by the reference inbound topology, with synthetic provider tests. Number purchase, porting and release remain outside this slice, as do outbound PSTN dialing, SMS/MMS, WhatsApp and WhatsApp Calling, transfers, conferences, voicemail/callback execution, recordings, campaign dialing, voice AI and Prompt-to-Flow. The original [ROADMAP.md](ROADMAP.md) and provider [CAPABILITY-MATRIX.md](CAPABILITY-MATRIX.md) describe the broader investigation, not features certified by this frontend work.
