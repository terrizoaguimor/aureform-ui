# Product, data and knowledge workbenches

`ProductIntegrationWorkbench` supplies editable workflows for `data`, `content`,
`search`, `collaboration`, `maps`, `knowledge`, `agents`, and `connectors`.
Identity, commerce, AI, and operational workflows use their separate workbenches.
The interface supports English and Spanish through `useLanguage` and uses the
shared Aureform controls and appearance tokens.

The workbenches use the supplied `IntegrationsAdapter`, connection, definition,
and workspace scope. They do not import provider SDKs, discover credentials, or
construct provider API requests. Demo results and consumer results remain
identified by `adapter.mode`. A consumer backend still owns authorization,
provider quotas, OAuth, durable execution, and actual external effects.

## Client entry point

```tsx
"use client";

import { ProductIntegrationWorkbench } from "@/components/integrations/product-workbench";
import type { IntegrationWorkbenchProps } from "@/lib/integrations/contracts";

export function ConnectedProductWorkspace(props: IntegrationWorkbenchProps) {
  return <ProductIntegrationWorkbench {...props} />;
}
```

Mount under the application's existing language and appearance providers. Create
the adapter in a Client Component: methods and editor/subscription callbacks
cannot cross the React Server Component serialization boundary. No new Next.js
API route or Server Action is required by this UI; it can be used in the existing
static export.

## Domain workflows

| Family        | Workflow                                                                                                                                                                  | Adapter actions/results                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Data          | Remote search, status filters, sort, manual pagination, stable row selection, record editor, optimistic update, rollback and conflict rebase                              | `query`, `save-record` or `update-record`; `records`, `record`                                                                     |
| Content       | Open or create a document, Markdown toolbar, text/JSON editing, safe preview, review, versioned save and comparison with a newer revision                                 | `query`, `save-document`; `records`, `document`                                                                                    |
| Search        | Query and source filter, ranked snippets, relevance scores, public source links, remote result pages and reviewed document indexing                                       | `search`, `ingest`, optional index `query`; search, knowledge and indexing outcomes                                                |
| Collaboration | Conversation, reported presence, connection freshness, manual refresh/polling or injected live transport, shared document updates and checkpoints                         | `query`, `publish-message`, `save-document`, optional `checkpoint`; records/documents and subscription updates                     |
| Maps          | Authorized location loading, address resolution, selectable coordinates and route requests between returned locations                                                     | Optional `query`, `geocode`, `route`; `map`                                                                                        |
| Knowledge     | Upload, source content/reference, reviewed ingestion, source/access state, job steps/progress/logs, citation search and evaluation feedback                               | `upload`, `ingest`, `query`, `search`, `evaluate`, optional `cancel-job`; uploads, jobs, records, knowledge and search results     |
| Agents        | Tool discovery, declarative argument fields or structured JSON input, agent task review, returned approval request, approve/reject, checkpoints and execution history     | `query`, `run-agent`, `execute-tool`, `approve-tool`, optional `checkpoint`; records, tools, jobs and receipts                     |
| Connectors    | Authorized resource subset, selectable source operation, remote preview, field mapping, mapped sample, reviewed ticket/message/status writes, document and tool workflows | `query`, `map-fields`, `create-ticket`, `publish-message`, `save-record`, `update-record`, `ingest`, `save-document`, tool actions |

An operation is located by `definition.actions[].kind`; its actual ID is passed
to the common `useIntegrationOperation` hook. Additional declarative fields are
rendered from the selected action. A missing operation has a visible unsupported
state. Record edits, document changes, ingestion, feedback, tool execution,
approval decisions, mappings and destination writes have an explicit review step.
Connector recipes with document or tool actions reuse the complete document or
agent workflow, including the optional rich editor. A calendar create recipe does
not require a target record ID; updates do. Creating a ticket never forwards the
source record ID as the destination record ID.

## Backend value conventions

All operation values follow `IntegrationValues`: primitives or lists of strings.
Structured inputs are serialized strings, not arbitrary objects.

- Remote queries include `query`, `filter`, `page`/`pageIndex` (zero-based),
  `pageNumber` (one-based), `pageSize`/`limit`, `offset`, `sort`, `order`/`direction`, serialized `filters`
  and `sorting`, and the full serialized `queryState`. The backend owns the
  filtering, sorting, total count and page boundaries. The `DataTable` uses
  external mode and never re-paginates a returned page.
- Resource selections use IDs returned by resource discovery and present in
  `connection.resourceIds`. Connector requests additionally include the selected
  `resourceIds`, `sourceId`, and `destinationId`. These are client selections,
  not authorization grants.
  Required read references and date windows have demo-only fixture defaults;
  consumer execution/thread references and calendar windows remain editable inputs.
- Record writes include `recordId`/`id`, `expectedUpdatedAt`, editable
  `name`, `status`, `description`, and serialized `fields`. An observed record
  revision is forwarded when available. The backend must enforce its own
  optimistic concurrency check and return the stored `record`.
- Document writes include `documentId`/`id`, `title`, `content`, `format`,
  `revision` and `expectedRevision`. The backend should return the acknowledged
  `document`, with its actual revision. A receipt alone does not prove which
  document revision was stored.
- Knowledge requests include the actual uploaded `assetId`, `sourceRef`,
  source URL or selected source reference, name and any supplied content.
  Uploading does not imply ingestion. The backend must validate URL sources,
  authorize files, extract content, and enforce its own file limits.
- Tool requests include discovered `toolId`, `toolName`, and serialized
  `arguments`/`input`. The structured input editor supports nested JSON. Only
  declarative primitive schema fields become automatic controls; complex schemas
  can use the structured editor. Tool inputs never execute code in the browser.
  If discovery does not expose a tool catalog, users can enter a backend-exposed
  tool name; the backend must enforce its authorized catalog before execution.
- Approval uses the `approvalId` supplied by the backend and its run ID, together
  with `approved` and `decision`. No approval ID is invented. The backend must
  bind a decision to its pending action, connection and workspace.
- Connector mappings are serialized under `mapping`/`fieldMapping`; each entry
  names a source field and a unique destination field. The destination request
  includes the reviewed mapped values and the selected source record ID.

The definition's declared fields remain the recipe contract; a consumer can map
these value conventions to provider-specific request shapes inside its adapter.
Do not interpret the extra metadata as authority or skip server validation.

## Optional editor slot

The public export includes `ProductEditorRenderer` and
`ProductDocumentEditorProps`. `renderEditor` receives a document value, an
`onChange({ title, content, format })` callback, locale and disabled state.
The surrounding UI retains preview, save review, version checks and conflicts.

```tsx
<ProductIntegrationWorkbench
  {...props}
  renderEditor={({ value, onChange, disabled }) => (
    <textarea
      aria-label="Document content"
      disabled={disabled}
      value={value.content}
      onChange={(event) =>
        onChange({
          title: value.title,
          content: event.target.value,
          format: value.format,
        })
      }
    />
  )}
/>
```

A consumer can replace this small renderer with its installed rich editor without
rewriting the document workflow. The default renderer already supplies Markdown,
plain text and structured JSON editing.

## Optional live transport

Collaboration uses `adapter.subscribe(connectionId, listener, scope)` when
available. It accepts the shared `IntegrationUpdate` result, presence and
connection messages. The consumer supplies the SDK/SSE transport and its
authentication; Aureform does not initiate a provider login or load an SDK.

For a room-specific transport, the optional `subscribe` workbench prop receives
`integrationId`, `connectionId`, `workspaceId`, selected `resourceId`,
`resumeCursor`, `signal`, `onUpdate`, and `onError`. It returns a cleanup function,
or a promise resolving to that cleanup. Public subscription types are exported
from `product-workbench.tsx`. Adapter-level subscriptions are connection-scoped;
the consumer must associate messages with the authorized resources it exposes.

Updates after abort/unmount are ignored. A cleanup that resolves after unmount is
still called. Reconnection forwards the last received cursor. Without a live
transport, the user can refresh manually or enable polling every 15 seconds;
polling pauses while the browser tab is hidden. Freshness reflects actual received
updates. No participants or live activity are invented by the workbench.

## Conflicts, cancellation and scope changes

The common operation hook supplies localized errors, pending state, cancellation
and late-result protection. Stopping an outstanding request stops waiting; it
does not claim that a remote job or side effect was cancelled. Knowledge exposes
a reviewed remote cancellation only when the definition provides `cancel-job`.

Data rollback targets the optimistic marker of that specific mutation. It cannot
overwrite a newer fetched or acknowledged record. Document conflicts preserve
the local draft and offer a comparison, replacement or explicit rebase to a
newer revision. The UI does not silently overwrite a remote document.

Changing workspace, connection, provider option, connection revision, authorized
resources or permissions remounts the scoped workflow and clears its old review.
A changed connection scope received through a live transport blocks further
collaboration actions until the connection is refreshed by the host. Expired,
disconnected and permission-denied connections have actionable unavailable
states.

## Maps and presentation boundaries

The existing `RouteMap` has local, fixed shipment fixtures and is shown by default
in demo mode, including when Google Maps or Mapbox is selected. The user can hide
the example. No connection key, external style or provider SDK is passed to it;
demo configuration values such as `DEMO_PUBLIC_KEY` or an example URL cannot
activate a provider request. Address and route results are explicitly identified
as demo fixtures.

Consumer locations and route geometry use a separate selectable coordinate plot,
based only on the `map` result. This does not infer travel times, road validity,
provider attribution, geocoding success or access to a server Maps key. Invalid
coordinates and duplicate/missing IDs are omitted with a visible notice.

Markdown does not enable raw HTML. Links accept public HTTP(S) or local paths;
credential-bearing and executable URL schemes are omitted. Markdown images
appear as an image description rather than initiating an external asset request.
JSON previews show a structured field view rather than substituting a raw dump
for a domain workflow.

## Focused checks

`node --experimental-strip-types --test tests/product-integrations.test.mjs`
checks query serialization, field validation, stable IDs, optimistic rollback,
scope invalidation, mappings, declarative tool inputs, presentation URLs,
geographic validation, and asynchronous subscription cleanup.

These checks use local fixtures. They do not exercise real accounts, provider
SDKs, OAuth, network delivery, or production backend authorization.
