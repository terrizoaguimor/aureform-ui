# Integration research and provider opportunities

Aureform's next integration work should turn existing interface contracts into recipes that a consumer can operate and maintain. This chapter recommends thirteen families for SaaS products, dashboards and internal tools. Every proposed integration remains a recommendation; listing a provider does not add it to the kit.

The evidence cutoff is **October 20, 2026 UTC**, against **Aureform 1.4.1, commit `a93ab113170ec1456608cf1f85d1a89b23aaec68`**: Next.js 16.4.2, React 19.3.1, Tailwind CSS 4, Base UI and Node.js >=22.18.0. This supplements the [product research](./research.md), which retains its own earlier baseline.

## Method, popularity and confidence

Four completed investigations used **AGY 1.4.3 and `gemini-4-argon-high`**, each recording `SUCCESS`. The [provenance ledger][provenance] preserves response hashes and **99 actual search queries: 34 core, 17 operations, 24 AI and 24 connectors**. Generated responses were research leads requiring source review.

The [official npm snapshot][downloads] contains **70 SDK/package records**, all covering **October 12–18, 2026**. Counts below refer to that window. Downloads measure installation events, influenced by CI, rebuilds and transitive dependencies; they establish neither unique users nor active customers. Related packages must not be summed, and unlike categories must not be ranked together. General developer or enterprise surveys describe their sampled populations, not Next.js provider adoption. One weekly snapshot cannot establish growth.

Provider documentation establishes documented capabilities. Package engines and peer ranges establish declared compatibility. **No external integration was runtime-tested for this research**; neither establishes certified interoperability, bundle size or comparative latency. Priorities and effort are product judgments requiring consumer validation.

The [candidate cards](../../research/2026-10-20/integrations/catalogue.md) cover every investigated provider, including alternatives outside the shortlist. The [structured catalogue][catalogue] and [source ledger][sources] retain package, runtime, licensing and evidence details. Original Aureform code remains Apache-2.0; third-party code retains its own licenses. An SDK license grants no entitlement to hosted service, enterprise features or unrestricted embedding.

## Existing contracts and deployment boundary

The shipped [adapters](../../application-integrations.md) include `AuthAdapter.signInWithProvider` and `createStripeCommerceAdapter`. Social authentication is mock until a consumer supplies its handler; Stripe's adapter transports requests to the consumer's backend. [Google Maps](./maps.md) is opt-in alongside MapLibre. [DataTable](./data-table.md) exposes controlled query state and manual pagination.

`AIWorkspace` uses deterministic `streamDemoReply`, with stop, cancellation, retry and text attachments. Settings offers six local mock integration cards. These are reusable interface foundations; they do not provide production authentication, model inference, account connections or synchronization. [Baseline AI workspace](https://github.com/terrizoaguimor/aureform-ui/blob/a93ab113170ec1456608cf1f85d1a89b23aaec68/src/components/templates/ai-workspace.tsx); [settings implementation](https://github.com/terrizoaguimor/aureform-ui/blob/a93ab113170ec1456608cf1f85d1a89b23aaec68/src/components/templates/settings.tsx).

The public demo uses `output: "export"` on **Cloudflare Workers Static Assets and GitHub Pages**, with no public provider backend. Next.js static exports cannot run request-dependent handlers, Server Actions or server sessions. Browser UI can call an independently deployed consumer backend; secrets, token exchange, webhooks and durable work belong there. SDK runtime suitability must be checked separately for Node and Workers. [Next.js static-export guide](https://nextjs.org/docs/app/guides/static-exports).

## Recommended integration families

**P0** supplies foundational application recipes, **P1** completes common workflows, and **P2** follows demonstrated product demand. Small, medium and large effort describe relative implementation scope, not measured delivery time.

### 1. P0: TanStack Query, Supabase and Neon/Drizzle data

Use TanStack Query for browser caching, refetching and mutation state; pair it with Supabase for hosted Postgres and authorized data access. Query's 40,112,338 recorded downloads support recipe discoverability, without measuring database preference. SWR is a lighter fetching alternative; Neon with Drizzle suits consumers owning a SQL backend. [Download evidence][downloads]; [Query overview](https://tanstack.com/query/latest/docs/framework/react/overview).

Aureform's gap is a documented transport-to-table mapping. **Medium effort** could reuse filters, pagination, loading and error states while preserving workspace isolation. Supabase browser access requires row-level security; privileged keys and Neon/Drizzle queries stay server-side. Query, Supabase and Neon's SDKs are MIT; Drizzle is Apache-2.0. Hosting and database operations have separate commercial costs. [Supabase authorization](https://supabase.com/docs/guides/database/postgres/row-level-security); [candidate cards](../../research/2026-10-20/integrations/catalogue.md).

### 2. P0: Better Auth, Clerk and Supabase Auth

Choose **one authentication system**: Better Auth for a consumer-owned backend, Clerk for managed identity, or Supabase Auth for a BaaS application. Better Auth's 7,801,856 downloads show installation activity, not superiority or a mandate to combine providers. Their SDKs are MIT; self-operated infrastructure and hosted identity contracts remain separate. [Download evidence][downloads]; [Better Auth integration](https://better-auth.com/docs/integrations/next); [Clerk SDK](https://clerk.com/docs/reference/nextjs/overview).

The existing [authentication screens](./authentication.md) need real sessions, recovery, verification and account-linking behavior. **Medium-to-large effort** should reuse forms, social buttons and expired-session notices. Browser SDKs initiate interaction; the consumer backend validates sessions and authorization. Server-oriented Next.js quickstarts require a server deployment and cannot be copied unchanged into the static demo.

### 3. P0: Stripe, Paddle and Polar payments

Stripe is the closest starting point because its transport adapter already exists. The `stripe` package recorded 14,526,076 downloads; its server scope makes this a limited installation signal. Keep the current same-origin adapter, and implement secret handling, authoritative prices, idempotency and verified webhooks behind it. A hosted checkout redirect does not prove payment. [Download evidence][downloads]; [commerce contract](./commerce.md).

**Medium-to-large effort** reuses billing, orders, invoices and processing/error states. Paddle and Polar offer merchant-of-record alternatives for eligible products, with different seller, tax and fulfillment contracts. Stripe and Polar SDKs are MIT; Paddle's Node SDK is Apache-2.0. Payment-service terms and fees remain independent. [Paddle overview](https://developer.paddle.com/); [Polar merchant-of-record model](https://polar.sh/docs/merchant-of-record/introduction).

### 4. P0: AI SDK 7, OpenAI Responses, Anthropic and Gemini

Offer optional AI SDK recipes that preserve Aureform's chat composition while connecting OpenAI Responses, Anthropic Messages or Gemini. The `ai` package recorded 18,352,661 downloads; native SDK counts reflect different scopes and cannot identify a preferred model provider. Native SDKs remain alternatives where provider-specific features matter. [Download evidence][downloads].

Stable metadata records **`ai` 7.0.146 and `@ai-sdk/react` 4.0.150**, both requiring Node >=22. The React adapter's peers admit React 19.3.1; this was not runtime-tested. Both packages are Apache-2.0, while model access, usage and data handling follow provider contracts. Browser hooks consume a consumer backend stream; provider credentials stay server-side. [Core metadata](https://registry.npmjs.org/ai/7.0.146); [React metadata](https://registry.npmjs.org/@ai-sdk%2freact/4.0.150).

**Medium-to-large effort** requires a mapper between structured protocol parts and Aureform's current string messages: text, typed tool states and approvals, `source-url`/`source-document`, files, errors and cancellation. A generic `tool-call` or `source` shape is insufficient. Render reasoning only as provider-published summaries, never private chain of thought. Reuse the composer, retry controls, attachment list and status presentation. [Stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol).

The [October shadcn changelog](https://ui.shadcn.com/docs/changelog/2026-10-ai-elements) introduces **21 AI Elements patterns**, with Base UI support; use the [current patterns](https://ui.shadcn.com/docs/ai-elements) as references. The old [AI SDK Elements site](https://elements.ai-sdk.dev/) announces deprecation at November 2026's end. OpenAI Assistants closed August 26, 2026; new recipes use Responses. Gemini's current native package is `@google/genai`; `@google/generative-ai` is legacy. [Responses migration](https://developers.openai.com/api/docs/guides/migrate-to-responses); [Google SDK migration](https://ai.google.dev/gemini-api/docs/migrate).

### 5. P1: S3/R2 uploads, Supabase Storage and Cloudinary

Connect existing product-image editing to durable storage. S3/R2 signed uploads offer portable object storage; Supabase Storage fits a Supabase application; Cloudinary adds image transformations. S3's 29,254,399 SDK downloads cover broad infrastructure use, while Supabase Storage counts include transitive installs. Neither measures Aureform demand. [Download evidence][downloads].

**Medium effort** reuses the picker, cropper, ordering, progress and per-file recovery. The backend authorizes uploads and issues scoped, expiring URLs; browsers upload without storage secrets. AWS SDK code is Apache-2.0, Supabase and Cloudinary SDKs are MIT; storage, delivery and transformation services have separate terms. Aureform currently saves bounded local demo images. [R2 signed URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

### 6. P1: Resend, React Email and Postmark

Use Resend with React Email for invitations, recovery and transactional messages; Postmark is an alternative delivery provider, not a competing template renderer. Resend's 8,132,768 downloads indicate SDK installation activity without establishing deliverability. These SDK/template packages are MIT, with separate sending-service contracts. [Download evidence][downloads]; [Resend Next.js recipe](https://resend.com/docs/send-with-nextjs).

Aureform previews relevant workflows but sends no production mail. **Medium effort** should reuse invitation forms, previews and delivery/error status. Rendering can support local previews, but sending credentials, authorized recipients, queues and delivery webhooks belong to the consumer backend. A successful API submission must remain distinct from confirmed delivery.

### 7. P1: PostHog analytics and Sentry diagnostics

PostHog answers product-usage questions; Sentry diagnoses errors and performance. Their roles can coexist. PostHog's 10,131,121 browser-package downloads do not establish tracking quality or justify automatic collection. Alternatives include Vercel Web Analytics and OpenTelemetry-based diagnostics, subject to the deployment target. PostHog JS declares Apache-2.0 AND MIT; Sentry's Next.js SDK is MIT. Hosted retention and server licensing remain separate. [Download evidence][downloads]; [source ledger][sources]; [Vercel Analytics](https://vercel.com/docs/analytics).

**Small-to-medium effort** adds optional event/error mappings and reuses consent, notification and diagnostics UI. Aureform lacks these production mappings. Browser instrumentation needs deliberate activation and data filtering; backend instrumentation needs its own runtime setup. This recommendation activates no tracking. [PostHog integration](https://posthog.com/docs/libraries/next-js).

### 8. P1: Slack, GitHub Apps, Drive Picker and Notion

Prioritize concrete tasks: Slack notifications, GitHub repository activity, selected Drive documents and Notion content. Slack's 7,347,713 SDK downloads are an installation proxy; broad Google client downloads cannot isolate Drive demand. Direct APIs and a broker are alternative implementation paths. Slack, Octokit and Notion SDKs are MIT; Google's client is Apache-2.0, independently of platform policies. [Download evidence][downloads]; [candidate cards](../../research/2026-10-20/integrations/catalogue.md).

**Large effort** replaces local settings cards with consent, connection health, scopes, reauthorization and sync history. Prefer [GitHub Apps' scoped installations](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps); combine Drive Picker with narrow `drive.file` access. Browser Picker interaction differs from server token exchange, encrypted storage, webhooks and synchronization. Social sign-in alone grants none of these connectors. [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth); [Notion authorization](https://developers.notion.com/guides/get-started/authorization).

### 9. P1: pgvector retrieval and Langfuse evaluation

Use Postgres/pgvector for retrieval-augmented generation and Langfuse for traces, evaluation and prompt versions. These solve different problems; Pinecone/Qdrant and LangSmith are alternatives within their respective roles. The older `langfuse` package's 957,202 downloads do not measure adoption of current modular packages or retrieval quality. [Download evidence][downloads]; [Supabase vectors](https://supabase.com/docs/guides/ai).

Aureform lacks ingestion, permission-aware retrieval and evaluation. **Large effort** can compose source lists, citations, ingestion progress and evaluation tables from existing cards, tooltips, progress and DataTable. Embedding, retrieval and telemetry export belong to the backend; browsers receive authorized results. For AI SDK 7, use `registerTelemetry` with `@langfuse/vercel-ai-sdk`, rather than v6's `experimental_telemetry` recipe. pgvector uses the PostgreSQL license; Langfuse SDKs are MIT, with separate enterprise/cloud boundaries. [Current Langfuse integration](https://langfuse.com/integrations/frameworks/vercel-ai-sdk); [pgvector license](https://github.com/pgvector/pgvector/blob/master/LICENSE).

### 10. P2: Supabase Realtime, Liveblocks, Inngest and Trigger.dev

Supabase Realtime handles live database events and presence; Liveblocks supports collaboration. Inngest and Trigger.dev execute durable background work. Choose by task rather than treating these as substitutes. Inngest's 1,366,095 downloads do not quantify collaboration demand. [Download evidence][downloads]; [Supabase Realtime](https://supabase.com/docs/guides/realtime); [Liveblocks collaboration](https://liveblocks.io/docs); [Inngest capabilities](https://www.inngest.com/docs); [Trigger.dev capabilities](https://trigger.dev/docs/introduction).

Aureform has local asynchronous states but no durable jobs or shared presence. **Large effort** could reuse activity feeds, presence indicators, job progress and resumable status. Browsers subscribe with scoped authorization; servers issue credentials and run jobs. Supabase/Trigger SDKs are MIT; Liveblocks/Inngest SDKs are Apache-2.0. Hosted quotas and self-hosted server licenses need separate review.

### 11. P2: Tiptap editing, Algolia, Meilisearch and Typesense

Tiptap provides rich document editing; Algolia supplies hosted search, with Meilisearch or Typesense as alternatives. Editor and search are distinct capabilities. Tiptap React's 11,348,991 downloads support discoverability without proving demand for paid extensions. [Download evidence][downloads]; [Tiptap Next.js guidance](https://tiptap.dev/docs/editor/getting-started/install/nextjs).

Aureform lacks document schema, persistence and indexed search. **Medium-to-large effort** reuses toolbars, command search, filters and empty states. Editors and scoped search queries run in browsers; sanitization, indexing and administration belong server-side. Tiptap core, Algolia and Meilisearch clients are MIT; Typesense's client is Apache-2.0. Premium extensions, hosted services and search-engine server licenses are separate boundaries.

### 12. P2: Microsoft 365/calendar, Linear, Jira, HubSpot and WorkOS

Enterprise recipes should follow an identified customer workflow: Microsoft 365 or Google Calendar synchronization, Linear or Jira issue tracking, HubSpot CRM context, and WorkOS enterprise identity. These complement a product in different ways; Auth0 is an enterprise identity alternative. Microsoft Graph's 1,243,474 downloads span many Microsoft services and cannot isolate calendar popularity; not every REST integration has a comparable SDK proxy. [Download evidence][downloads]; [candidate cards](../../research/2026-10-20/integrations/catalogue.md).

**Large effort** extends the settings-card model with consent, administrator restrictions, resource selection, sync status and audit history. Browser UI delegates token exchange, delta processing and durable synchronization to the backend. Graph and WorkOS clients are MIT; enterprise features and provider API access follow separate contracts. Consumer login does not supply these missing capabilities. [Graph delta queries](https://learn.microsoft.com/en-us/graph/delta-query-overview); [WorkOS AuthKit](https://workos.com/docs/authkit/nextjs).

### 13. P2: MCP, Cloudflare Agents, LangGraph and automation brokers

MCP exposes tools/resources; Cloudflare Agents and LangGraph organize agent execution. Nango, Pipedream Connect and Composio broker connections/actions; webhooks, n8n, Make and Zapier are optional automation paths. MCP SDK's 39,432,481 downloads include tooling contexts and do not establish SaaS connector adoption. [Download evidence][downloads]; [Pipedream Connect](https://pipedream.com/docs/connect).

Aureform lacks agent execution, token brokerage and workflow persistence. **Large effort** can reuse dialogs, status cards and activity tables for tool approval, run history, connection health and retries while execution stays on the consumer backend. The **2026-07-28 MCP specification includes HTTP transport authorization**; it does not provide application sessions or a synchronization engine. MCP, Cloudflare Agents and LangGraph SDKs are MIT; hosted brokerage has separate terms. [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization).

### Nango, Pipedream Connect and Composio

Compare managed connection and action recipes by OAuth handling, scopes, reauthorization, synchronization and tool-execution needs. Their SDK and platform terms differ; use the candidate cards to select one for a concrete workflow.

### Zapier, Make and n8n

Licensing changes the architecture: Nango's repository uses **ELv2**, not a blanket permissive license. n8n's current FAQ permits predefined, invisible backend workflows, including end-user accounts, when the organization controls workflow logic. Letting end users build or configure workflows requires a commercial agreement, even through a custom UI, API, MCP or agent. SDK licensing never substitutes for these platform terms. [Nango license](https://github.com/NangoHQ/nango/blob/master/LICENSE); [n8n licensing FAQ](https://docs.n8n.io/n8n-community-license/community-license/license-faq.md).

## Delivery sequence and remaining validation

Begin with one authorized data workflow, one authentication choice and the existing Stripe transport; keep AI recipes optional. Add uploads, mail and connection states around a concrete consumer journey. Advance P2 when an actual workflow warrants its larger operational burden.

Before announcing an integration, exercise session expiry, denied permissions, workspace changes, cancellation, rate limits and duplicate webhooks in a consumer environment. Record SDK/runtime versions and distinguish local contract checks from provider sandbox results. Bundle cost, latency, user demand and maintenance effort remain unmeasured. The [roadmap](./roadmap.md) should change only when those recommendations become delivered, evidenced work.

[downloads]: https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/research/2026-10-20/integrations/npm-downloads.json
[provenance]: https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/research/2026-10-20/integrations/agy-provenance.json
[sources]: https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/research/2026-10-20/integrations/sources.json
[catalogue]: https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/research/2026-10-20/integrations/catalogue.json
