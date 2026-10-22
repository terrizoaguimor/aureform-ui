# Communications

`SoftphoneWorkspace` is an editable inbound softphone block. Its default adapter runs a local demonstration: provider names identify simulated Twilio or Telnyx scenarios, without buying numbers, connecting a carrier or placing real calls.

The public suite's **Configure provider** button opens a read-only credential/number/review wizard. Live account setup is available only in a deliberately configured authenticated consumer; a provider button does not register the SDK or authorize a call.

## Mount the local softphone

From the checkout, copy `softphone-workspace` into a [configured consumer](cli.md). Preview first, then apply and install the merged dependencies:

```sh
node bin/aureform.mjs add softphone-workspace --cwd ../my-product --diff
node bin/aureform.mjs add softphone-workspace --cwd ../my-product
pnpm --dir ../my-product install
```

`softphone` is the separate controlled call surface; `softphone-template` is the suite composition. Include global styles and the existing providers. The [complete example](../../../examples/communications-softphone.tsx) mounts the default demo:

```tsx
"use client";

import { Providers } from "@/components/providers";
import { SoftphoneWorkspace } from "@/components/blocks/softphone-workspace";

export default function SoftphonePage() {
  return (
    <Providers locale="en">
      <SoftphoneWorkspace />
    </Providers>
  );
}
```

The [block](../../../src/components/blocks/softphone-workspace.tsx) accepts:

| Prop | Behavior |
| --- | --- |
| `adapter?: CommunicationsAdapter` | Omit it for an owned local adapter. An injected adapter owns its provider, state and lifetime. |
| `defaultProvider?: "twilio" \| "telnyx"` | Initial provider for the owned demo; defaults to `"twilio"`. It does not override an injected adapter. |
| `onDemoProviderChange?: (provider: CommunicationsProvider) => void` | Optional callback for a host that supplies stable demo sessions. It does not switch live calls. |
| `className?: string` | Additional classes on the workspace container. |

Create a custom adapter inside a Client Component; its methods and subscriptions cannot cross a Server Component boundary as serialized props. Provider selection is disabled while connected, while a call/queue exists, or for a live adapter.

## Exercise the inbound workflow

1. Select **Connect session** and set **Agent availability** to **Available**.
2. Keep **During business hours** selected and press **Simulate incoming call**. The agent has one offered or active call; additional admitted callers appear in **Queue** in FIFO order.
3. Select **Answer**, then try **Mute**, **Hold** and **Save notes**. Select **Resume** before opening **Keypad**.
4. Select **End call** and inspect **Call history** or **View** details. Declined, timed-out, closed-hours, holiday and overflow arrivals have distinct terminal reasons.
5. Select **Test recovery**, then **Reconnect** to resume the retained session.

Demo mute and hold change local state. Demo DTMF records keypad digits; it sends no carrier tones. The included caller identities and history are fictional. A provider switch in this demo is not a live-call migration or an independent compatibility test.

Signaling loss retains the current local call and pauses an unanswered offer's ring timeout. Reconnect to resume it. Hours are evaluated when a caller arrives; an already admitted caller remains eligible after closing.

## Configure hours and explicit holidays

The [business-hours policy](../../../src/lib/communications/business-hours.ts) defaults to Monday–Friday, 08:00–18:00 in `America/Bogota`. Opening is inclusive; closing is exclusive. In **Business hours**, edit days, the time range and timezone, add one `YYYY-MM-DD` holiday per line, then select **Save hours**. No official Colombian or other national holiday calendar is bundled. Live schedules and complex local schedules with different daily hours or multiple periods per day are displayed read-only; edit those policies in the host application.

```ts
import { createDefaultBusinessHoursSchedule } from "@/lib/communications/business-hours";

const schedule = createDefaultBusinessHoursSchedule();
schedule.holidays = [
  { date: "2026-10-21", label: "Local test closure" },
];
```

This date is a test closure, not a claim that the date is a public holiday. Apply the policy through `setSchedule(schedule)` on an adapter created with [`createDemoCommunicationsAdapter`](../../../src/lib/communications/demo-adapter.ts). Validation rejects invalid dates, timezones and overlapping intervals.

The workspace's scenario selector is an explicit test override, including its default **During business hours** option. It does not change the **Open/Closed** policy badge. Calling `simulateIncoming()` without a scenario evaluates the configured schedule at arrival.

## Microphone, recovery and data

The demo adapter requests no microphone access and captures no audio. Open **Audio** and select **Test microphone** for the separate [device check](../../../src/hooks/use-softphone-audio.ts): it requests permission, meters a temporary stream for four seconds and stops its tracks. It does not record or upload the stream. **Play test tone** checks the browser's default speaker output.

Handle denied and unavailable access before connecting real media. After a denial, review the browser's site permissions before retrying. A microphone check needs a supported secure browser context. A locally accepted call does not prove microphone access, audible media or a PSTN connection.

The demo adapter keeps bounded history, events and notes in memory, without localStorage, sessionStorage, cookies or a database. `reset()` restores the local fixtures; `dispose()` stops pending work and subscriptions. Use fictional data in the public demo. A consumer backend must own authenticated call state, notes, retention and deletion policies. Do not put carrier secrets, access tokens or private caller information in browser storage, public environment variables or static assets.

The [suite template](../../../src/components/templates/softphone-template.tsx) keeps demo sessions across client navigation in the same tab using an [in-memory host](../../../src/lib/communications/demo-session.ts). A full reload starts fresh. **Reset demo** restores that provider's fixtures. **Export CSV** deliberately downloads caller addresses and history metadata, without call notes; apply your own export policy for real data.

## Connect and configure a provider

The [CommunicationsSoftphoneTemplate](../../../src/components/templates/communications-softphone-template.tsx) wraps the existing local template. With no live configuration it keeps the softphone demo and opens **Configure provider** with read-only fixture credentials. Do not enter real secrets in the public demo.

An authenticated consumer supplies `connection?: ConnectedSoftphoneLiveProps` or configures the private [ReferenceConnection](../../../src/components/communications/reference-connection.tsx). The [ConnectedSoftphone](../../../src/components/communications/connected-softphone.tsx) host owns the wizard and resulting live adapter. The carrier form has exactly two fields:

| Provider | Fields | Server-managed resources |
| --- | --- | --- |
| Twilio | **Account SID** and **Auth token** (primary) | Owned Standard API key/one-time secret and fixed inbound/status routes. |
| Telnyx | **API key** and **Public key** | Call Control Application and separate browser Credential Connection. |

Select an **existing owned voice-enabled number**, review the plan and confirm any replacement of its current routing. There is no number purchase, automatic dialing or extra carrier resource-ID field. Twilio's current setup uses US1 REST; account/region permissions still apply.

For Twilio, use an active **Full** account and its **primary Auth Token**. [Trial blocks the required `<Dial><Client>`](https://www.twilio.com/docs/usage/trials/try-out-voice), and [webhook signatures use the primary token](https://www.twilio.com/docs/usage/security). Sources consulted **2026-10-21**. The backend verifies these prerequisites before configuration effects; it does not upgrade an account or promote tokens. Account type or token identity that cannot be verified is rejected. The [setup guide](../../../docs/communications/AUTOMATIC-SETUP.md#twilio-prerequisites) explains the resulting account/credential errors.

Numbers using Twilio's documented **implicit US1** region are supported after account and number verification. Only the region endpoint's valid JSON `404` / `20404` response qualifies; other failures remain errors and an explicit non-US1 region is rejected. [The correction and evidence](../../../docs/communications/AUTOMATIC-SETUP-REGION-FIX.md) explain the previously misleading gateway/CORS error. Setup dependency failures now return redacted JSON with HTTP 503. Neither planning nor an error automatically applies routing or retries a provider write.

Initialize the separate private Node laboratory from the checkout, replacing the example domains with your owned HTTPS backend and exact frontend origin:

```sh
cd examples/communications-backend
npm ci --ignore-scripts --no-audit --no-fund
npm run setup:init -- --public-origin https://voice.example.com --frontend-origin https://app.example.com
npm run setup:serve
```

Owner files default to `~/.config/aureform-communications`, outside Git. Initialization refuses overwrites and writes `.env` last. It generates a separate **Owner access code** and a **32-byte** encryption key for the AES-256-GCM setup file. The owner login is application authentication, not a third carrier credential.

The consumer can set `NEXT_PUBLIC_COMMUNICATIONS_BACKEND_URL=https://voice.example.com/v1/communications`. This approved HTTPS URL is public and embedded at build time; it must never contain a key, token or owner code. Keep it unset in the public site. `PUBLIC_BASE_URL` on the backend is the exact external HTTPS **origin**, without the API path; allow the frontend's exact origin and preserve signed webhook request bodies.

For Cloudflare, use a [named tunnel](https://developers.cloudflare.com/tunnel/get-started/): [Quick Tunnels lack SSE and interactive email authentication cannot serve machine webhook clients](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/). Keep credentials/token files and private hostname configuration outside Git. Webhooks use provider signatures, not an interactive login redirect; session streaming must retain [`text/event-stream`](https://developers.cloudflare.com/tunnel/troubleshooting/). Tunnel health does not establish media success.

Choose the provider before owner login; it stays locked afterward. The ten-minute owner bearer remains in memory. **Renew owner access** keeps the owned live call/session mounted. After login, authenticated GET `/v1/communications/setup/connections` returns at most two redacted configured summaries. A selected saved profile is validated through `ConnectedSoftphone.initialConfiguration`, without inspecting again, creating another key, applying routing or auto-connecting.

Use **Inspect account** → select number → **Review setup** → confirm changes → **Connect and configure**. **Number configured** means configuration readback, not delivery of a signed webhook; browser connection is separate from audio or a real test. Use **Connect session** separately. If a dispatched apply times out or is cancelled, use **Check setup status**: the private mutation journal blocks blind retries and does not offer automatic rollback. Persisted `configuring`, `unknown` or `failed` setup blocks another plan/apply for the same provider + selected number ID, even after another inspection or a process restart.

For an explicitly authorized incoming test, connect the browser, select **Available**, enter the exact calling E.164 number and confirm the charge consent. **Authorize test call** permits one incoming call within five minutes, capped at 120 seconds in this UI. Then call the selected number yourself; no test call is originated by Aureform. Expired UI permission/consent clears without automatic renewal. The linked browser/SIP leg may incur charges; this is not a financial cap.

This is single-owner laboratory software: setup credentials/checkpoints are encrypted on disk, while the call ledger, queue and approvals remain in memory. Official SDK loaders are consumer-supplied; failed registration or an unsupported capability must not be presented as working media. The Telnyx managed issuer is implemented with encrypted per-agent device/checkpoint records, strict parent/JWT lifetime checks and known-credential rotation while idle. Pending/unknown operations remain blocked even when expired, preventing blind duplicate creation. Synthetic provider/HTTP tests cover this path; live acceptance of the requested short parent TTL, JWT acceptance and uninterrupted audio renewal are not demonstrated. Twilio is the first real-call acceptance target; **no real call is verified**, and both providers require independent account-policy/credential/media acceptance.

The [automatic setup guide](../../../docs/communications/AUTOMATIC-SETUP.md) contains exact API routes, recovery rules, private file handling and official sources consulted 2026-10-21. The [extension's validation](../../../docs/communications/AUTOMATIC-SETUP-VALIDATION.md) records **1,036 unit tests**, **245 backend tests on Node 22.22.3**, types/lint, independent **38-case** root and mounted browser runs, a clean SDK consumer and private HTTPS owner login. These results retain their own limits and do not replace the earlier Softphone receipt. The editable [new Figma source page](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=585-59) records setup, connected-host, private-reference and dialog designs separately.

For the private local frontend, use `NEXT_PUBLIC_BASE_PATH='' pnpm dev --webpack --port 3000`; the validation explains the observed development-chunk recovery. Public production exports were independently checked with Turbopack. Real webhook delivery, registration and audio still require the operator's authorized account test.

## Bring a live adapter deliberately

The [communications contract](../../../src/lib/communications/contracts.ts) separates connection, agent presence, calls, FIFO queue, history, reported audio permission and optional capabilities. [`createLiveCommunicationsAdapter`](../../../src/lib/communications/live-adapter.ts) implements the `aureform.inbound-voice.v1` backend protocol. Construction does not connect or load an SDK.

Supply `provider`, an authenticated `baseUrl` such as `/v1/communications`, `voiceClientFactory` and your agent's `getAuthHeaders`. A missing SDK factory makes `connect()` fail before HTTP/SDK work. A separate backend origin requires explicit `trustedBackendOrigins`; use an approved HTTPS origin. Keep authentication material in memory and server secrets on the server. The current client sends session/command requests and consumes SSE snapshots; a browser media event alone cannot confirm that the PSTN leg ended.

The optional bindings are [`createTwilioBrowserVoiceClient`](../../../src/lib/communications/twilio-browser.ts) and [`createTelnyxBrowserVoiceClient`](../../../src/lib/communications/telnyx-browser.ts). Copy one or both source bindings with the live client:

```sh
node bin/aureform.mjs add communications-live twilio-browser-voice telnyx-browser-voice --cwd ../my-product --diff
node bin/aureform.mjs add communications-live twilio-browser-voice telnyx-browser-voice --cwd ../my-product
pnpm --dir ../my-product install
```

`communications-demo` installs the local domain/demo entry independently of the workspace. These entries do not add a mandatory carrier SDK. Install and pin the official SDK separately in your consumer. Twilio accepts one `createDevice` or `loadSdk`; Telnyx accepts one `createClient` or `loadSdk`, plus a host-owned `remoteElement` for audible media. The consumer handles playback and adapter teardown. `InjectedCommunicationsSoftphoneExample` mounts an adapter already owned by your Client Component.

Follow the [separate Node backend guide](../../../examples/communications-backend/README.md) for private configuration, origins, token issuance and provider-specific topology. Its default health endpoint works without credentials; agent sessions remain denied. Carrier operations are off and approvals empty. The [backend implementation reference](../../../docs/communications/INBOUND-VOICE-REFERENCE.md) records official sources and unverified real-call gates. Check the implementation status before treating the browser/client/backend combination as usable.

A live integration needs an authenticated backend, short-lived browser credentials, HTTPS, verified webhooks, authorized commands and server-owned queue/routing decisions. Test Twilio and Telnyx independently, including incoming audio, advertised capabilities, reconnection and hangup. Unsupported hold or DTMF must remain unavailable. Obtain explicit approval before buying numbers, making calls or enabling paid resources.

Cloudflare or GitHub Pages can host the static demo. Carrier credentials, webhook handlers, token issuance and realtime sessions belong in a separately deployed backend; they cannot be added to a static export by setting a browser key.

See the [implementation status](../../../docs/communications/IMPLEMENTATION-STATUS.md) for current evidence and remaining gates. The [security checklist](../../../docs/communications/SECURITY-COMPLIANCE.md) and [architecture research](../../../docs/communications/ARCHITECTURE-RFC.md) remain the reference for production work. SMS, WhatsApp, transfers, recordings, campaigns and voice AI are outside this first softphone slice.

The [implemented Figma source](../../../design/reports/softphone-native-source-2026-10-21.md) includes editable call states, workspace compositions and dialogs, with a separate source map and two local Code Connect templates. The [validation record](../../../docs/communications/VALIDATION.md) separates local browser acceptance, SDK type compatibility and reference-backend tests from real carrier calls.
