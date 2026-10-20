# AI workspace integration

`AIWorkspace` is a frontend for a consumer-owned AI backend. It accepts a Client Component adapter, renders published text, citations, tool states, approval decisions, file references, token usage, run progress and agent handoffs, and cancels work when its workspace changes. Optional admin presentation shows backend-reported gateway routing, fallbacks and approved trace links. It installs no provider SDK and makes no provider call in the default demo.

The HTTP adapter consumes **Aureform NDJSON v1**, with `application/x-ndjson`. Native OpenAI, Anthropic, Gemini and gateway streams, and the AI SDK UI message protocol, require a backend bridge. Pointing this adapter directly at native SSE or calling an SDK stream a compatible transport will fail validation.

## Public frontend contract

```ts
import type { AiWorkspaceAdapter } from "@/lib/ai-integration";

type AIWorkspaceProps = {
  mode?: "chat" | "code" | "playground";
  workspaceId?: string;
  providerOptionId?: string;
  initialModel?: string;
  adapter?: AiWorkspaceAdapter;
  diagnostics?: boolean;
};
```

`adapter` contains functions and must be constructed or injected in a Client Component. A Server Component may pass serializable workspace/model configuration to that component; it must not pass the adapter itself across the server/client boundary.

`workspaceId` defaults to `"demo"`. A different workspace remounts the session and aborts the previous request, including an outstanding approval. Injected conversations stay in memory; the unchanged default demo retains its existing browser storage. Use a React `key` for a different provider/connection candidate within the same workspace, as in the example below.

`providerOptionId` is selection context, not evidence of credentials or authorization. It accepts a Hub option ID as a string. Without an adapter, a value other than `"demo"` shows “Not configured” and disables submission. An explicitly injected `kind: "demo"` adapter always shows simulation labels. A generic integration-report HTTP connection does not configure this AI transport.

`initialModel` must exactly match `adapter.models[].id`; a label or unknown ID does not silently select another model. If omitted, the first configured model is selected. Each `AiModelOption` has `id`, `provider`, `label`, and optional Spanish `labelEs`. Model IDs are consumer-defined, authorized identifiers; the frontend does not discover or assume native model availability.

`diagnostics` defaults to `false`. Set it to `true` to present routing/fallback records and error trace navigation in the actual AI screen. This is a display preference, never an access grant, and it is not included in the HTTP request. The consumer backend must authorize each diagnostic field and trace destination before returning it. Hiding an already downloaded record in the UI does not protect that record. Public progress and handoff summaries remain visible without this prop.

`aiProviders` exports these provider IDs:

| ID | Backend recipe |
| --- | --- |
| `demo` | Deterministic local demonstration |
| `ai-sdk` | AI SDK 7 server stream normalized by the consumer |
| `openai-responses` | Native OpenAI Responses |
| `anthropic-messages` | Native Anthropic Messages |
| `google-gemini` | Google Gen AI / Gemini |
| `vercel-gateway` | Vercel AI Gateway |
| `cloudflare-gateway` | Cloudflare AI Gateway |
| `openrouter` | OpenRouter |
| `litellm` | Consumer-managed LiteLLM |
| `azure-openai` | Azure OpenAI |
| `bedrock` | Amazon Bedrock |
| `vertex-ai` | Google Vertex AI |
| `custom` | Another normalized consumer backend |

These are routing labels, not SDK implementations or tested native provider connections. The backend checks the model/provider pair against its own allowlist.

## Complete Client Component

Supply `approvedModels` from your application configuration or authenticated backend. An empty list leaves real providers unconfigured. Select “Aureform demo” to explicitly preview the local demonstration.

```tsx
"use client";

import { useMemo, useState } from "react";
import { AIWorkspace } from "@/components/templates/ai-workspace";
import { Select } from "@/components/ui/select";
import {
  aiProviders,
  createDemoAiWorkspaceAdapter,
  createHttpAiWorkspaceAdapter,
  type AiModelOption,
  type AiProvider,
} from "@/lib/ai-integration";

export function ConnectedAI({
  workspaceId,
  approvedModels,
  locale = "en",
  showAdminDiagnostics = false,
}: {
  workspaceId: string;
  approvedModels: readonly AiModelOption[];
  locale?: "en" | "es";
  showAdminDiagnostics?: boolean;
}) {
  const [provider, setProvider] = useState<AiProvider>("openai-responses");
  const models = useMemo(
    () => approvedModels.filter((model) => model.provider === provider),
    [approvedModels, provider],
  );
  const adapter = useMemo(
    () => provider === "demo" ? createDemoAiWorkspaceAdapter()
      : models.length ? createHttpAiWorkspaceAdapter({
          endpoint: "/backend/ai",
          approvalEndpoint: "/backend/ai/approvals",
          models,
          credentials: "same-origin",
        }) : undefined,
    [provider, models],
  );

  return (
    <div className="grid min-w-0 gap-5">
      <Select
        aria-label={locale === "es" ? "Proveedor de IA" : "AI provider"}
        value={provider}
        onValueChange={(value) => {
          if (aiProviders.some((option) => option.id === value)) {
            setProvider(value as AiProvider);
          }
        }}
        options={aiProviders.map((option) => ({
          value: option.id,
          label: option.id === "demo" && locale === "es"
            ? "Demostración de Aureform" : option.label,
        }))}
      />
      <AIWorkspace
        key={`${workspaceId}:${provider}`}
        workspaceId={workspaceId}
        providerOptionId={provider}
        initialModel={adapter?.models[0]?.id}
        adapter={adapter}
        mode="chat"
        diagnostics={showAdminDiagnostics}
      />
    </div>
  );
}
```

Render it inside the application's existing language and appearance providers. The workspace/block uses EN/ES labels, existing palette variables, Base UI controls, native reference links, escaped text and reduced-motion styles. `mode="code"` preserves code-fence rendering; `mode="playground"` sends the system instruction and temperature. The backend applies only parameters supported by the selected model.

For an existing consumer SDK integration, implement `AiWorkspaceAdapter` directly:

```ts
interface AiWorkspaceAdapter {
  id: string;
  kind: "demo" | "http" | "custom";
  models: readonly AiModelOption[];
  stream(
    request: AiWorkspaceRequest,
    signal: AbortSignal,
  ): AsyncIterable<AiStreamEvent>;
  respondToApproval?(
    decision: AiApprovalDecision,
    signal: AbortSignal,
  ): Promise<void>;
}
```

The workspace validates custom streams too. It does not forward tool arguments, raw tool results, reasoning or arbitrary provider fields to the visual block. `AiMessageParts` is independently reusable with `message`, `locale`, `diagnostics`, `onApprovalDecision(part, approved)` and `approvalActions` (`sending`, `submitted`, `failed`). Callers rendering this block directly own the same validation and approval lifecycle. `AiRoutingPart`, `AiProgressPart`, `AiHandoffPart`, `AiErrorDetails` and `AiSafeTraceLink` are exported from `@/lib/ai-integration`.

## NDJSON v1

A POST request contains:

```json
{
  "v": 1,
  "id": "request-1",
  "workspaceId": "workspace-alpha",
  "locale": "en",
  "mode": "chat",
  "model": { "id": "approved-primary", "provider": "openai-responses" },
  "messages": [{ "role": "user", "content": "Summarize my authorized sources." }],
  "system": "",
  "temperature": 0.7,
  "attachments": []
}
```

Every response line is one JSON event with `v: 1`, the same `requestId`, and the same `workspaceId`. The first event must be `start`. Exactly one terminal `complete` or `error` is required; subsequent output is invalid. For compatibility with the default demo, an omitted workspace field normalizes to `"demo"`; connected consumers should always send an explicit, authenticated workspace.

| `type` | Additional published fields |
| --- | --- |
| `start` | None |
| `text` | `id`, `delta`; append a nonempty text delta to that part |
| `source` | `id`, `title`, optional `url`, optional `summary` |
| `tool` | `id`, `name`, `state`, `summary`; states `pending`, `running`, `completed`, `failed`, `rejected` |
| `approval` | `id`, `toolId`, `state`, `title`, `summary`; states `requested`, `approved`, `rejected` |
| `file` | `id`, `name`, `mediaType`, optional `url`, optional nonnegative `bytes` |
| `usage` | `basis`, nullable `inputTokens`, `outputTokens`, `totalTokens` |
| `status` | `state` (`queued`, `generating`, `waiting-approval`), optional `summary` |
| `routing` | `id`, `runId`, `basis`, nullable `attempt`, `gateway`, `provider`, `model`, `fallback`; optional `summary`, `safeTraceLink` |
| `progress` | `id`, `runId`, `basis`, `label`, public `summary`, `state`, nullable `completed`, `total` |
| `handoff` | `id`, `runId`, `basis`, `from`, `to`, `state`, public `summary` |
| `complete` | `finishReason`: `stop`, `length`, `content-filter`, `tool-limit`, `cancelled` |
| `error` | `code`, public `message`, boolean `retryable`; optional `runId`, `safeTraceLink` |

Example final output:

```ndjson
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"start"}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"text","id":"answer","delta":"Here is the published summary."}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"source","id":"source-1","title":"Authorized guide","url":"https://example.test/guide"}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"usage","basis":"unavailable","inputTokens":null,"outputTokens":null,"totalTokens":null}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"complete","finishReason":"stop"}
```

`stop` means complete; length, filtering and tool limits mean incomplete. Cancellation is separate from failure. A truncated stream is a failure even if it already produced text. Usage is unavailable until supplied. With `basis: "reported"`, unknown counters remain `null` and a reported zero stays zero. With `basis: "unavailable"`, all counters must be `null`. `basis: "demo"` is explicitly illustrative and never billable. No cost is inferred from tokens or invented as a currency amount.

Request/part IDs are bounded to 128 characters (`A–Z`, `a–z`, digits, underscore, dot, colon, hyphen); model IDs to 256. Workspace IDs are opaque strings of at most 200 characters without control characters, matching the integration scope contract. Requests are at most 2 MiB, with at most 64 messages, each at most 32 Ki characters, and at most four text attachments, each at most 1 Mi character. The workspace's existing file picker still limits a file to 1 MiB. Streams are at most 2 MiB, 4,096 events and 64 KiB per line; optional adapter limits may only lower these bounds. UTF-8 and chunk boundaries are validated, including split multi-byte characters, CRLF and a final line without a newline. Unknown fields and event types are rejected.

Published file/source URLs allow HTTP(S) without embedded credentials or a root-relative path. HTML, JavaScript/data URLs and raw provider objects are not rendered. Relative links pass through `publicPath` so configured base paths are preserved; absolute links stay external.

## Published run metadata and admin diagnostics

All metadata in one response identifies the same `runId`, bounded like a request ID, within its existing `requestId` and `workspaceId`. These values identify a backend run; the frontend cannot verify that a gateway actually executed it. An authorized backend publishes records from its own execution/audit data. It must exclude private reasoning, chain-of-thought, credentials, raw provider responses, tool arguments and unpublished intermediate content. Strict object schemas reject extra fields, but cannot determine whether a string's contents were authorized for publication.

`routing.basis` is `reported`, `demo` or `unavailable`. Reported routing requires an attempt (`1`–`32`), provider ID and model ID. `gateway` is `vercel-gateway`, `cloudflare-gateway`, `openrouter`, `litellm`, `custom` or `null` when not reported. A fallback is either `null` or `{ fromProvider, fromModel, reason, summary? }`; reasons are `rate-limit`, `unavailable`, `timeout`, `policy` or `other`. A fallback requires an attempt of at least two and must match the previous published target when that target is available. Each routing `id` is an immutable audit entry and numbered attempts must increase. `basis: "unavailable"` requires all target/attempt/fallback fields to be `null` and has no trace. `basis: "demo"` can only identify the local demo provider, no real gateway or trace.

`progress.basis` and `handoff.basis` are `reported` or `demo`. Progress states are `queued`, `running`, `completed`, `failed` and `cancelled`. Counts are integers from zero to 1,000,000 or `null` when unknown; zero remains zero. Known counts cannot regress or become unknown, and a known total cannot change. A completed state with both counts known requires equality. The UI shows unavailable counts honestly and does not infer percentages. A progress record's identity/label is stable and terminal states cannot replay.

A handoff begins as `requested`, may become `accepted`, and resolves as `completed`, `failed`, `rejected` or `cancelled`. Completion requires the acceptance event. Sender, recipient and basis remain stable; resolved records cannot replay. These are backend reports, not commands to execute agents. A successful `stop` terminal cannot leave queued/running progress or requested/accepted handoffs. Interrupted/cancelled responses retain unfinished metadata with a “Last reported state” label, without claiming that the frontend cancelled an external agent.

For example, a consumer's inference handler can publish these normalized run records through the executable bridge below. The initial and fallback records retain both targets; this example contains only public summaries:

```ndjson
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"start"}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"routing","id":"route-1","runId":"run-1","basis":"reported","attempt":1,"gateway":"vercel-gateway","provider":"openai-responses","model":"approved-primary","fallback":null}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"progress","id":"progress-1","runId":"run-1","basis":"reported","label":"Authorized response","summary":"Preparing the public answer.","state":"running","completed":0,"total":1}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"routing","id":"route-2","runId":"run-1","basis":"reported","attempt":2,"gateway":"vercel-gateway","provider":"anthropic-messages","model":"approved-backup","fallback":{"fromProvider":"openai-responses","fromModel":"approved-primary","reason":"rate-limit","summary":"The backend selected an authorized alternative."},"safeTraceLink":{"href":"/admin/traces/run-1"}}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"handoff","id":"handoff-1","runId":"run-1","basis":"reported","from":"Coordinator","to":"Writer","state":"requested","summary":"A public writing task was delegated."}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"handoff","id":"handoff-1","runId":"run-1","basis":"reported","from":"Coordinator","to":"Writer","state":"accepted","summary":"The receiving agent acknowledged the task."}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"text","id":"answer","delta":"The published answer."}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"handoff","id":"handoff-1","runId":"run-1","basis":"reported","from":"Coordinator","to":"Writer","state":"completed","summary":"The public answer is complete."}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"progress","id":"progress-1","runId":"run-1","basis":"reported","label":"Authorized response","summary":"The public answer is ready.","state":"completed","completed":1,"total":1}
{"v":1,"requestId":"request-1","workspaceId":"workspace-alpha","type":"complete","finishReason":"stop"}
```

`safeTraceLink` is `{ href, label? }`: at most 2,048 characters for the URL and 128 for its label. `isAiTraceLink` validates HTTP(S) without URL credentials or root-relative public/proxy destinations, with **no query string or fragment**. Encoded control characters, backslashes and encoded protocol-relative paths are rejected. Use an approved public reference or a consumer proxy path that performs its own server authorization; never publish a presigned URL, a secret in a path, a raw provider-log URL or a browser-side authorization token. URL syntax validation is not authorization or proof that a target is public. External destinations are preserved; root-relative ones respect `publicPath`. The UI rechecks the URL before creating a native link.

An error may include `runId` and an approved trace, for example `{ type: "error", code: "provider-unavailable", message: "Please retry.", retryable: true, runId: "run-1", safeTraceLink: { href: "/admin/traces/run-1" } }` before adding the envelope. A trace on an error requires its `runId`. Without an actual destination, admin presentation says “Trace unavailable”; it never invents a trace. The demo explicitly labels routing/progress as simulated and demonstrates an acknowledged handoff when the prompt includes `handoff`, `delegate`, `delegar` or `transferir`.

These additions retain wire version 1 and existing event shapes. Since the protocol deliberately rejects unknown types/fields, consumers using an older parser must upgrade before their backend begins publishing the new metadata.

## Approval and cancellation

Declare a tool as `pending` before requesting approval. Once an approval exists, the backend must acknowledge its `approved` state before publishing execution. Rejection requires a `rejected` approval followed by a rejected tool. Decisions cannot replay, change tools or refer to another request/workspace. A `stop` terminal cannot leave an unanswered approval or unfinished tool.

The optional approval endpoint accepts this JSON, including `approved: false` for rejection:

```json
{
  "v": 1,
  "workspaceId": "workspace-alpha",
  "requestId": "request-1",
  "approvalId": "approval-1",
  "toolId": "tool-1",
  "approved": false
}
```

A successful HTTP acknowledgement means the decision was submitted, not that a tool executed. The UI waits for the running stream's approval/tool events and disables duplicate submissions meanwhile. Failed submissions remain retryable. Without an injected approval method, or after stop/unmount, approval controls are inactive. The consumer backend authenticates the actor, checks the pending approval and workspace, applies policy and performs any approved side effect; approval JSON cannot grant authority by itself.

`Stop`, a new conversation, unmounting or changing `workspaceId` aborts the frontend controller. The HTTP transport aborts fetch and releases its reader; custom iterators are detached even if they ignore the signal. Backend inference and approval handlers must honor the supplied signal and their own execution limits. Frontend cancellation cannot undo an already executed external action.

The offline demo keeps `streamDemoReply`'s original text, stop/retry/error and text-attachment behavior. Prompts mentioning tools, approval or sending/publishing demonstrate a local approval/rejection round trip; nothing is sent or published. Successful demo replies add a clearly labeled example citation, illustrative token counts and completed local progress. Demo code file metadata has no fabricated download URL. Demo routing has no gateway, native provider execution or trace target.

## Executable consumer HTTP bridge

This Fetch API recipe takes **supplied** inference, authorization and approval handlers. It is executable without a provider SDK and is exercised directly by `tests/ai-integrations.test.mjs`, including rejection, authorization failure and stream completion. Mount it in your consumer's server/runtime; the Aureform static export does not host POST routes.

<!-- executable-ai-bridge -->
```ts
import {
  AiProtocolError,
  createAiProtocolResponse,
  readAiJsonBody,
  validateAiApprovalDecision,
  validateAiWorkspaceRequest,
  type AiApprovalDecision,
  type AiInferenceHandler,
} from "@/lib/ai-integration";

export function createConsumerAiHandler({
  infer,
  authorize,
  decide,
}: {
  infer: AiInferenceHandler;
  authorize: (
    request: Request,
    workspaceId: string,
    signal: AbortSignal,
  ) => Promise<boolean>;
  decide: (
    decision: AiApprovalDecision,
    signal: AbortSignal,
  ) => Promise<void>;
}) {
  return async function handle(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    const approval = pathname === "/backend/ai/approvals";
    if (!approval && pathname !== "/backend/ai") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (request.method !== "POST") {
      return Response.json({ error: "POST required" }, {
        status: 405, headers: { Allow: "POST" },
      });
    }
    if (request.headers.get("content-type")?.split(";")[0].trim()
        .toLowerCase() !== "application/json") {
      return Response.json({ error: "JSON required" }, { status: 415 });
    }
    try {
      const body = await readAiJsonBody(request);
      const input = approval
        ? validateAiApprovalDecision(body) : validateAiWorkspaceRequest(body);
      if (!await authorize(request, input.workspaceId, request.signal)) {
        return Response.json({ error: "Workspace access denied" }, { status: 403 });
      }
      if (request.signal.aborted) {
        throw new DOMException("Request cancelled", "AbortError");
      }
      if (approval) {
        await decide(input as AiApprovalDecision, request.signal);
        return new Response(null, { status: 204 });
      }
      return createAiProtocolResponse(
        validateAiWorkspaceRequest(input), infer, { signal: request.signal },
      );
    } catch (error) {
      if (request.signal.aborted) throw error;
      const invalid = error instanceof AiProtocolError;
      return Response.json({
        error: invalid ? "Invalid AI request" : "AI request could not be accepted",
      }, { status: invalid ? error.code === "request-limit" ? 413 : 400 : 503 });
    }
  };
}
```

`infer(request, signal)` yields `AiPublishedEvent` values without the envelope or `start`; `createAiProtocolResponse` adds workspace/request identity, validates transitions, applies bounds and encodes lines. Your handler must end with `complete` or `error`. Exceptions and missing terminals become a public error event without exposing the inference exception text. `authorize` uses the authenticated server session and tenant membership. `decide` resolves an existing backend approval; its acknowledgement does not synthesize tool results. Use your application's CSRF/CORS policy for these authenticated POST endpoints.

The same bridge can consume any chosen native server SDK. Normalize only published fields:

| Backend selection | Mapping into `AiPublishedEvent` |
| --- | --- |
| AI SDK 7 | Iterate `result.stream`; map `text-delta`'s `text` into a `text` delta, published sources into `source`, and the final `finish` reason/usage into a terminal and nullable counters. The SDK UI-message stream is a different protocol. |
| OpenAI Responses | Map `response.output_text.delta`; publish citations from completed public output; translate completed, failed and incomplete response states explicitly. Keep function-call arguments and private reasoning on the server. |
| Anthropic Messages | Map `content_block_delta` with `text_delta`; accumulate tool input privately, publish approved tool summaries, and map final stop reason and reported usage. Partial input JSON is not display text. |
| Gemini / Google Gen AI | Map published text/content deltas, grounding references and reported usage from the selected API. Filter thought parts and normalize its completion/error state; do not assume all Gemini APIs use the same native frame shape. |
| Gateways | Choose the gateway's configured provider/SDK dialect on the server, then emit this same NDJSON contract. A gateway URL does not imply an interchangeable native streaming protocol. |

These mappings describe consumer work; no native SDK or live inference endpoint is included or claimed tested. Official references: [AI SDK 7 migration](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0), [AI SDK stream types](https://github.com/vercel/ai/blob/main/packages/ai/src/generate-text/stream-text-result.ts), [OpenAI streaming Responses](https://developers.openai.com/api/docs/guides/streaming-responses), [Anthropic streaming](https://platform.claude.com/docs/en/build-with-claude/streaming), [Google Gen AI libraries](https://ai.google.dev/gemini-api/docs/libraries), [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/), [Vercel AI Gateway](https://vercel.com/docs/ai-gateway), [OpenRouter streaming](https://openrouter.ai/docs/api/reference/streaming).

Agent execution, retrieval, persistence and native credential management belong to the consumer backend and their corresponding integration modules. This slice provides the message/approval interface and validated transport for those published outcomes.

## Verification

```sh
node --experimental-strip-types --test tests/ai-integrations.test.mjs tests/adapters.test.mjs
```

The suite covers malformed and bounded streams, UTF-8/chunk boundaries, missing/duplicate terminal output, stalled cancellation, workspace/run mismatches, approval/rejection order and replay, routing/fallback history, progress and handoff transitions, safe trace destinations, conditional EN/ES diagnostics, HTTP/native-SSE rejection, the executable bridge, unchanged demo text flows and honest unconfigured/unknown-usage states. It does not authenticate to or infer from a native provider.
