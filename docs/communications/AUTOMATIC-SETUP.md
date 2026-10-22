# Automatic provider setup

Source/documentation review: **2026-10-21**. This is an editable **single-owner inbound-call laboratory**, not a managed production service. The [automatic-setup validation](AUTOMATIC-SETUP-VALIDATION.md) records local browser, private application authentication, installed SDK types and injected provider tests. The separate HTTPS health observation below establishes transport reachability only. No real account configuration, delivered webhook, SDK registration or audible carrier call is certified here. The previous [validation record](VALIDATION.md) remains a separate, unchanged baseline.

## Public demo and private connection

The public site leaves `NEXT_PUBLIC_COMMUNICATIONS_BACKEND_URL` unset. [CommunicationsSoftphoneTemplate](../../src/components/templates/communications-softphone-template.tsx) retains the local softphone and opens **Configure provider** as a fixture-only wizard. Its two provider fields are read-only; it accepts no real credentials, contacts no carrier and creates no resources.

A consumer can supply `connection?: ConnectedSoftphoneLiveProps` to that template, or use [ReferenceConnection](../../src/components/communications/reference-connection.tsx) with an approved HTTPS backend URL. The [ConnectedSoftphone](../../src/components/communications/connected-softphone.tsx) host owns setup and the resulting live adapter. Its default mode is still demo. Live setup is deliberate application configuration, not a consequence of clicking a provider logo.

| Provider | The only carrier credential fields | Server-owned configuration |
| --- | --- | --- |
| Twilio | **Account SID**, **Auth token** (primary) | Inspect the active Full account and its owned voice numbers; create an internally owned Standard API key; store its one-time secret; configure and read back the selected number's fixed inbound/status routes. |
| Telnyx | **API key**, **Public key** | Inspect owned voice numbers; create a Call Control Application and a separate Credential Connection; attach the selected number; require explicit no-outbound-profile readback. The public key is the account's canonical Base64 32-byte Ed25519 webhook verification key. |

There is no number purchase or user-supplied TwiML App, connection or device credential ID in these forms. Choose an **existing owned voice-enabled number**. Configuration can replace its current call routing, so review the plan and explicitly confirm that replacement. A number in use by another application can be disrupted by this authorized change.

Twilio's current setup adapter uses the US1 REST origin. It clears `VoiceApplicationSid` and the existing voice fallback when necessary so they do not override the reviewed inbound route, while checking preserved messaging settings. Telnyx keeps Call Control and the browser SIP connection separate and preserves the selected number's messaging/compatible voice settings. Account permissions, region and number eligibility still require independent acceptance.

### Twilio prerequisites

Use an active **Full** Twilio account and its **primary Auth Token**, together with an already owned voice-enabled number routed through US1. Twilio's [current trial restrictions](https://www.twilio.com/docs/usage/trials/try-out-voice) block `<Dial><Client>`, which this inbound browser path needs. A [secondary Auth Token](https://www.twilio.com/docs/iam/api/secondary_authtoken) can authenticate REST requests, but [classic webhook signatures use the primary token](https://www.twilio.com/docs/usage/security). These official sources were consulted **2026-10-21**.

The setup adapter checks account type and the returned primary-token identity through the [Account resource](https://www.twilio.com/docs/iam/api/account) before listing numbers, planning or dispatching configuration effects. An unsupported/unverifiable account is rejected; a missing, masked or different primary token is rejected. It does not upgrade an account or promote/rotate credentials. `permission-denied` can indicate a non-Full account; `invalid-credentials` can indicate that the supplied token is not the verifiable primary token. Restore the appropriate account access before another inspection. Real provider responses and media still require acceptance.

Twilio also documents an **implicit US1** configuration: an API-provisioned number without an explicit inbound-region resource returns HTTP 404 from the [Inbound Processing Region API](https://www.twilio.com/docs/global-infrastructure/inbound-processing-api#check-which-region-your-phone-number-is-routed-to). After verifying the account and owned voice number, this adapter accepts that specific region lookup only when its response is valid JSON with Twilio code `20404` and status `404`. It does not treat a missing account/number, another error, malformed response or failed transport as US1. Explicit region responses must still match the account and number and report `us1`; apply rechecks these conditions. No regional routing resource is created or changed by planning. See the [region correction and separate evidence](AUTOMATIC-SETUP-REGION-FIX.md).

## Initialize the private backend

Use Node **22.18 or later in the 22 branch**, from the repository checkout. The following hosts are placeholders: replace them with your owned HTTPS backend and the exact frontend origin.

```sh
cd examples/communications-backend
npm ci --ignore-scripts --no-audit --no-fund
npm run setup:init -- --public-origin https://voice.example.com --frontend-origin https://app.example.com
npm run setup:serve
```

For a local frontend, include its exact origin, for example `--frontend-origin http://localhost:3000` or `--frontend-origin http://127.0.0.1:3000`; these are different allowed origins. Webhook delivery and the browser-facing setup API still require the approved public HTTPS backend.

The [initializer](../../examples/communications-backend/setup-lab.mjs) defaults to `~/.config/aureform-communications`. Both commands accept `--directory PRIVATE_DIRECTORY`, which must be outside the repository. It creates:

- `lab-config.json`: exact frontend origins and an all-day `America/Bogota` laboratory schedule; initially no agents, providers or call approvals.
- `access-code.txt`: the owner's application access code.
- `.env`: the owner-code SHA-256, `PUBLIC_BASE_URL`, disabled call operations, encrypted-state location and a generated **32-byte** `SETUP_MASTER_KEY` encoded as Base64.

Initialization refuses existing owner files, uses owner-only directory/file permissions, and writes `.env` **last** as its completion marker. It does not overwrite an existing installation or print/store carrier credentials. The repository ignore rules also exclude private lab configuration, access codes and encrypted setup; that is not a reason to put them in the checkout.

On first serve, [EncryptedSetupStore](../../examples/communications-backend/lib/setup-store.js) creates `encrypted-setup.json` using AES-256-GCM. It retains carrier credentials, internally generated resource secrets, plans and mutation checkpoints. Keep the encryption key and owner files outside Git and protect their private backups. The key is supplied by the host; this is not KMS or a guarantee against compromise of that host.

`setup:serve` listens on `127.0.0.1:8788` by default. Place your own HTTPS proxy/tunnel in front of it. `PUBLIC_BASE_URL` must be the **exact external HTTPS origin**, without a path, query, credentials or trailing slash. Preserve signed request paths, query parameters and raw bodies; forwarded headers do not redefine Twilio's signature URL. Required routes include `/webhooks/twilio/{inbound,wait,dial-action,client-status,status}` and `/webhooks/telnyx`.

### Cloudflare exposure requires a named tunnel

Use a [named Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/get-started/) with your own stable HTTPS hostname for this laboratory. [Quick Tunnels do not support SSE](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), which the voice session needs. Quick Tunnel email authentication is interactive and cannot authenticate carrier webhook clients.

Route the named tunnel to the private loopback service. Keep `/webhooks/*` free of interactive email/Access login redirects; authenticate those requests with their provider signatures. Setup/session endpoints retain the laboratory's bearer and exact-origin checks. Keep tunnel credentials, token files and private hostname/ID configuration outside Git; the public examples contain only placeholder origins.

Preserve `Content-Type: text/event-stream` on `/v1/communications/events`: Cloudflare documents that this header avoids [Tunnel response buffering](https://developers.cloudflare.com/tunnel/troubleshooting/). Check actual incremental event delivery and HTTPS routes separately from tunnel health. A named tunnel transports HTTP/SSE; it does not certify SDK registration or WebRTC audio.

On 2026-10-21 the maintainer reported **HTTP 200 from the HTTPS health route through the private named tunnel**. Its hostname, tunnel IDs and credentials are not published. This observation does not establish SSE delivery, a signed carrier webhook, browser registration or audio.

Automatic mode starts from the empty configuration produced by `setup:init`. Do not mix it with manually configured provider profiles: the server rejects that runtime conflict. The manual topology remains documented in the [backend README](../../examples/communications-backend/README.md).

## Connect the consumer

For the private reference host, configure only this public URL in the frontend:

```dotenv
NEXT_PUBLIC_COMMUNICATIONS_BACKEND_URL=https://voice.example.com/v1/communications
```

It is a **public approved URL, not a secret**. No Account SID/Auth token, API key, owner code or encryption key belongs in a `NEXT_PUBLIC_*` variable. The current Next.js guide explains that these values are embedded at build time: rebuild/restart the appropriate consumer when changing it. Leave it unset in the public Aureform demo.

For the private local frontend, the verified development command is `NEXT_PUBLIC_BASE_PATH='' pnpm dev --webpack --port 3000`. The [validation record](AUTOMATIC-SETUP-VALIDATION.md#development-server-recovery) explains the observed Turbopack development-chunk issue; public production exports passed separately with Turbopack.

`ReferenceConnection` loads the official browser SDK for the selected provider only when a live browser connection is explicitly requested. The consumer must provide the appropriate package; the generic connected host also accepts injected `twilioLoadSdk`/`telnyxLoadSdk`. Optional root development dependencies do not certify a consumer's runtime integration.

Select Twilio or Telnyx **before owner login**; the provider is locked afterward to avoid replacing a setup or owned call. Enter **Owner access code** from the private file, then **Open private setup**. This is application authentication, separate from the two carrier fields. The reference returns an origin-bound ten-minute owner bearer, held in memory. **Renew owner access** replaces that bearer while keeping the same mounted call/session identity; it does not remount or answer an active call.

After login, the host reads the authenticated connection list. If the selected provider already has a configured profile, it resumes its validated public summary through `ConnectedSoftphone.initialConfiguration`; it does not inspect credentials again, create another key, apply a plan or connect automatically. This restores configuration only: a reload/server restart cannot restore a lost call ledger or media session.

For a custom authenticated Client Component, live host props are `mode: "live"`, `backendUrl`, `provider`, stable `authSessionKey`, `getAuthHeaders` and `trustedBackendOrigins`, with optional SDK loaders, `initialConfiguration`, `fetch`, `authMode`, `onConfigured` and `className`. Callbacks/loaders are client-owned functions, not Server Component DTOs. Cookie/CSRF mode needs a consumer backend that actually implements it; the reference laboratory uses bearer authentication.

## Review and apply

Use **Inspect account** → select the existing number → **Review setup** → review/confirm configuration and any routing replacement → **Connect and configure**. Inspection and planning read the provider; apply makes the reviewed configuration mutations.

`ENABLE_CARRIER_OPERATIONS=false` blocks call operations; it does **not** turn an owner-approved setup apply into a read-only operation. Setup uses a separate authenticated/reviewed mutation path.

A configured result reports:

```json
{
  "checks": {
    "credentials": "passed",
    "webhooks": "passed",
    "browser": "pending",
    "testCall": "pending"
  }
}
```

Here, webhook “passed” is **configuration readback**, not observed delivery or a reachable HTTPS certificate test. **Number configured** does not mean browser registration, microphone permission, accepted media or a real call. Use **Connect session** separately, then select **Available**.

## Setup API and recovery

The [server](../../examples/communications-backend/server.js) exposes `contractVersion: aureform.setup.v1`. All routes below use the exact allowed `Origin`; all except login require the owner bearer in `Authorization`. Credentials/tokens never belong in query parameters.

| Method and route | Request or result |
| --- | --- |
| POST `/v1/communications/setup/login` | `{accessCode}` → `{contractVersion, sessionToken, expiresAt}`. |
| GET `/v1/communications/setup/connections` | Array of configured public summaries, at most two, one per provider. Authenticated/redacted DTOs; no credentials or resource secrets. |
| POST `/v1/communications/setup/inspect` | `{provider, accountSid, authToken}` or `{provider, apiKey, publicKey}` → connection ID, account label and owned-number options. |
| POST `/v1/communications/setup/plan` | `{connectionId, numberId}` → expiring plan ID, ordered steps and routing-replacement flag. |
| POST `/v1/communications/setup/apply` | `{planId, confirmation: {configure: true, replaceExistingRouting: boolean}}` → configured/failed/unknown result. |
| GET `/v1/communications/setup/status?connectionId=…` | Current persisted journal summary, including configuring/unknown; it does not apply or retry a mutation. |
| POST `/v1/communications/setup/authorize-test` | `{connectionId, callerNumber, seconds, confirmation: true}` → bounded incoming-call permission, `observedCall: false`. |

Setup-provider dependency failures return a redacted JSON error with HTTP **503**, retaining CORS for an allowed exact origin. This avoids a reverse proxy replacing an origin 502 with its own HTML gateway page and hiding the useful error from the browser. Authentication and policy failures retain their existing status codes. A 503 during apply or managed credential creation can still represent an uncertain external effect: follow the journal and `setup-reconciliation-required`, never automatically repeat a write.

Inspection connections expire after one hour; plans after ten minutes. A dispatched mutation is journaled before external effects and checkpointed afterward. Lost responses, cancellation or a crash may leave **unknown**. Restart converts interrupted `configuring` journals to unknown. **Check setup status** reads that state; it does not silently repair the provider.

Do not clear the journal, repeat apply or start another setup to escape ambiguity. The same completed plan can return its saved summary; an uncertain plan is reconciliation-only. An operator must inspect provider resources/routing and the private journal before any separately reviewed recovery. This reference supplies no automatic rollback, force-apply or guaranteed exactly-once carrier transaction. A routing fingerprint recheck detects observed drift; it is not provider-side compare-and-swap.

Planning and apply also check persisted journals by **provider + selected number ID**. A `configuring`, `unknown` or `failed` journal blocks another plan/apply for that same pair, including through a newly inspected connection. A process restart or expired inspection/plan does not bypass this guard; interrupted work remains reconciliation-only.

## One explicit incoming test

The first real-carrier acceptance target is **Twilio**; no completed result is recorded here. After configuration:

1. Explicitly connect the browser SDK and set presence to **Available**.
2. Enter the exact E.164 phone number from which you will call.
3. Confirm **I authorize this one bounded test and the associated carrier charges**, then **Authorize test call**.
4. Call the displayed owned number yourself. Aureform does not dial the caller or originate a PSTN test call.
5. Check ringing, explicit answer, two-way audio, controls, termination and correlated provider/backend events independently.

The server requires the connected/available agent for that provider and no active call or pending permission. It permits **one call**, from the exact caller to the selected number, within **five minutes**, with **30–120 seconds** requested duration; the private UI requests **120 seconds**. Expired UI permission and its consent checkbox clear, but no permission is renewed automatically. A new authorization is still subject to server state.

Call operations are enabled only for that explicit bounded authorization. No outbound PSTN endpoint or number purchase is added. The internally linked browser/SIP leg can be billable. Duration, action and permission limits are operational safeguards, not a guaranteed invoice cap; charges and caller-ID matching require actual provider acceptance.

### Implemented Telnyx managed issuer

The [managed issuer](../../examples/communications-backend/lib/setup-providers.js) is implemented and wired through [AutomaticSetup](../../examples/communications-backend/lib/automatic-setup.js) and the server, with synthetic-provider and loopback HTTP tests. It creates a server-owned device credential, checkpoints its resource IDs/token state into encrypted `devices` records, and verifies the exact parent connection, SIP identity and expiry before returning a login JWT.

Requested parent lifetime is 60–300 seconds. JWT `exp` must remain within both that requested bound and the verified parent expiry; parsing `exp` is not cryptographic signature or grant verification. The issuer waits for credential propagation and rechecks the parent/connection afterward. The reference uses one managed browser identity per owner agent. Known verified near-expiry credentials can rotate while idle; server checks reject issuance/renewal if a call is active, including a call arriving during issuance.

The 60–300-second parent lifetime is a laboratory request checked with synthetic responses. **Live Telnyx acceptance or availability of that parent TTL has not been demonstrated.** The issuer must fail closed if the provider cannot satisfy the requested bound.

**Pending/unknown creation or minting stays blocked even after expiry.** It cannot be treated as absent to create a duplicate. The operator must reconcile private checkpoints and provider resources. The managed-issuer [HTTP tests](../../examples/communications-backend/test/managed-credentials-http.test.js) cover these synthetic flows and the active-call race; no live Telnyx account or JWT acceptance is proven.

A connection with no outbound profile and a JWT still do not certify the real account as inbound-only. Missing/ambiguous policy readback fails closed. Public-key/account correspondence, actual propagation, provider registration, sufficient remaining TTL and real outbound restrictions require independent acceptance. Idle rotation is not uninterrupted active-call renewal or production readiness.

## Evidence and design status

Encrypted setup state survives process restarts; calls, FIFO, reservations, sessions, notes, deduplication and call approvals remain **in memory**. Do not deploy replicas or treat this as OIDC, multitenant provisioning, durable call recovery, compliance certification or a managed contact center.

The initial automatic-setup checkpoint passed **245/245 backend tests** on Node 22.22.3, including the provider + number restart/reinspection guard, account/token rejection and managed-issuer HTTP/race cases. Root tests passed **1,036/1,036**, with types/lint passing and independent **38-case** root and mounted public browser runs. During that checkpoint's private browser check, owner login and two empty editable Twilio fields were verified without entering provider credentials. Its [historical validation receipt](AUTOMATIC-SETUP-VALIDATION.md) retains the reviewed source hashes and limits. The subsequent [implicit-region correction](AUTOMATIC-SETUP-REGION-FIX.md) has its own evidence; real call/media acceptance remains unverified.

The editable extension is recorded on [Figma page 14](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=585-59), with a [native source map](../../design/figma/communications-setup-native-source-2026-10-21.json), bounded readback and selected visual evidence. The original native roots and earlier softphone validation retain their separate scope. Neither native source nor installed SDK typing proves signed webhook delivery, account configuration or real audio.

## Official references

Consulted **2026-10-21**. These document APIs, not completion of an Aureform experiment:

- [Twilio Standard Key resource v2010](https://www.twilio.com/docs/iam/api-keys/key-resource-v2010): Standard key creation and one-time secret; this endpoint does not create Restricted keys.
- [Twilio IncomingPhoneNumber resource](https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource): existing-number routing and application precedence.
- [Twilio inbound processing region guide](https://www.twilio.com/docs/global-infrastructure/inbound-processing-api): HTTP 404 for an API-provisioned number without an explicit region means the default US1 region. This narrow case does not establish ownership or replace account/number verification.
- [Telnyx official OpenAPI](https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json): Call Control Applications, Credential Connections, number update and telephony credential APIs. The reference adapter selects a narrower reviewed subset.
- [Telnyx JWT authentication](https://developers.telnyx.com/docs/voice/webrtc/auth/jwt): token lifetime is bounded by its parent credential; newly created credentials require propagation before login.
- [Cloudflare named tunnel setup](https://developers.cloudflare.com/tunnel/get-started/), [Quick Tunnel restrictions](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) and [streaming troubleshooting](https://developers.cloudflare.com/tunnel/troubleshooting/): stable exposure, unavailable Quick Tunnel SSE and the required streaming response header.

The broader security and jurisdictional analysis remains in [SECURITY-COMPLIANCE.md](SECURITY-COMPLIANCE.md). This guide does not alter the seven research RFCs or immutable release history.
