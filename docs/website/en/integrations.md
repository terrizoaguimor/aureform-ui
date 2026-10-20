# Ready-to-connect integrations

Aureform provides **65 frontend recipes across 17 workflow families**. Open the [integration hub](/en/integrations/) or an individual recipe, such as [Supabase data](/en/integrations/supabase-data/), [Stripe](/en/integrations/stripe/) or [OpenAI Responses](/en/integrations/openai-responses/).

Every recipe includes account configuration, a provider choice, logical permissions, resource selection, connection state, synchronization, activity and a domain workbench. The public demo uses working local mocks. It never requests external account access, sends email, tracks analytics, charges a payment or runs a real model.

## What is included

| Family | Frontend workflow |
| --- | --- |
| Data and APIs | Controlled remote tables, filtering, sorting, pagination, record editing and recoverable requests |
| Identity | Email access, verification, account recovery, social buttons, sessions, MFA, organizations, members and invitations |
| Commerce | Product and image editing, orders, invoices, checkout, plans and customer portal |
| Files and media | File selection, metadata, preview, upload, progress and retry |
| Email | Template selection, content editing, preview, delivery review and status |
| Analytics and diagnostics | Metrics, events, consent controls, feature flags, traces and evaluation reports |
| Notifications | Inbox records, preferences and notification composition |
| Background work | Runs, steps, progress, logs, cancellation and retry |
| Collaboration | Scoped messages, presence and an injectable live subscription |
| Content | Documents, editing, preview, revision checks and persistence callbacks |
| Search | Query controls, ranked results and source links |
| Maps | Locations, geocoding, routes and the existing MapLibre/Google Maps interface |
| AI | Approved models, structured streaming, sources, attachments, usage, cancellation, retry and tool approval |
| Knowledge | Source ingestion, retrieval, citations and evaluation |
| Agents and tools | Runs, tool requests, explicit approval/rejection and checkpoints |
| Product connectors | Authorized resources, field mapping, records, issues and tickets |
| Automation | Workflow selection, inputs, field mapping and run monitoring |

SDKs are optional consumer dependencies. Selecting a provider does not install an SDK or provision an account. The kit owns the presentation and transport contracts; your application supplies connectivity and its backend's authorization.

## Connect the full hub

Construct adapters in a Client Component. They contain functions and cannot be passed as serialized server props.

```tsx
"use client";

import { useMemo } from "react";
import { Providers } from "@/components/providers";
import { IntegrationHub } from "@/components/integrations/integration-hub";
import { createHttpIntegrationSuite } from "@/lib/integrations/http-suite";
import { publicPath } from "@/lib/public-path";

type ConnectedWorkspaceProps = {
  applicationOrigin: string;
  approvedModelId: string;
  checkoutOrigin: string;
  getCsrfToken: () => Promise<string>;
};

export function ConnectedWorkspace({
  applicationOrigin,
  approvedModelId,
  checkoutOrigin,
  getCsrfToken,
}: ConnectedWorkspaceProps) {
  const suite = useMemo(
    () => createHttpIntegrationSuite({
      connections: {
        baseUrl: publicPath("/api/integrations"),
        getCsrfToken,
      },
      identity: {
        "better-auth": {
          basePath: publicPath("/api/identity/better-auth"),
          redirectPolicy: { origin: applicationOrigin },
          csrfToken: getCsrfToken,
        },
      },
      ai: {
        "openai-responses": {
          endpoint: publicPath("/api/ai/stream"),
          approvalEndpoint: publicPath("/api/ai/approvals"),
          models: [{
            id: approvedModelId,
            provider: "openai-responses",
            label: "Approved application model",
          }],
          fetch: async (url, init) => {
            const headers = new Headers(init?.headers);
            headers.set("X-CSRF-Token", await getCsrfToken());
            return fetch(url, { ...init, headers });
          },
        },
      },
      commerce: {
        polar: {
          baseUrl: publicPath("/api/commerce"),
          trustedRedirectOrigins: [checkoutOrigin],
          getCsrfToken,
        },
      },
    }),
    [applicationOrigin, approvedModelId, checkoutOrigin, getCsrfToken],
  );
  return (
    <Providers locale="en">
      <IntegrationHub suite={suite} />
    </Providers>
  );
}
```

Keys in `identity`, `ai` and `commerce` match the recipe's provider-option ID. A candidate ID can also be used as a fallback. Add only the providers your application supports. If a consumer connection lacks its specialized adapter, the hub shows the setup instructions instead of running a local mock.

`AppPage` also accepts `integrationSuite`, `integrationsAdapter`, `aiAdapter`, `authWorkflowAdapter` and the existing `commerceAdapter` and social-auth callbacks. You can embed individual workbenches without using the complete demo shell.

## Common HTTP contract

`createHttpIntegrationsAdapter` sends the workspace reference on every request. That reference is not proof of authorization: the backend checks the signed-in identity, membership, connection, resource and action.

| Method | Path under your configured base | Response |
| --- | --- | --- |
| GET | `/connections` | Connection array |
| GET | `/connections/:integrationId` | Connection |
| POST | `/connect` | Connected or authorization result |
| POST | `/connections/:connectionId/configure` | Connection with revision |
| POST | `/connections/:connectionId/disconnect` | Disconnected connection |
| GET | `/resources/:integrationId?query=…` | Authorized resources |
| POST | `/connections/:connectionId/sync` | Updated connection |
| GET | `/connections/:connectionId/events` | Activity array |
| POST | `/execute` | Discriminated domain result |
| POST | `/upload` | Uploaded asset; multipart contains the original `File` |

The complete DTOs are in [`contracts.ts`](https://github.com/terrizoaguimor/aureform-ui/blob/main/src/lib/integrations/contracts.ts). Actions are declared in [`definitions.ts`](https://github.com/terrizoaguimor/aureform-ui/blob/main/src/lib/integrations/definitions.ts). Results include records, documents, search hits, assets, deliveries, metrics, jobs, locations, knowledge and tool runs.

The transport validates bounded responses and rejects mismatched workspaces, connection IDs, options, revisions and presentation URLs. It supports cancellation, idempotency keys, revision conflicts, rate-limit feedback and explicitly trusted HTTPS backend origins. Supply exact authorization origins when your backend returns an external OAuth destination.

For realtime, provide the optional `subscribe` callback. It receives the connection and workspace, publishes typed results/presence/connection updates, and returns cleanup. Your SDK or authenticated SSE transport owns reconnection and account access.

## Specialized transports

Identity uses `AuthWorkflowAdapter`, through `createAuthHttpAdapter` or provider callback factories for Better Auth, Clerk, Supabase Auth, Auth.js, WorkOS and Auth0. [Identity contract and examples](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/identity.md).

AI uses `AiWorkspaceAdapter`. HTTP expects Aureform's bounded **NDJSON v1** protocol; native-provider SSE must be normalized by the consumer. Tool acceptance is separate from execution, which is acknowledged by subsequent stream events. [AI protocol and callback examples](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/ai.md).

Commerce uses the existing `CommerceAdapter`, plus provider factories for Stripe, Paddle, Polar and Lemon Squeezy. Your backend maps its application catalogue to provider products/prices, reconciles subscriptions and verifies webhooks. [Commerce transport and provider limits](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/commerce.md).

Editors and collaboration can use the product workbench's extension points; the consumer supplies its editor or subscription connectivity. [Product workflow recipes](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/product-workflows.md). [Operational workflow recipes](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/operations.md).

Use `suite.ui` or `AppPage.integrationUi` for optional native editor bindings, query-aware data subscriptions, collaboration transport, connected command search, map rendering, Google Drive Picker, public image collections and enterprise actions. [Browser binding composition](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/browser-bindings.md), [editor SDK recipes](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/editors.md) and [optional native Mapbox](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/mapbox-binding.md) contain the complete handoffs. The public demo loads no external SDK for these previews.

## Install selected source

```bash
npx shadcn@latest add https://aureformui.com/r/integration-hub.json
npx shadcn@latest add https://aureformui.com/r/integrations-suite.json
```

Other entries include `integrations-http`, `integrations-demo`, `identity-integration-panel`, `operational-integration-workbench`, `product-integration-workbench`, `auth-integration`, `ai-integration` and `commerce-providers`. Local imports, required dependencies and portable assets are included in each source closure.

Install `connected-map`, `drive-picker-panel`, `media-collection-panel`, `enterprise-diagnostics`, `product-editor-controls` or `search-bridge-command` separately when embedding those controls. The `drive-picker` and `media-collection` entries provide their transport helpers.

The [provider coverage manifest](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/provider-coverage.json) maps every researched candidate and provider choice to its frontend recipe. The [dated integration research](/en/docs/integration-research/) remains evidence about provider selection, licenses and service limits, rather than a certification of native SDK compatibility.
