# Integration coverage audit — 1.5.0

Checked 2026-10-20 in the active native checkout. This records a source review of the
[65 reviewed candidates](../research/2026-10-20/integrations/catalogue.json),
their `proposedUi`, definitions and current workbenches, with separately scoped
local verification receipts. Source implementation, local demo acceptance and
native provider acceptance are distinct. No new provider-account, Figma or
Lighthouse certification is claimed.

## Initial findings and implementation status

All fifteen findings retain the full proposed frontend scope, including concrete
optional consumer bindings. A configuration card or a generic action form does
not establish the proposed domain behavior. The tables now describe the fixes
visible in source and their acceptance status, rather than repeating the initial
missing-state snapshot.

| ID | Candidate | Current implementation and source | Acceptance and consumer boundary |
| --- | --- | --- | --- |
| G1 | `convex` | **Source fixed:** [the data workbench](../../src/components/integrations/product-data.tsx#L196) accepts query-scoped `subscribeData` and connection-wide `adapter.subscribe`. [Reactive result guards](../../src/components/integrations/product-data-reactivity.ts) distinguish an authoritative page from a refresh signal, preserving controlled query/sort/page, scope checks, request epochs and cleanup. | **Scoped local acceptance passed:** Sartre reports 1/1 targeted static-browser case on port 3134, retaining pause/refresh behavior. The reactive data case's generic uppercase `Archived` assertion is now case-insensitive. Its full-suite rerun remains part of pending root QA. Actual reactive results remain consumer-supplied. |
| G2 | `lexical`, `blocknote` | **Source fixed:** [format discovery and blank documents](../../src/components/integrations/product-document-defaults.ts#L6) select the declared format and provide a Lexical root/paragraph or BlockNote paragraph array. [Initialization and reset](../../src/components/integrations/product-document.tsx#L65) use that helper. | **Local browser acceptance passed:** the parent reports initial/retrieved/New/reset document cases passed in the root run. G5 separately verifies optional SDK serialization; neither provider's native document is replaced by a generic `{}` default. |
| G3 | `github-apps`, `jira` | **Source fixed:** [definitions](../../src/lib/integrations/definitions.ts) declare PR reading/creation and issue-specific transition reading/application. [The connector workbench](../../src/components/integrations/product-connectors.tsx#L105) exposes both write kinds, PR inputs/results and allowed Jira transitions with reviewed, revision-bound requests. | **Local browser acceptance passed:** Parfit's scoped G3/G13 checkpoint and the parent's initial root connector cases passed. Existing head/base branches and actual transition IDs are required; no commits, pushes, merges or hardcoded Jira status transitions are implied. |
| G4 | `algolia`, `self-hostable-search` | **Source fixed:** [the search workbench](../../src/components/integrations/product-search.tsx) displays reported facets/counts and sends `values.facets`. [The shell](../../src/components/blocks/dashboard-shell.tsx) accepts a typed consumer search adapter; [the palette](../../src/components/integrations/search-bridge-command.tsx) retains navigation, preview, retry/cancel and scope cleanup. | The G4 receipt below records 15 pure tests and six local browser scenarios. Host wiring and authorized backend results remain explicit; no provider-account acceptance or fallback to sample customer records is implied. |
| G5 | `tiptap`, `lexical`, `blocknote` | **Source fixed:** [concrete optional editor bindings](editors.md) provide Tiptap StarterKit, Lexical composer and BlockNote block/slash/attachment recipes, using [Aureform editor controls](../../src/components/integrations/product-editor-controls.tsx) and the existing revision/review slot. | **Scoped binding verification passed:** [the optional-binding receipt](optional-binding-validation.json) records six strict TSX examples, including Mapbox, and four isolated SDK round-trips. The three editor checks verify native JSON/change events; workbench document browser cases also passed. Optional SDK examples are not authenticated-provider or SDK-browser certification. BlockNote core/React MPL-2.0 and XL licensing stay separate. |
| G6 | `pgvector`, `vector-stores` | **Source fixed:** reviewed `delete-source` definitions require `knowledge.delete`, `resourceId` and `sourceId`; [the knowledge workbench](../../src/components/integrations/product-knowledge.tsx#L64) and [removal model](../../src/components/integrations/product-source-removal.ts) now present selected-source review and reported deleting/deleted/error states. | **Local browser acceptance passed:** knowledge ingestion/retrieval/evaluation and reviewed source-removal cases passed in the initial root run. Local deletion bindings also passed in the 317-association receipt. A receipt/job alone cannot complete deletion. Backend reconciliation remains required; original external files are not erased implicitly. |

Line anchors describe the inspected source snapshot; concurrent changes may move
them. Candidate IDs and concrete triggers identify the behavior to recheck.
Owner-reported acceptance receipts are listed separately below; implementation
assignment alone does not close a finding.

## Additional material frontend follow-through

These findings cover the remaining `proposedUi`. A consumer transport is the
accepted boundary; the implemented presentation, extension hooks and concrete
recipes stay in scope. Generic record rendering alone is not counted as their
domain implementation.

| ID | Candidates | Current source evidence | Acceptance and consumer boundary |
| --- | --- | --- | --- |
| G7 | `google-drive` | **Source fixed:** [the Picker binding](../../src/lib/integrations/drive-picker.ts) and [selection panel](../../src/components/integrations/drive-picker-panel.tsx) explicitly select/register files and refresh resources. The [consumer recipe](browser-bindings.md) specifies limited `drive.file` authorization and revoked/stale/indexing handling. | **Local browser acceptance passed:** the parent reports browser-binding cases passed in the initial root run. Actual Google consent/token handling and authorized registration/indexing remain consumer-owned; demo selections are labeled local files. |
| G8 | `cloudinary`; media attachment variants | **Source fixed:** [the media binding](../../src/lib/integrations/media-collection.ts) and [media panel](../../src/components/integrations/media-collection-panel.tsx) reuse the existing crop/order/alt-text editor, with typed load/save, revisions and idempotency. [The recipe](browser-bindings.md) separates public assets from private attachments. | **Local browser acceptance passed:** reviewed public-media collection cases passed in the initial root run. Original File upload remains separate. Byte progress is not invented; provider transfer and delivery transformations remain consumer work. |
| G9 | `existing-maps`, `mapbox` | **Source fixed:** [the renderer contract](../../src/lib/integrations/map-renderer.ts) accepts approved locations/geometry; [Google/MapLibre bindings](../../src/components/integrations/connected-map.tsx) render those data with selection, attribution and fallback. [The optional Mapbox recipe](mapbox-binding.md) mounts/removes a native renderer through the same hook. | **Scoped local verification passed:** map/browser cases passed in the initial root run. The optional receipt includes Mapbox strict compilation and native coordinate/bounds/GeoJSON serialization, not WebGL, tiles or token/style/account acceptance. Consumer-approved styles, browser-token restrictions and attribution remain explicit. |
| G10 | `enterprise-identity`, `microsoft-365`, `salesforce` | **Source fixed:** typed connection enterprise metadata and [the action binding](../../src/lib/integrations/enterprise.ts) feed [domain/SSO/approval, consent/mode/renewal and policy/sync diagnostics](../../src/components/integrations/enterprise-diagnostics.tsx). [The recipe](browser-bindings.md) defines consumer callbacks and unknown states. | **Local browser acceptance passed:** browser-binding/identity cases passed in the initial root run. Logical UI grants remain distinct from provider scopes. Actual administrator approval, policy enforcement and synchronization are never inferred from local checkboxes. |
| G11 | `ai-gateways`, `alternative-ai-observability`, `openai-agents` | **Source fixed:** [strict AI events](../../src/lib/ai-integration.ts) carry per-run routing/fallback, progress and handoffs; [AI parts](../../src/components/blocks/ai-message-parts.tsx) show approved error traces and administrator diagnostics. Typed tool runs feed [the ProductAgents summary](../../src/components/integrations/product-agent-run.tsx), with dedicated [rendering/model tests](../../tests/product-agents.test.mjs). [The AI recipe](ai.md) defines those mappings. | **Local browser acceptance passed:** the parent reports ProductAgents and AI cases passed in the initial root run; current units are 865/865. The old duplicate-map-ID failure is resolved. Only published summaries and authorized trace references are displayed; private chain of thought is not a missing feature. |
| G12 | `n8n`, `managed-automation` | **Source fixed:** [workflow helpers](../../src/components/integrations/operational-workflows.ts) and [the automation workbench](../../src/components/integrations/operational-jobs-automation.tsx) implement reviewed failed-run retry packets, reported owner/account states and safe selected/public template links. [Operations documentation](operations.md) defines unknown metadata and the predefined-workflow boundary. | **Scoped local acceptance passed:** Peirce's workflow/email checks and the initial root automation, mapping, permission and workspace browser cases passed. Backend run ownership, selected accounts, retry execution and final status remain required; no external end-user workflow builder is claimed. |
| G13 | `hubspot`; other CRM update recipes | **Source fixed:** [connector conflict recovery](../../src/components/integrations/product-connectors.tsx#L431) compares refreshed remote fields, preserves the local draft, rebases to an observed revision and requires renewed review. [Action helpers](../../src/components/integrations/product-connector-actions.ts) preserve immutable domain requests. | **Local browser acceptance passed:** Parfit's scoped G3/G13 checkpoint and the parent's initial root connector cases passed. Initial/incremental sync diagnostics must come from consumer metadata rather than a recent local response timestamp. |
| G14 | `realtime-messaging`, `liveblocks` | **Source fixed:** [collaboration](../../src/components/integrations/product-collaboration.tsx) renders native Aureform avatars and reported thread/reply groups using [bounded projection helpers](../../src/components/integrations/product-collaboration-model.ts). Optional `threadId`/`parentId` inputs are declared only on the two applicable publish actions; [the seed](../../src/lib/integrations/demo-adapter.ts#L165) now types all collaboration messages as `message`. | **Local browser acceptance passed:** [four dedicated scenarios](../../tests/e2e/integrations-collaboration.spec.ts) passed for Liveblocks/realtime, EN/ES at 360 px, including loaded avatars, reviewed replies, persisted parent/thread IDs and room-change cleanup. The parent reports these four also passed in the initial root run. The separate 13-test model scope is retained below. |
| G15 | `resend-react-email`, `email-delivery-alternatives` | **Source fixed:** the delivery contract now includes rejected/bounced dispositions, reason code and occurrence time. [Email event helpers](../../src/components/integrations/operational-email-events.ts) and [the email workbench](../../src/components/integrations/operational-files-email.tsx) preserve the reported projection documented in [operations](operations.md). | **Scoped local acceptance passed:** Peirce's exact event-projection checks and the initial root email preview/review, grant-denial and localized queue browser cases passed. Actual provider events and safe authorized mappings remain backend-owned; no real send, rejection or bounce is inferred from a local receipt. |

All fifteen have concrete implementation paths and scoped verification evidence.
Resolved seed, document, removal and ProductAgents follow-through is no longer
listed as missing frontend behavior. The final
[local QA receipt](../qa-runtime-1.5.0.json) records 290 accepted scenarios per
root and mounted host, with the actual cohorts and focused reruns preserved.
Those frontend checks add no native-provider certification.

## Inventory and evidence boundaries

The evaluated current source is version **1.5.0**: **134 catalogue routes plus
landing = 135 views**, **127 registry entries** and **24 documentation articles**.
The definition module contains exactly **65 candidates, 86 provider choices,
248 actions and 17 families**, in the reviewed catalogue's order. Its SHA256
matches the current provider coverage manifest. These are inventory counts,
not acceptance results for every proposed UI behavior.

The six added definition actions are PR reading/creation, Jira transition
reading/application, and deletion in pgvector and the vector-store candidate.
There are **317 option/action associations**. The
[current local contract receipt](provider-action-validation.json) records all
317 executed with **zero failures**, **318 tests including the aggregate**,
317 idempotent replays, 317 workspace
rejections, 333 required-field rejections, five file uploads and zero fetch
attempts. Its seven recorded source hashes match current source at this
handoff. The [provider manifest](provider-coverage.json) now references that
current receipt and current definition/contract/catalogue hashes. Its entire
prior 310-association smoke is retained as explicit historical evidence at its
own hashes. No native provider acceptance is added by counts, hashes or local
mock receipts.

The Figma baseline remains **69 immutable route roots**. The Hub and 65 recipe
routes are **66 additions in delivery category 1.5, code only**. They acquire no
Figma ID, native visual review, Code Connect certification or Lighthouse result.
Original audit versions, statuses and proof hashes retain their original scope.

## Historical generator checks completed

The generator interprets a bounded TypeScript data subset rather than executing
the catalogue. It accepts the current alias
`@/lib/integrations/route-index`, named local data imports, literal arrays,
mapped spreads, assertions and pure data-returning map callbacks. Only the
catalogue and minimal route-index are allowed data modules. Dispatcher analysis
recognizes literal `next/dynamic` imports and the local `ScopedAIWorkspace`
wrapper. The large provider definitions are not loaded into the application
catalogue by this change.

Both output modes were evaluated at the earlier **119-entry registry snapshot**,
with filesystem writes intercepted in memory:

| Mode | Only permitted outputs | Directory creation |
| --- | --- | --- |
| `--docs-only` | `docs/coverage.json`, `docs/coverage.es.md` | None |
| Default | The two documentation files, `public/coverage.json`, `public/coverage/index.json` | `public/coverage` |

The captured outputs agree between modes. Those historical assertions checked all 135 views,
119 registry entries, 24 articles, 66 code-only routes, the exact 69 frozen
route IDs, no pending native additions, and false current-version/browser/native
provider certification. **586 existing files**, including all `.figma` files,
the image manifest and existing coverage outputs, had unchanged SHA256 before
and after these intercepted runs. No coverage output, historical proof, Figma
state, manifest or certificate was rewritten by those intercepted checks.
They are not a new 127-entry output receipt. No generator output is written in
this final audit update; the parent owns the final generator run.

Eight isolated data fixtures also passed: literal routes, alias/relative mapped
spreads, type assertions/`satisfies`, return-body mappers, type-only imports,
primitive templates and ignored module side effects. Thirteen unsafe or
unsupported fixtures were rejected, including arbitrary calls, getters,
computed properties, circular data, async/destructured/default/rest mappers,
inherited property access and arrays beyond the bound. No module side effect
was executed and no fixture wrote a file.

No root build, root formatting, new dependency, branch change, commit or
deployment is part of this work.

## All 65 proposed UI reviews

Each row below compares the reviewed `proposedUi` with the selected family's
source. “Present” means a concrete frontend path is visible in source, not a
browser or native-provider acceptance result. Configured provider options are
kept separately in the [semantic manifest](provider-coverage.json), including
Amazon S3/R2, Resend/React Email, all gateways/vector stores, WorkOS/Auth0, broker
choices and every Microsoft 365 role.

The underlying workflows are [data](../../src/components/integrations/product-data.tsx),
[identity](../../src/components/integrations/identity-panel.tsx),
[commerce](../../src/components/integrations/specialized-workbench.tsx),
[files/email](../../src/components/integrations/operational-files-email.tsx),
[observability/inboxes](../../src/components/integrations/operational-observability-notifications.tsx),
[jobs/automation](../../src/components/integrations/operational-jobs-automation.tsx),
[content](../../src/components/integrations/product-document.tsx),
[search](../../src/components/integrations/product-search.tsx),
[collaboration](../../src/components/integrations/product-collaboration.tsx),
[maps](../../src/components/integrations/product-maps.tsx),
[AI](../../src/components/templates/ai-workspace.tsx),
[knowledge](../../src/components/integrations/product-knowledge.tsx),
[agents](../../src/components/integrations/product-agents.tsx) and
[connectors](../../src/components/integrations/product-connectors.tsx).

| # | Exact candidate ID | Observed frontend and remaining proposed behavior |
| --- | --- | --- |
| 1 | `tanstack-query` | Present: controlled external query/sort/page, pending/error/empty/retry/cancel and scoped edits. The consumer still supplies its cache/fetcher and authenticated API. |
| 2 | `supabase-data` | Present: authoritative remote table/mutations, denied feedback, optimistic rollback and conflict refresh. Tenant/RLS enforcement remains backend-owned. |
| 3 | `better-auth` | Present: separate injected email/social identity, recovery, verification, sessions, organizations/invites and MFA. Consumer callbacks establish actual sessions. |
| 4 | `clerk` | Present: the same Aureform access/account screens and consumer organizations/invitations/sessions. No Clerk login is activated by a connection card. |
| 5 | `supabase-auth` | Present: social/email/recovery/verification and account/session UI. Supabase callbacks and data RLS remain separate consumer responsibilities. |
| 6 | `authjs-nextauth` | Present: injected access/session workflow, reports and migration boundary. It stays an alternative rather than being combined with the other identity providers. |
| 7 | `enterprise-identity` | Present: WorkOS/Auth0 alternatives, organization/member/invite/session flows and G10 consumer-reported domain/SSO/administrator-approval diagnostics. Real approval and connection policy remain backend-owned. |
| 8 | `swr` | Present: editable API-backed records and request recovery. SDK-specific cache/revalidation is a consumer recipe, not an installed client cache. |
| 9 | `neon-drizzle` | Present: backend-query table, validated edits and version/conflict recovery. Neon and Drizzle retain their database/ORM roles; SQL stays server-side. |
| 10 | `prisma` | Present: API-backed records/editor and request/conflict feedback. Prisma schema/client/persistence are consumer backend work. |
| 11 | `firebase` | Present: remote query/edit, denial and general connection/sync feedback. Verify the consumer's offline/synchronization projection; no Firestore offline SDK cache is bundled. |
| 12 | `convex` | Present: query/editor, mutation failures and G1 scoped reactive row delivery/refresh hooks with cleanup. The targeted static-browser case passed 1/1 with pause/refresh preserved; the clean global rerun remains pending. Actual Convex result subscription is consumer-supplied. |
| 13 | `trpc` | Present: query controls, record mutations and validation/error feedback. Typed tRPC procedures and query-cache binding are supplied by the consumer. |
| 14 | `stripe` | Present: injected products/prices, checkout, orders/invoices, plans and portal workflows. Verified events, secrets and final financial state are backend-owned. |
| 15 | `paddle` | Present: its own commerce adapter choice and pending/error/cancel/portal UI. MoR/server-confirmed payment semantics are preserved. |
| 16 | `polar` | Present: separate billing/customer/entitlement presentation through the commerce adapter. Entitlements and verified completion come from the backend. |
| 17 | `lemon-squeezy` | Present: provider-selected hosted checkout/portal and invoice/order presentation. Hosted URL trust and reconciliation remain consumer responsibilities. |
| 18 | `s3-r2-storage` | Present: separate S3/R2 choices, original File upload, alt metadata, indeterminate pending/retry and optional G8 media collection binding. Signed/private transfers and preview proxies remain separate from public crop/order delivery. |
| 19 | `supabase-storage` | Present: bucket/resource selection, upload/library errors, retry and retained file draft. Expired/private preview links require an authorized consumer proxy and truthful status. |
| 20 | `cloudinary` | Present: upload, asset report, declared transformation operation and G8 crop/order/alt-text editor with typed collection load/save and review. Cloudinary delivery transforms and authorized uploads remain consumer-owned. |
| 21 | `uploadthing` | Present: file selection/validation, upload/retry and returned authorized assets. The selected file route/callback policy is consumer-owned. |
| 22 | `resend-react-email` | Present: distinct delivery vs template-only option actions, preview, variables, reviewed send and G15 queued/sent/failed/rejected/bounced projection. Authorized provider event mapping remains backend-owned; React Email does not send. |
| 23 | `email-delivery-alternatives` | Present: Postmark/SendGrid/SES choices, sender/domain reports, preview, reviewed sends/retry drafts and G15 provider-disposition projection. No actual delivery or provider event is fabricated. |
| 24 | `sentry` | Present: returned error/event diagnostics and opt-in manual reporting/recovery. SDK initialization, sampling, redaction and persistent consent are consumer-owned; no tracking activates on connect. |
| 25 | `posthog` | Present: returned events/metrics, flag editing and explicit session opt-in for manual events. Consumer capture/consent preferences and fallback policy must be wired deliberately. |
| 26 | `vercel-analytics` | Present: deployment configuration references, returned analytics and controlled event submission. Eligible deployment instrumentation is opt-in consumer work. |
| 27 | `notification-inboxes` | Present: Knock/Novu inbox, reported unread/read, preferences, review/delivery failures and reconnection. “Seen in this view” is local unless a consumer read-state write is declared; verify persistent read behavior. |
| 28 | `background-jobs` | Present: Inngest/Trigger.dev choices, runs/steps/progress/logs, refresh, cancellation and reviewed new-run retry. Durable retry/cancellation is not inferred from stopping a request. |
| 29 | `realtime-messaging` | Present: live updates, stale/reconnect, scoped cleanup and G14 reported avatars/thread replies. Dedicated EN/ES 360px browser cases passed. Supabase Realtime/Ably/Pusher retain separate transports; thread metadata is consumer application data, not native threaded-transport certification. |
| 30 | `liveblocks` | Present: room authorization boundary, subscription/presence, document conflicts and G14 avatars/explicit thread replies. Dedicated EN/ES 360px browser cases passed, including persisted replies and room cleanup. Actual authorized Comments mapping remains consumer-owned. |
| 31 | `tiptap` | Present: versioned document/save/recovery, editor slot and concrete G5 optional StarterKit/JSON binding with Aureform toolbar/block controls. Pinned SDK compile/round-trip passed; browser acceptance of the example remains separate. |
| 32 | `lexical` | Present: JSON persistence/preview/conflict, G2 native blank root/paragraph and G5 optional composer/node serialization binding. Pinned SDK compile/round-trip and initial root document/New/reset browser cases passed; optional SDK browser/account acceptance is a separate scope. |
| 33 | `blocknote` | Present: JSON persistence/preview/conflict, G2 native blank paragraph array and G5 optional block/slash-menu/attachment binding. Pinned SDK compile/round-trip and initial root document/New/reset browser cases passed. Core/React MPL-2.0 and XL licensing are distinct. |
| 34 | `algolia` | Present: ranked search, snippets/sources, remote pages, empty/retry, reviewed indexing and G4 consumer palette/response-driven facet controls. Provider-backed browser QA remains separate. |
| 35 | `self-hostable-search` | Present: separate Meilisearch/Typesense choices, search/index report/ingestion, request recovery and G4 consumer palette/response-driven facets. Provider-backed browser QA remains separate. |
| 36 | `existing-maps` | Present: opt-in MapLibre/Google choices, geocode/route actions and G9 renderer hook using returned locations/geometry, selection, attribution and fallback. Consumer style/credentials and real map-service acceptance remain explicit. |
| 37 | `mapbox` | Present: source/geocode/route actions, errors and a concrete G9 optional renderer recipe with geometry, selection, attribution and disposal. The optional receipt verifies strict compilation and coordinate/bounds/GeoJSON serialization; WebGL, tiles, tokens/styles and provider connectivity remain outside that receipt. |
| 38 | `ai-sdk` | Present: normalized published streaming, text, stop/retry, sources, tools/approval, files and reported tokens. UIMessage/native stream mapping is an explicit consumer bridge; arbitrary native parts/structured payloads are not automatically accepted. |
| 39 | `openai-responses` | Present: its injected Responses workflow with streaming/error/cancel/retry, citations, tools and returned usage. Server mapping/actual inference are not bundled. |
| 40 | `anthropic-messages` | Present: provider-selected normalized text/citation/tool/error flow. Native frame/input-JSON mapping is backend work. |
| 41 | `google-gemini` | Present: current Gen AI choice and normalized text/source/tool/usage behavior. Local text attachments are not a claim of native multimodal transport. |
| 42 | `ai-gateways` | Present: Cloudflare/Vercel/OpenRouter choices, approved models/policy reports and G11 administrator-only reported run routing/fallback diagnostics. Backend inference and actual route selection remain consumer-owned. |
| 43 | `pgvector` | Present: source selection, upload/ingest/progress, retrieval/citations, evaluation and G6 reviewed removal with reported lifecycle. Model/local action checks and the initial root knowledge/removal browser case passed. Backend deletion reconciliation remains required. |
| 44 | `vector-stores` | Present: Pinecone/Qdrant choices, ingestion, retrieval/freshness and G6 reviewed removal with deleting/deleted/error guards. Model/local action checks and the initial root knowledge/removal browser case passed. No receipt alone proves indexed copies were removed. |
| 45 | `langfuse` | Present: selected trace/usage/evaluation reports and explicit absent metrics. Actual telemetry registration, trace links and v7 bridge are consumer work; no values are estimated. |
| 46 | `alternative-ai-observability` | Present: LangSmith/Helicone role-filtered trace/usage operations and G11 approved trace navigation from AI errors; evaluation only for its supported option. Telemetry capture, authorized trace references and redaction remain consumer work. |
| 47 | `mcp` | Present: connection/resource grants, tool discovery, argument editor, review and approval/rejection/results. HTTP transport authorization/tool execution/resume are consumer-owned, not app identity or synchronization. |
| 48 | `cloudflare-agents` | Present: agent/task/tool/run review, progress/history/checkpoint/resume input and reconnection boundary. Durable run state and live event connectivity come from the consumer runtime. |
| 49 | `langgraph` | Present: run/progress/checkpoint discovery, review and consumer approval/resume input. Basic streaming chat remains independent; actual persistence/interrupt semantics are backend-owned. |
| 50 | `openai-agents` | Present: tool/task review, approval and G11 typed handoff/progress summaries in AI and ProductAgents paths, with EN/ES rendering and approval/rejection snapshot tests. Current units and initial root ProductAgents/AI browser cases passed; actual agent execution remains consumer-owned. |
| 51 | `slack` | Present: authorized workspace/channel selection, message composition/review, denial/delivery errors and connection recovery. Real granted scopes are backend metadata, not the logical checkboxes. |
| 52 | `github-apps` | Present: installation/repository selection, issue actions and G3 PR resources, reading, domain inputs/review and typed draft/open result. Covered by the reported G3/G13 local browser checkpoint; actual installation permissions remain consumer-owned. |
| 53 | `google-drive` | Present: authorized resources, links/ingestion, stale/revoked states and G7 explicit native Picker binding with selected-file registration/refresh. Actual limited `drive.file` consent/token handling and indexing remain consumer-owned. |
| 54 | `google-calendar` | Present: calendar/timezone configuration, event/time-window read, reviewed create/update and resource refresh. Actual availability/timezone and freshness come from consumer event metadata. |
| 55 | `notion` | Present: authorized page/data-source selection, document editing/preview, mapping, citations/resource links and denied/reconnect states. API version, sharing and sync are consumer-owned. |
| 56 | `microsoft-365` | Present: SharePoint/OneDrive/Teams/Outlook role-filtered actions and G10 reported delegated/application mode, scopes, consent, renewal and delta-sync diagnostics. Logical frontend grants do not establish actual Graph consent. |
| 57 | `linear` | Present: team/project/status references, field mapping, reviewed create/update and result/denial states. Live mappings and sync freshness are consumer data. |
| 58 | `jira` | Present: site/project/type/schema configuration, issue read/create, mappings and G3 issue-specific allowed transition discovery, required fields and immutable reviewed application. Covered by the reported G3/G13 local browser checkpoint; no status-to-transition guess is made. |
| 59 | `hubspot` | Present: account/object/property mapping, remote previews, reviewed updates and G13 conflict comparison, remote refresh and explicit rebase/re-review. Covered by the reported G3/G13 browser checkpoint; sync state must be consumer-reported. |
| 60 | `zendesk` | Present: subdomain/account/resources, ticket status mappings, create/update review and errors/reconnect. Consumer returns actual delivery/sync health. |
| 61 | `salesforce` | Present: org/sandbox/object/property references, reviewed updates, G10 reported enterprise policy/sync diagnostics and the G13 connector conflict-recovery path. Actual organization policies and synchronization remain backend-owned. |
| 62 | `oauth-brokers` | Present: Nango/Pipedream connection authorization/lifecycle, resources, sync reports and approved proxy/tool actions. SDK/service licensing remains separate; stale/account-specific state requires consumer metadata. |
| 63 | `composio` | Present: linked-account/tool discovery, reconnect, structured arguments, review, returned approval and results. Provider scopes/account ACLs are independently enforced by the consumer. |
| 64 | `n8n` | Present: predefined workflow references, mapped input/review, returned monitoring and G12 reported owner/accounts with immutable failed-run retry review. Unknown metadata stays unknown; no end-user workflow builder or remote ownership is inferred. |
| 65 | `managed-automation` | Present: Make/Zapier alternatives, outbound inputs/mappings, run history and G12 safe selected/public template links plus reviewed retry/results. Browsing a template does not activate a provider workflow. |

## Definition additions and provider boundaries

The new operations have explicit logical write permissions and `requiresReview`.
Their option mappings restrict deletion to the declared pgvector, Pinecone and
Qdrant recipes and preserve all pre-existing mixed-role filters. PR creation
maps approved existing head/base branches and account-supported drafts; it does
not write code or merge a PR. [GitHub's current PR API](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request)
supports that reviewed request shape; its actual permissions remain a backend
mapping rather than frontend authority.

Jira discovers issue/user-specific transition IDs and required screen fields,
then applies the selected transition and reads back actual issue state. The
official endpoint page could not be read through the search renderer; its
[published OpenAPI specification](https://dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json)
was inspected directly for the GET/POST transition operations. A workflow status
label is not interchangeable with a transition ID.

Vector deletion maps an authorized source to indexed copies and reconciles the
consumer source registry. Pinecone's configured API supports
[ID/metadata deletion](https://docs.pinecone.io/guides/manage-data/delete-data);
Qdrant provides [point deletion](https://api.qdrant.tech/api-reference/points/delete-points).
The consumer selects the supported API/selector, validates source/tenant
ownership and returns follow-up deletion state. These actions do not delete
whole indexes/collections or original external files. Existing SDK and hosted
licensing caveats and package references remain unchanged.

Collaboration adds optional `threadId` and `parentId` only to
`realtime-messaging.publish-channel-message` and `liveblocks.publish-comment`.
For Supabase Realtime, Ably and Pusher these are application metadata, not a
claim of native threaded transport. The Liveblocks consumer maps them to its
authorized Comments/room model. Author identity and safe avatar URLs are
server-reported; the frontend does not expose author-impersonation inputs.

## G14 — thread and avatar receipt

[The projection model](../../src/components/integrations/product-collaboration-model.ts)
accepts bounded message/chat/comment records from the selected room and explicit
thread/parent IDs. Unthreaded records remain a flat conversation; absent parents
are labeled unavailable rather than invented. Duplicate IDs, cycles, cross-thread
parents and changed room/scope cannot authorize a reply. Review and confirmation
revalidate the known reply target. Connection-wide updates need a reported
resource binding. Revoked/stale scope clears presence and pending reply/review
state and stops accepting subsequent updates.

[The workbench](../../src/components/integrations/product-collaboration.tsx)
uses the existing Aureform Avatar with reported HTTPS/local proxy URLs and
initials fallback. Author avatars join reported `authorId` to a reported presence
ID; names or generic owner fields do not establish that identity. No image
generation or new asset is required.

| Check | Accepted scope and result |
| --- | --- |
| [Thirteen new tests](../../tests/product-collaboration.test.mjs) | Passed: explicit/flat/partial thread projection, invalid parents and IDs, bounded history, room/workspace/connection scoping, current reply gates, publish-field allowlisting, reported identity joins, safe avatar URLs and four local option round-trips with write denial. |
| [Twenty-one regression tests](../../tests/product-integrations.test.mjs) | Passed: existing product models, reactive data/default documents, reported removal state, scope changes and asynchronous subscription cleanup. This is not 21 collaboration browser scenarios. |
| Scoped TypeScript and ESLint | Passed for collaboration helpers/UI/definitions and their import closure; no build or emitted output. |
| Local browser: presence and ordinary publish | Alex/Isabel/Noor generated SVG avatars loaded. Ordinary message review rejection and confirmation passed. No page errors, external provider calls or external asset requests were observed in those checks. |
| Local browser: threaded reply | **Passed, 4/4 dedicated scenarios:** Liveblocks/realtime in EN/ES at 360×800. Reported parent/thread IDs, loaded presence and author avatars, review cancellation/confirmation and persistent replies were verified. The parent reports these cases also passed in the initial root run. |
| Local browser: room changes and following | **Passed in the same four scenarios:** an unsent reply and old review clear on room change; previous-room messages are excluded; returning and refreshing reloads the confirmed reply. Unfollowing removes the reconnect control while manual refresh remains usable. |

The four local publish round-trips cover the three realtime provider options
and Liveblocks, not their native transports. G14's definition update preserves
**65/86/248/317** candidate/option/action/association counts. Definition SHA256:
`1010cc95921f80c254990f5ee6f9fabaffe059e4cfa0fc28cce5956bb39f8439`.
[The seed](../../src/lib/integrations/demo-adapter.ts#L165) now emits `message`
for all 24 collaboration records; roots/replies remain explicit reported
`threadId`/`parentId` relations. The old resource-type blocker is resolved.
[The dedicated browser spec](../../tests/e2e/integrations-collaboration.spec.ts)
passed locally in 20.8 seconds, with zero uncaught page errors, external HTTP
attempts or consumer-backend calls. Its source SHA256 is
`5d592da2d1e7e0f3e6d6f89f8e2144c0e667d1dc352d452a807560ab68e88e7e`.
These are four browser cases, distinct from the thirteen model tests and four
model option round-trips. Current and historical evidence is scoped separately
in the refreshed provider manifest; native provider acceptance remains false.

## Scope of verification and retained evidence

The updated definitions passed a scoped strict TypeScript check against current
contracts. Counts, exact candidate order, action uniqueness, declared logical
grants, write-review flags and option/action membership were checked directly
from the definition module. Those are semantic/source checks. The local receipts
above and below have their own scope; none establishes native provider, Figma or
Lighthouse certification.

The following checkpoints were reported by the named owners or recorded in their
linked receipts. They were not rerun wholesale for this final read-only source
review, and their counts must not be added as independent full-coverage totals.

| Findings | Receipt available at this checkpoint | Limit |
| --- | --- | --- |
| G1/G2/G6 | Twenty-one product-model regressions passed locally. The parent reports initial/retrieved/New/reset document and knowledge-removal browser cases passed in the root run. Sartre reports 1/1 targeted reactive-table case on static port 3134 after the case-insensitive archived-status assertion fix, preserving pause/refresh. | Targeted passes do not replace a clean whole-root rerun. Live database subscriptions and actual indexed-copy deletion remain consumer-owned. |
| G3/G13 | Parfit reports 83 local browser checks: 65 recipe smoke checks plus 18 functional checks. | Local PR/Jira/CRM domain acceptance, not real provider writes or all proposed workbench behavior. |
| G4 | The maintained checkpoint below records 15 pure tests, six local browser scenarios and scoped lint/full TypeScript checks. | The injected adapter is checked through its contract/request gate; no native Algolia/Meilisearch/Typesense account is certified. |
| G5/G9 optional SDK bindings | [Current optional-binding receipt](optional-binding-validation.json): **six strict TSX examples** using real SDK/public Aureform imports, zero diagnostics/ambient stubs, and **four round-trips** for Tiptap, Lexical, BlockNote and Mapbox. Mapbox also has a separate declaration check with `skipLibCheck: false`. | Isolated consumer installation; other examples use `skipLibCheck: true`. Mapbox verifies coordinates/bounds/GeoJSON, not WebGL/tiles. No shared-app dependency, authenticated account, SDK-browser or Figma certification is inferred. |
| G7–G10 | Parent reports maps, browser-binding and identity cases passed in the initial root run. The earlier four scoped browser checks and ten core-binding unit checks retain their own scope. Concrete hooks and [consumer recipes](browser-bindings.md) are present. | Local browser/binding acceptance, not live Google Picker, media storage, map-service or enterprise-consent acceptance. |
| G11 | [Dedicated ProductAgents tests](../../tests/product-agents.test.mjs) cover published EN/ES summaries, handoff states, unknown/zero counts, safe traces and demo approval/rejection. The parent reports ProductAgents and AI browser cases passed in the initial root run; current core units are 865/865. | The old map-ID failure is resolved. Published summaries are not private reasoning or commands to execute an agent; native inference remains consumer-owned. |
| G12/G15 | Peirce's 48 unit checks, 13 CLI checks and strict checkpoint passed. Initial root operation cases passed for automation/mapping, email preview/review, grant denial, workspace isolation and localized queued status. [Operations](operations.md) documents exact metadata/retry/disposition mapping. | Local helpers/distribution/browser behavior, not external workflow activation, provider account ownership or real email delivery. |
| G14 | Thirteen model tests retain their own source/scope; four dedicated EN/ES 360px avatar/thread browser cases passed here, including room-change persistence/cleanup. The parent reports those four also passed in the initial root run. | Model and browser counts are distinct. No native realtime/Liveblocks transport or provider-account certification. |
| All provider action bindings | [Current local contract receipt](provider-action-validation.json): all 65 candidates, 86 choices, 248 actions and **317 bindings/318 tests including the aggregate** passed; zero failed bindings/fetch attempts. All seven source hashes match current files. | Validated fields/results, mock dependencies, idempotency and workspace denial; no native provider connectivity or complete workbench browser certification. |
| Current integration accessibility | The parent reports **20/20 dedicated integration Axe cases passed** after the earlier accessibility fixes. | This supersedes the earlier six-case checkpoint for the current targeted run, without turning Axe checks into Lighthouse or native Figma certification. |
| Current core units | The parent reports **865/865 passed**, including two added exact-calendar-ranking tests. Earlier 863/863, 847/848 and the targeted map-ID/review-fix checkpoints retain their historical scope. | The provider aggregate/subtests are part of unit execution; these counts must not be added as independent totals. |
| Public demo observations | The parent reports **272 EN/ES desktop visits** covering 135 catalogue views plus the integration guide, **32 Spanish mobile/light observations**, **14 observed main Axe checks** and **three behavior checks**, with zero browser errors and zero HTTP failures. | This is the reported public-demo scope, separate from the 20 dedicated integration Axe cases and the whole-root suite. It is not native-provider, Lighthouse or Figma certification. |
| Initial whole-root browser run | **281/289 passed**, eight failed. Document/New/reset, knowledge removal, ProductAgents, connectors, G14, map/browser-binding, identity, AI and operation cases passed. Dedicated current Axe and the targeted reactive-table rerun passed separately. | The initial result remains 281/289. The clean rerun is in progress; the parent's latest checkpoint reports 196 passes, not a final total. Targeted passes are not relabeled 289/289. |

The coverage script's scoped syntax and lint checks pass, including the rename
from `module` to `sourceModule`. The earlier intercepted checks retain their
historical scope; the parent has now run the default four-output generator, as
recorded below.

| Frozen evidence input | SHA256 retained during generator checks |
| --- | --- |
| `.figma/state.json` | `917031950cf95f8b7aa993c2b9e278d03f308f1f12ba54549497c2b207ff9c03` |
| `.figma/history/state-1.2-final.json` | `8be9d3c1c46565296bd90c43f086b3d7159889c48167ab48d1d5f88e415b1963` |
| `.figma/native-audit-1.2.json` | `0fdb4ffafd1c10c8ce85fb0fb0703c4870bf7162fe1f9a8867e3fbab4ee04373` |
| `.figma/native-generated-images-1.2.1.json` | `1617802864a78253cb8da0ea4efbef599e3188d3703193ffabad7d66e52405ac` |
| `.figma/code-connect-manifest.json` | `9cb3b7185bd50b03d7579d658e8cb26efe6b5f7a34f0c716cae2e5d861484b4b` |

The reviewed catalogue remains
`34eb0b4e46206325f0d211bef7d6fce0b1d021120bdde39ac19a341989d34746`.
The current definition SHA256 is recorded in `provider-coverage.json`, alongside
its separate contract snapshot and historical demo evidence.
The current 317-binding receipt matches these source snapshots:

| Current local contract receipt input | SHA256 checked at final handoff |
| --- | --- |
| `src/lib/integrations/definitions.ts` | `1010cc95921f80c254990f5ee6f9fabaffe059e4cfa0fc28cce5956bb39f8439` |
| `src/lib/integrations/contracts.ts` | `4c47217bbedab48a547f793bb04544f9cec3007ee0d91bc2416fa6b2a6833a00` |
| `src/lib/integrations/demo-adapter.ts` | `5e32de36f3172ece3b2e5a289fa3146779a1bde67e5d3dc49b0bdfc136240ae0` |

The provider manifest is refreshed: definition, contract and catalogue hashes
describe current semantic metadata; its current receipt is the 317-binding
validation above. The entire old 310-binding smoke remains explicitly historical
and unchanged at its own hashes. The thirteen-model-test execution record and
four development-browser cases also retain their distinct scopes. Both the
manifest and current provider receipt keep `nativeProviderAcceptance: false`.

[README](../../README.md#L15) and the
[English](../website/en/roadmap.md#L7) /
[Spanish](../website/es/roadmap.md#L7) roadmaps now describe 69 original views plus
the Hub/65 recipes and 127 registry entries; README reports 24 chapters. Its
Lighthouse section retains the measured commit; current QA badges point to the
1.5 receipt and the earlier 1.4.1 receipt remains linked. Both roadmaps explicitly preserve the frozen native Figma 1.2.1
checkpoint and the limited synthetic scope of the 92 local Code Connect
templates. The earlier roadmap discrepancy is corrected in source, without
changing historical evidence.

The source findings and their scoped acceptance evidence are recorded for all
65 candidates. G14's seed/thread-room blocker, document defaults, source-removal
UI and ProductAgents follow-through are resolved. The final root broad run
passed 289/290; its notification tab click raced the initial inbox layout shift.
After waiting for loaded records and asserting selection, both affected
notification/workspace cases passed. No application code, behavioral assertions
or timeouts changed for that fix.

The [consolidated receipt](../qa-runtime-1.5.0.json) preserves those results.
Under `/aureform-ui`, all 216 integration, website and application cases passed
in the initial run. Legacy test URLs omitted the mount: 62 failed on navigation
and 12 did not run. After adapting six test files, all ten desktop/mobile and
64 SaaS cases passed. The three final cohorts cover all 290 scenarios; no
single clean 290-case run is claimed. Both public-demo sweeps passed 272
EN/ES desktop pages, 32 ES mobile/light pages, 14 observed main-region Axe scans
and three browser behaviors, with no page errors or failed local resources.
Temporary runner reports remain local; publication is checked separately.

The parent has run **`pnpm coverage` in default mode** and regenerated all four
outputs: [documentation inventory](../coverage.json),
[Spanish coverage report](../coverage.es.md),
[public inventory](../../public/coverage.json) and
[public index](../../public/coverage/index.json). The current JSON outputs agree
on version **1.5.0**, **135 views**, **127 registry entries**, **24 chapters**,
**69 retained native roots** and **66 code-only additions**. Their current-source
browser-runtime and native-provider certification flags remain false.
The parent reports **615 protected historical Figma/image files** with unchanged
SHA256 before and after that run. This is separate from the intercepted
119-entry/586-file generator checks preserved above.

Source inventory, local runtime/SDK/browser verification and
native-provider/Figma/Lighthouse proof are distinct. The 69-root native baseline
and its proof hashes stay frozen, and current local checks add no native provider
certification. The current delivery receipt records local checks separately
from GitHub and Cloudflare publication.

## G4 — consuming connected search

`DashboardShell` accepts `searchAdapter?: ShellSearchAdapter`. The public
types and helper are exported from
[`search-bridge.ts`](../../src/lib/integrations/search-bridge.ts):

```ts
interface ShellSearchAdapter {
  readonly mode?: "demo" | "consumer";
  search(input: {
    workspaceId: string;
    query: string;
    signal: AbortSignal;
  }): Promise<{ hits: IntegrationSearchHit[]; total: number }>;
}
```

The palette requests data only while open with a nonempty query and a ready
workspace. It aborts on query, workspace or adapter changes, closure and unmount.
Its request gate also ignores obsolete successes and failures when a backend
does not honor abort. Errors use localized application messages; endpoint
details, response bodies and stacks are not displayed. Source ranking and the
reported total are retained. A result without a safe public URL opens a
plain-text passage preview. Arrow keys and Enter use the existing `cmdk`
behavior; Escape closes the dialog.

With an injected bridge, workspace customer records are not substituted for a
failed or empty connected search. Local navigation remains a separate group.
Without an injected bridge, the palette retains its existing local navigation
and workspace-customer behavior. An explicitly supplied demo bridge is labeled
as a local preview. No service SDK is required by either interface.

### Reuse a consumer integrations adapter

Create adapters inside a Client Component or another client-owned factory.
Function objects must not cross a Server Component serialization boundary.
This component belongs inside the application's existing language, theme and
workspace providers:

```tsx
"use client";

import { useMemo, type ReactNode } from "react";
import { DashboardShell } from "@/components/blocks/dashboard-shell";
import { createIntegrationSearchBridge } from "@/lib/integrations/search-bridge";
import type {
  IntegrationDefinition,
  IntegrationsAdapter,
} from "@/lib/integrations/contracts";

export function ConnectedSearchShell({
  adapter,
  definition,
  children,
}: {
  adapter: IntegrationsAdapter;
  definition: IntegrationDefinition;
  children: ReactNode;
}) {
  const searchAdapter = useMemo(
    () => createIntegrationSearchBridge({ adapter, definition }),
    [adapter, definition],
  );
  return (
    <DashboardShell
      path={`integrations/${definition.id}`}
      searchAdapter={searchAdapter}
    >
      {children}
    </DashboardShell>
  );
}
```

Pass the search definition with the selected provider's action fields. For a
multi-provider definition, supply
`actionsForOption: (id) => getIntegrationActionsForOption(definition, id)` from
the host's already loaded definition module. The factory resolves that list
using the fresh workspace connection's `providerOptionId`, without importing
the complete provider registry into the shell. The
factory discovers a declared `search` action, with `query` as the fallback kind,
and calls `adapter.get` for the requested workspace before `adapter.execute`.
It requires a connected, matching connection and the action's logical grants.
An optional `resourceId` must belong to that connection's selected resources;
otherwise its first selected resource provides the binding. Supply any
additional public business inputs through `values`. It does not create
connections, select new resources, authorize providers, or provide an implicit
demo adapter. The backend must authenticate the caller and enforce workspace,
source and record permissions independently.

### Use an existing application search endpoint

A host can implement the small palette API without using the integrations
factory. This example assumes the host has implemented and authorized its
same-origin endpoint; it does not add that endpoint to Aureform:

```tsx
import {
  parseShellSearchResult,
  SearchBridgeError,
  type ShellSearchAdapter,
} from "@/lib/integrations/search-bridge";

export const applicationSearch: ShellSearchAdapter = {
  mode: "consumer",
  async search({ workspaceId, query, signal }) {
    const response = await fetch("/api/application-search", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, query }),
      signal,
    });
    if (!response.ok)
      throw new SearchBridgeError(
        response.status === 403 ? "permission-denied" : "provider-error",
      );
    return parseShellSearchResult(await response.json());
  },
};
```

Pass `applicationSearch` as `DashboardShell.searchAdapter`. Return authorized
plain-text titles/passages and public presentation links. Provider secrets and
signed credential URLs belong outside these results.

### Facet availability and submitted selections

The shared search result accepts `facets?: IntegrationSearchFacet[]`. Each
facet supplies `id`, `label`, reported `{ value, label, count }` buckets and
optional `selection: "single" | "multiple"`. The validated core DTO checks
unique facet/bucket IDs and bounded nonnegative counts. The workbench uses radio
controls for a single choice and checkboxes for multiple choices. Facets appear
only when the actual response reports them; an omitted or empty facet list
provides no selectable provider capability.

Selections travel in the normal `adapter.execute` values:

```ts
values.facets = JSON.stringify({
  type: ["customer", "document"],
  status: ["ready"],
});
```

The backend interprets this map. The demo applies AND between facet IDs and OR
between values of one facet. It reports counts across the authorized,
query-matching records before the chosen facets, then filters and paginates
hits. Consumer backends own their count semantics; the UI never calculates
bucket counts from the displayed page. Draft edits keep the previous response
clearly labeled. Apply and Clear return to page 0; pagination uses the last
submitted query, source, page size and serialized facet selection. Source,
workspace, permission or transport changes discard previous drafts/results.

### G4 verification checkpoint

The bridge's 15 pure tests cover reported totals/ranking, unsafe-link
previews, permission/resource/workspace checks, ignored aborts, late failures,
cancellation/retry, provider-specific action discovery, single/multiple facets
and accented navigation queries.
The current source passes full TypeScript checking and lint for the owned G4
files. The six scenarios in `tests/e2e/integrations-search.spec.ts` pass against
the local demo: both search recipes, reported counts retained after filtering,
AND/OR selection, clear/empty states, cancellation/retry, pending requests across
workspaces, palette keyboard navigation and Spanish touch use at 360px without
horizontal overflow. The palette browser scenario uses local navigation; the
injected consumer adapter is exercised through the public contract and request
gate. These receipts do not certify native provider connections.
