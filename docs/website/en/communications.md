# Communications

`SoftphoneWorkspace` is an editable inbound softphone block. Its default adapter runs a local demonstration: provider names identify simulated Twilio or Telnyx scenarios, without buying numbers, connecting a carrier or placing real calls.

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
