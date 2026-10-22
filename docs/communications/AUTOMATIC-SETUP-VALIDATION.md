# Automatic communications setup validation

Reviewed **2026-10-21**, against the working tree based on `1bdf539691dffcd9ff1efb2820aee97f9b89c017`. [The JSON receipt](AUTOMATIC-SETUP-VALIDATION.json) binds the reviewed source and normalized runner results by SHA-256. Git history identifies the containing commit; deployed `build-info.json` identifies publication separately.

This evidence covers automatic configuration source, local demonstrations, private application authentication and injected provider behavior. **No real provider account was configured, browser registered with a carrier, PSTN call made or physical audio verified.** Twilio is the selected first real acceptance target. Telnyx needs its own independent acceptance, including support for the requested short device-credential lifetime.

| Check | Result | Scope |
| --- | --- | --- |
| Root unit suite | **1,036 passed** | Includes 34 setup, 29 connected-host and 10 reference-transport tests. These counts are subsets, not additional tests. |
| Reference backend | **245 passed on Node 22.22.3** | Actual HTTP/server/JWT boundaries with synthetic provider I/O; encrypted restart, unknown mutation, routing drift, credential rotation and active-call races. Includes 75 Twilio account/token rejection and recheck cases. No carrier account traffic. |
| TypeScript / ESLint | **PASS**, zero errors | Installed dependency types; lint warnings are recorded separately in the JSON receipt. |
| Root public browser | **38 passed** | 16 new setup cases and 22 retained softphone cases, using the current static export. |
| Mounted public browser | **38 passed** | Independent run at `/aureform-ui/`, including both languages and setup/provider choices. |
| Setup accessibility and inertness | **12 axe scans**, zero violations at root | The 16 setup cases recorded zero browser errors, failed resources, communications requests or microphone requests. Optional softphone microphone tests have their own scope. |
| Private browser authentication | **PASS**, two axe scans / zero violations | Real owner login and configured-profile read through the private named HTTPS tunnel; two empty, editable Twilio credential inputs. No inspect, apply, voice session or SDK connection. |
| Clean CLI consumer | **PASS**, 40 source files / four assets | Real isolated package installation, eight matching reviewed source copies, strict compilation and four loader assignments using official SDK declarations. |
| Official SDK versions | **Twilio 2.18.5 / Telnyx 2.28.0** | Constructors checked against real installed declarations; no SDK runtime registration. |
| Static exports | **315 prerendered routes / 332 HTML / 25 chapters** | Final root build on Node 22.22.3 and independent mounted destination audit, each with 561 local destinations and no failures. Fresh EN/ES article HTTP readback also passed. |
| Retained Code Connect | **92 templates / 107 source snapshots**, zero diagnostics | Existing templates and authoritative native inputs remain unchanged; local synthetic evaluation only. |
| New setup Code Connect | **Eight native variants / two typed examples / nine guards**, zero diagnostics | Actual native property records and current source hashes; local parserless evaluation, unpublished and unregistered. |
| Earlier softphone source | **20/20 retained hashes match** | Original native map and validation receipts remain unchanged. |

## Figma source

[Page 14 · Communications · Automatic setup](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=585-59) contains the editable extension. Its [source map](../../design/figma/communications-setup-native-source-2026-10-21.json) records four route entries, eight credential variants, twenty flow snapshots, eight connected-host variants, four private reference fragments and four dialog variants.

The [native receipt](../../design/reports/communications-setup-native-receipt-2026-10-21.json) separates bounded structural readback, selected visual inspection and local Code Connect typing. The actual selected PNG was delivered inline by the Figma tool; no local PNG path or checksum is claimed. Responsive/localization coverage, native gradient approximation and universal pixel parity retain the receipt's explicit limits. Native design evidence does not certify account permissions, provisioning or media.

The original 69 route roots, 92 parserless templates and earlier softphone evidence retain their own checkpoints. This extension does not recertify those historical audits.

## Development-server recovery

The tested Turbopack development manifest referenced a missing dynamic chunk, including after a cold restart. The private local frontend passed using the installed Next.js CLI's documented Webpack option:

```sh
NEXT_PUBLIC_BASE_PATH='' pnpm dev --webpack --port 3000
```

The CLI guide is distributed at `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`. Production static exports passed with Turbopack independently. No bundler switch or private backend address is embedded in the public deployment.

## Reproduce and complete real acceptance

```sh
pnpm test
pnpm verify:communications-backend
pnpm typecheck
pnpm lint
pnpm verify:code-connect
pnpm verify:communications-design
pnpm verify:examples
pnpm verify:integrations
NEXT_PUBLIC_COMMUNICATIONS_BACKEND_URL='' pnpm build
pnpm verify:pages
pnpm verify:communications-ui
```

For a mounted export, set `NEXT_PUBLIC_BASE_PATH=/aureform-ui` for its build, destination audit and browser checks. The [setup guide](AUTOMATIC-SETUP.md) documents private initialization, both provider fields, the existing-number review and bounded test authorization.

The operator must separately verify actual provider readback, signed webhook delivery, SDK registration, ringing, two-way audio, termination and billing behavior. Configuration readback and browser readiness remain separate from a verified call. The reference keeps call/session/queue state in memory and is a single-owner laboratory, not a production contact-center certification.

Twilio account inspection, planning and apply reject a non-Full or unverifiable account type and a missing, masked, malformed or nonmatching primary token. The adapter rechecks after awaiting the durable intent, before each configuration effect and before returning success. Synthetic cases verify zero subsequent writes on rejection and preservation of already checkpointed resources/secrets. These local guards do not prove the response of a real account or provide a provider-side transaction. [Twilio prerequisites and official sources](AUTOMATIC-SETUP.md#twilio-prerequisites) are recorded separately.
