# Operational integration workbenches

`OperationalIntegrationWorkbench` provides client interfaces for the `files`, `email`, `observability`, `notifications`, `jobs` and `automation` families. It reads each recipe’s action and field descriptors and presents typed responses from the injected adapter. Provider packages are references in the catalogue, not dependencies of these workbenches.

```tsx
"use client";

import { OperationalIntegrationWorkbench } from "@/components/integrations/operational-workbench";
import type { IntegrationWorkbenchProps } from "@/lib/integrations/contracts";

export function OperationsPanel(props: IntegrationWorkbenchProps) {
  return <OperationalIntegrationWorkbench {...props} />;
}
```

Pass `definition`, `connection`, `adapter` and `scope` from the client tree. Adapter methods are functions and cannot cross a Server Component’s serializable prop boundary. This component works with static exports; it does not create server actions, route handlers, provider SDK instances or direct network requests.

## Adapter boundary

- Actions are discovered by `action.kind`, then executed using the actual action object and its provider-specific ID.
- Action controls respect declared `requiredPermissions` and explain missing grants; backend authorization remains authoritative.
- Only declared, non-sensitive action fields cross the `execute` boundary. Local previews and template selections are not added as undeclared parameters.
- `useIntegrationOperation` supplies workspace scope, an abort signal, connection checks, localized errors and protection against late outcomes. Separate read and mutation channels preserve a mutation receipt while the library refreshes.
- Changing workspace, integration, provider option, connection revision or adapter mode remounts the workbench and clears its drafts. Replacing the adapter cancels outstanding requests and clears received data.
- The adapter and consumer backend remain responsible for resource authorization, tenant isolation, content validation, provider permissions, delivery reconciliation and deduplication. A UI review does not grant backend permission.
- Demo mode is labeled throughout. Its upload, tracking, delivery and job responses are local fixtures, not proof that a provider accepted a real operation.

## Workflows

| Family        | Workbench behavior                                                                                                                               | Required action kinds                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Files         | Native file picker, local raster preview, alternative text, size validation, cancellable upload, retry and confirmed assets.                     | `query` for the library; the adapter’s `upload` method for files.                              |
| Email         | Recipient and content editor, local draft examples, `{{variable}}` interpolation, plain-text preview, immutable review and typed delivery queue. | `query`, `send-email`.                                                                         |
| Observability | Returned metric cards/chart, event filters/details, flag editor and optional manual event submission gated by session consent.                   | `query`; optional `set-flag`, `track-event`.                                                   |
| Notifications | Inbox filters/details, reported read state, reviewed backend creation and preference updates.                                                    | `query`; optional `create-notification`, `update-preferences`, `update-record` for read state. |
| Jobs          | Queue filtering, run review, backend-reported progress/steps/logs, status refresh, backend cancellation and reviewed retry inputs.               | `query`, `trigger-job`; optional `cancel-job`.                                                 |
| Automation    | Mapping drafts, typed conversions, reviewed triggers/retries, reported owner/accounts/template, returned jobs and response history.              | `query`; optional `map-fields`, `trigger-workflow`.                                            |

Missing operations are shown as unavailable for that connection recipe; this makes no claim about the provider’s full product capabilities. Query fields can be edited in “Load records with filters.” Selected resource references are initialized only from the connection’s authorized `resourceIds`. Required fields without such a value must be supplied before loading.

When a recipe exposes several `query` actions, a permitted query with complete default inputs is selected first; the read-operation selector exposes the others. Refresh and retry reuse the last valid submitted filters for that query.

### Files

The local workbench limit is 20 MB; a backend can impose a lower limit. Empty files are rejected. PNG, JPEG, WebP, GIF and AVIF receive object-URL previews and require alternative text; other formats receive a file preview with metadata. Object URLs are revoked when replaced or unmounted.

The upload contract exposes no byte progress callback. The pending indicator is deliberately indeterminate, and confirmation appears only after an `upload` result. The original `File` and alternative text go to the adapter. Upload retries retain the chosen file after an error and require an explicit action. Cancelling a request cannot guarantee that a remote upload was rolled back; reconcile before retrying a side effect.

Returned preview links are limited to public HTTPS or relative URLs. Credential-bearing and signed links are not rendered; expose an authorized preview proxy from the consumer backend if needed.

### Email and notifications

Draft examples are local text, not registered provider template IDs. Provider template fields remain editable as described by the recipe. Variables interpolate as plain text, without evaluating expressions or rendering arbitrary HTML. Missing variables prevent email submission. If the action declares a variables text field, the interpolated variables are serialized into that field.

Email sending and notification creation always require a frozen review with an explicit acknowledgment. A typed `delivery` response retains its exact `queued`, `sent`, `failed`, `rejected` or `bounced` status, with localized EN/ES badges. `queued` is never upgraded to `sent` locally. Optional `reasonCode` and `occurredAt` are displayed only when reported; the latter is the provider event time, not when the browser received the response. Failed, rejected and bounced responses can be copied into a new editable draft. Sending again requires another review, and the backend owns suppression and retry policy.

#### Native email events to records

`mapOperationalEmailEvent(provider, payload, context)` in `operational-email-events.ts` is a pure mapper for `resend`, `postmark`, `sendgrid` and `ses`. Call it in the consumer backend after verifying the webhook, unwrapping the event and authorizing its message/recipient against the workspace. For SendGrid batches, map individual events; for SNS, unwrap the verified SES message first. Supply an authorized event ID, display name, provider event timestamp and, when appropriate, the affected recipient through `context`. It never selects the first recipient of a multi-recipient message or invents a timestamp.

| Provider | Native event                                                | `IntegrationRecord.status`                           | Optional record fields                     |
| -------- | ----------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| Resend   | `email.scheduled`; `email.sent`; `email.delivered`          | `queued`; `sent`; `delivered`                        | Original event name                        |
| Resend   | `email.failed`; `email.bounced`; `email.suppressed`         | `failed`; `bounced`; `rejected`                      | Bounce subtype/type; suppression type      |
| Postmark | `Delivery`; `Bounce`                                        | `delivered`; `bounced`                               | `TypeCode` as a string and reported `Type` |
| Postmark | `Bounce` with `Type: SMTPApiError`                          | `rejected`                                           | `TypeCode` and `SMTPApiError` disposition  |
| SendGrid | `processed`; `delivered`; `bounce`; `dropped`               | `queued`; `delivered`; `bounced`; `rejected`         | SMTP status code and bounce `type`         |
| SES      | `Send`; `Delivery`; `Bounce`; `Reject`; `Rendering Failure` | `sent`; `delivered`; `bounced`; `rejected`; `failed` | Bounce subtype/type or reject reason       |

These mappings define the frontend record vocabulary. The native semantics and payload fields are documented by [Resend](https://resend.com/docs/webhooks/event-types), including [suppression type](https://resend.com/docs/webhooks/emails/suppressed); [Postmark bounce webhooks](https://postmarkapp.com/developer/webhooks/bounce-webhook) and [SMTP API rejection](https://postmarkapp.com/developer/webhooks/smtp-api-error); [SendGrid delivery events](https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/event); and [SES event objects](https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html).

SendGrid `bounce` events with `type: blocked` retain `status: bounced` and `disposition: blocked`; the disposition distinguishes the reported temporary denial from a hard bounce. Delays, complaints, engagement and future event types retain their native event name as the record status. They are not silently translated into `failed` or a delivery confirmation. Successful native delivery events use `IntegrationRecord.status: delivered`; the narrower immediate `delivery` response union remains unchanged.

```ts
import type { IntegrationResult } from "@/lib/integrations/contracts";
import { parseIntegrationResult } from "@/lib/integrations/validation";
import {
  mapOperationalEmailEvent,
  type OperationalEmailEventContext,
  type OperationalEmailProvider,
} from "@/components/integrations/operational-email-events";

// Use only after your existing backend verifies and authorizes the event.
export function emailEventResult(
  provider: OperationalEmailProvider,
  verifiedEvent: unknown,
  authorizedContext: OperationalEmailEventContext,
): IntegrationResult {
  return parseIntegrationResult({
    kind: "record",
    record: mapOperationalEmailEvent(
      provider,
      verifiedEvent,
      authorizedContext,
    ),
  });
}
```

The mapper copies only allowlisted event metadata into `fields`: provider, native event name, authorized recipient, bounded reason code and native disposition when supplied. It does not copy provider headers, credentials, message HTML, SMTP diagnostic text or arbitrary custom arguments. Malformed types/context are rejected; a valid unfamiliar event remains a record. Event deduplication, per-recipient state, ordering and reconciliation with the original send response remain backend responsibilities.

Notification read state is considered unknown unless the backend reports it. A backend read update is offered only when an `update-record` action declares a usable target and read marker or read status. Otherwise “Mark seen in this view” is local and explicitly labeled; it does not persist provider read state. Preference controls remain drafts until a backend response arrives.

### Observability

Metric values, units and events come from returned results. Event filters operate on the loaded set, and no invented time series or usage totals are generated. Flag receipts are not treated as persisted flag state; refresh to verify that state.

Manual event submissions require an opt-in for the current session and a separate review. Viewing the workbench does not submit tracking events. Revoking the opt-in while its request is pending aborts the wait; backend handling still determines whether a submission already took effect.

### Jobs and automation

Progress percentages, steps and logs are displayed only when returned in a typed `job` result. Refresh requests ask the adapter for current state; the UI does not advance jobs on a timer. “Cancel request” aborts waiting, whereas `cancel-job` requests cancellation of the backend job. A cancelled status is shown only when reported.

Retries use a new reviewed run. For jobs and workflows started in this session, the original declared inputs are retained; otherwise the editor asks for inputs rather than inventing them. Workflow retries match the original action and run, copy only fields declared by the current action, and retain `0`, `false` and arrays without sharing mutable input arrays. Failed or cancelled workflows offer a review of a new run when those inputs are complete. Otherwise “Prepare workflow retry inputs” opens a fresh editable trigger draft and clears local mapping overlays. A run ID or workflow label is never substituted for a missing approved workflow reference. Cancelling a review preserves the draft and reported result. The backend owns authorization, deduplication and retry semantics.

An `IntegrationJob` can include the following backend-reported presentation metadata:

```ts
import type { IntegrationJob } from "@/lib/integrations/contracts";

export type WorkflowPresentation = Pick<
  IntegrationJob,
  "owner" | "accounts" | "templateUrl" | "templateName"
>;
```

`owner` is `{ id, name }`; `accounts` is an array of `{ id, name, status }`, where account status is `connected`, `expired`, `revoked` or `unknown`. These are authorized display references, not credentials or assertions about the browser's signed-in user. Omit unknown owner/accounts metadata; the UI shows “Unknown.” An explicit empty accounts array means no accounts were reported and is distinct from unknown. The n8n workbench shows these reported values without assuming that the current workspace owner controls the remote workflow or that a configured account is selected by it.

`templateUrl` and `templateName` identify a reported template. The backend must supply a safe public HTTPS presentation URL or authorized presentation proxy, with no signed credentials or private administration/builder links. The UI applies its presentation URL guard again. Selecting Make or Zapier also exposes their public [Make template catalogue](https://www.make.com/templates) or [Zapier template catalogue](https://zapier.com/templates). Browsing does not create, connect or activate a provider workflow. n8n retains the organization-controlled predefined backend workflow model; no external end-user builder or private workflow URL is invented.

The mapper uses actual loaded record fields plus the record’s name, description, type and status. Copy, trim, lowercase, uppercase, number and boolean transforms are local previews. Missing source fields, duplicate destinations, invalid conversions, prototype writes and sensitive fields are rejected. `0` and `false` remain valid values.

Mappings are serialized only into a declared mapping text field. A single mapping can also fill declared source-field and target-field descriptors. Output is attached to a workflow only when it declares a payload/input-data field. Other fields remain recipe-controlled; a local preview does not assert that a workflow is configured. Run history records actual adapter responses, with receipt times clearly distinguished from provider completion times.

## Presentation and verification

Responses are rendered by the `IntegrationResult.kind` discriminant, including unexpected result kinds, rather than assuming every query returns rows. Lists paginate the loaded records and label a larger reported total without claiming all records are loaded. Empty, pending, localized error and cancellation states retain editable drafts.

EN/ES text uses `useLanguage().l()`. Shared Base UI inputs, selects, switches, dialogs, buttons, DataTable and Chart preserve theme and keyboard behavior. Upload previews and output text use bounded, credential-filtered presentation; raw provider exceptions and stack traces are never shown. No credentials are persisted in browser storage.

Run the focused pure-function checks without a build:

```sh
node --experimental-strip-types --test tests/operational-integrations.test.mjs
node --experimental-strip-types --test tests/operational-workflow-email.test.mjs
```

These checks cover action discovery, payload boundaries, validation, safe presentation, interpolation, upload limits, mapping conversions, read-state patches, immutable result merging, reviewed workflow retry packets, unknown metadata, account states, template link safety and native email event mapping. They do not certify a provider account, real email delivery or integration compatibility with external SDKs.
