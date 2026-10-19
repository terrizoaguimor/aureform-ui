# SaaS operations: integration contract for 1.2

[Español](saas-operations.es.md).

This guide documents the **implemented frontend contracts** for team SaaS operations in the current 1.2 source. It covers onboarding, workspaces, members, CSV import, an external customer query, saved views and customer detail. The exports and examples below are based on actual source APIs. Executed consumer/native checkpoints have their own scope in [release handoff](#release-handoff); these examples do not certify every interactive state or final delivery.

The historical 1.1 baseline is **65 views, 44 families and 83 registry entries**. The current [route catalog](../src/lib/catalog.ts) adds four routes for **69 views: 68 suite views plus landing**, before locale expansion, and upgrades customers/team on two existing routes. The generated [1.2.0 registry](../public/r/index.json) contains **96 entries, including 13 new installable items**. The six palettes and EN/ES delivery remain available. Inventory does not establish a 1.2 test result.

## Delivery and data ownership

Aureform supplies interface source, composition patterns and a local demonstration. The consuming application owns production services and the domain model. An external query means the caller owns the dataset and query lifecycle; it does not imply an Aureform-hosted API.

| Concern          | Local demonstration boundary                                                  | Consuming application responsibility                                                   |
| ---------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Onboarding       | Controlled steps and a persisted draft; completion creates a local workspace. | Account provisioning, authenticated identity and business rules.                       |
| Workspace        | `WorkspaceProvider` selects scoped records in browser state.                  | Authorized membership, durable IDs and tenant isolation on every request.              |
| Members          | Local invitations, role changes and ownership transfer. No email delivery.    | Authorization, invitation delivery and authoritative membership changes.               |
| CSV import       | Browser parsing, mapping, validation and a staged local commit.               | Accepted schema, transaction/rollback policy, idempotency and durable writes.          |
| Customer query   | An asynchronous adapter reads the active workspace's local customer array.    | Fetching, filtering, sorting, paging, totals and cancellation for a production source. |
| Saved views      | Query, column configuration and density within a local workspace.             | Personal/shared ownership, access control and durable synchronization.                 |
| Detail and files | Local edits, notes/activity and attachment metadata only.                     | Record access, conflict handling, binary upload/storage and authorized download URLs.  |
| Appearance       | Existing configuration and optional local presets.                            | Brand policy and persistence beyond the current browser when required.                 |

A local success has a local scope: an invitation record has not sent an email, role preview is not authentication, and a local edit has not reached a consumer database. Controlled blocks accept caller-owned callbacks; they do not require the demo `WorkspaceProvider`.

Production credentials stay in the consumer's server environment. Browser records, file contents and query parameters are untrusted inputs. UI visibility and disabled controls support comprehension; server-side checks determine permission.

## Implemented source APIs

| Export and source                                                                                                 | Public integration points                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`WorkspaceProvider`, `useWorkspace`, `WorkspaceContextValue`](../src/components/workspace-provider.tsx)          | Provider takes `children`; the hook exposes `ready`, workspace/data, capabilities and the local operations listed below. There is no injected backend, seed or reset prop.                                                                                                                        |
| [`SaasDemoState`, `WorkspaceRole`, `WorkspaceCapability`, `SaasError`](../src/lib/saas.ts)                        | State validation, capability checks and pure helpers for member policy and customer merges. `SaasDemoState.version` is serialization version `1`, not release version 1.1 or 1.2.                                                                                                                 |
| [`OnboardingFlow`, `OnboardingFlowValue`, `OnboardingFlowProps`](../src/components/blocks/onboarding-flow.tsx)    | Required `value`, `onChange`, `onComplete`; optional `locale`, `onOpenCustomers`, `onOpenImports`, `className`. Completion callback returns `void` or `Promise<void>`.                                                                                                                            |
| [`OnboardingTemplate`, `WorkspaceSettingsTemplate`](../src/components/templates/saas-setup.tsx)                   | Onboarding template forwards flow props. Settings takes `workspace`, `canManage`, `onSave`, optional `onCreate`, `locale`, `className`; settings value is `{ id, name, slug, description }`.                                                                                                      |
| [`MemberManagement`, `MemberManagementProps`](../src/components/blocks/member-management.tsx)                     | `members`, `invitations`, `currentMemberId`, `canManage`, optional `canTransferOwnership`; callbacks `onInvite`, `onChangeRole`, `onRemoveMember`, `onResendInvitation`, `onAcceptInvitation`, `onRevokeInvitation`, `onTransferOwnership`. Each accepts a synchronous or asynchronous operation. |
| [`ImportWizard<T>`, `ImportWizardProps<T>`](../src/components/blocks/import-wizard.tsx)                           | Required `fields`, `onImport`; optional `locale`, `getRowKey`, `existingKeys`, `validateRow`, `limits`, sample/download labels and `resourceHref`.                                                                                                                                                |
| [`ImportField<T>`, `ImportCallback<T>`, `ImportContext`, `ImportResult`](../src/lib/csv-import.ts)                | Typed mapping and row validation; asynchronous commit with abort/progress and verifiable result counts. Also exports customer fields, parser/preview helpers and `serializeCSV`.                                                                                                                  |
| [`DataWorkbench<T>`, `DataWorkbenchValue`, `DataWorkbenchSavedView`](../src/components/blocks/data-workbench.tsx) | Required `value`, `onValueChange`, table data/columns; `filterFields`, saved-view callbacks, optional query notification, selection, loading/error/retry and table props.                                                                                                                         |
| [`DataTable<T>`, `DataTableProps<T>`](../src/components/ui/data-table.tsx)                                        | Default `mode="client"`; external mode requires `rowCount`. Optional controlled `query`, `columnState`, `rowSelection` and corresponding callbacks; `onSelectedIdsChange` reports selected IDs. Existing defaults remain the baseline contract.                                                   |
| [`DataTableQuery`, `DataTableColumnState`, normalization/serialization helpers](../src/lib/data-query.ts)         | Search, filters, ordered multi-sort and zero-based pagination; column visibility/order/sizing/pinning are separate display state.                                                                                                                                                                 |
| [`DataView`, `normalizeDataView`, `serializeDataView`, `parseDataView`](../src/lib/saved-view.ts)                 | Versioned query/display serialization using a column-ID allowlist.                                                                                                                                                                                                                                |
| [`GenericRecordDetail`, `GenericRecordDetailProps`](../src/components/blocks/record-detail.tsx)                   | Presentation with title, metadata, actions, tabs, loading/error/retry, missing state and related content. It does not load or mutate records.                                                                                                                                                     |
| [`CustomerDetailTemplate`, `CustomerDetailTemplateProps`](../src/components/templates/customer-detail.tsx)        | Required `customer` (nullable), `notes`, `activity`; optional `canEdit`, `onSave`, `onAddNote`, `attachedFiles`, `onAttach`, `relatedInvoices`, loading/error/retry and back navigation.                                                                                                          |

`OnboardingFlow`, workspace settings, `MemberManagement` and `ImportWizard` take explicit `locale: "en" | "es"` and default to English. `DataWorkbench` reads `next-intl` via `useLocale`; detail components use `useLanguage` and its `common` messages. Supply an appropriate `NextIntlClientProvider` even when overriding their labels. Data callbacks are provider-neutral; that does not remove localization or installed style requirements.

The other two new helper entries are [`workspace-status`](../src/components/blocks/workspace-status.tsx) and [`record-actions`](../src/components/blocks/record-actions.tsx). `WorkspaceStatus({ roles?: boolean })` requires the local workspace/locale context; `WorkspaceLoading` and `WorkspacePermission` present localized states. `RowActions` receives `name`, optional `edit`, `remove`, `view`, `viewLabel`. `DeleteDialog` takes `open`, `onOpenChange`, `count`, and `onDelete: () => void | Promise<void>` with async feedback; its confirmation copy describes the browser demo.

### Suite wrappers and routes

The [suite providers](../src/components/providers.tsx) already compose `NextIntlClientProvider`, `AppearanceProvider` and `WorkspaceProvider`. These wrappers bind controlled UI to the local demo and Next.js navigation; use the underlying blocks for a production data model.

| Locale route                       | Local wrapper                                                                                                | Catalog change          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------- |
| `/{locale}/onboarding/`            | `OnboardingOperationsTemplate` in [`saas-operations`](../src/components/templates/saas-operations.tsx)       | New                     |
| `/{locale}/settings/workspace/`    | `WorkspaceOperationsPanel` through settings                                                                  | New                     |
| `/{locale}/settings/team/`         | `MembersOperationsPanel` through settings                                                                    | Existing route enriched |
| `/{locale}/customers/`             | [`CustomerOperationsTemplate`](../src/components/templates/customer-operations.tsx) through the data manager | Existing route enriched |
| `/{locale}/customers/detail/?id=…` | `CustomerRecordOperationsTemplate` in `saas-operations`                                                      | New                     |
| `/{locale}/imports/`               | [`CustomerImportTemplate`](../src/components/templates/customer-import.tsx)                                  | New                     |

`useSaasAction()` in `saas-operations` translates synchronous `SaasError` codes into EN/ES `Error` messages for these wrappers. It is not a general asynchronous rejection handler.

### Local workspace context

| Context members                                                                                                                                               | Contract                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`, `persistenceError`, `retryPersistence()`                                                                                                             | Read completes before `ready`; errors are `"read"`, `"write"`, `"invalid"` or `null`. Retry writes the current session state; it does not reset it. |
| `workspace`, `workspaces`, `workspaceId`, `setWorkspace(id)`                                                                                                  | Selecting a known ID changes the active scope and clears role preview. Unknown ID throws `SaasError("missing")`.                                    |
| `currentMember`, `currentMemberId`, `role`, `previewRole`, `setPreviewRole(roleOrNull)`, `can(capability)`                                                    | Effective role is persisted preview or the actual member role; preview is an interface/demo capability simulation.                                  |
| `createWorkspace(input)`, `updateWorkspace(input)`                                                                                                            | Input is `Omit<Workspace, "id">`, including `organizationName`. Creation returns the new local workspace; update preserves its ID.                  |
| `customers`, `setCustomers`, `importCustomers(rows, "skip" \| "update")`                                                                                      | Scoped local customers; imports return `{ created, updated, skipped, failed }`.                                                                     |
| `members`, `invitations`, `inviteMember`, `resendInvitation`, `acceptInvitation`, `revokeInvitation`, `changeMemberRole`, `removeMember`, `transferOwnership` | Local policy enforcement; invitation operations take an ID except `inviteMember(email, role)`.                                                      |
| `notes`, `addNote(customerId, text)`, `files`, `attachFiles(customerId, files)`                                                                               | Scoped notes and attachment metadata; file inputs are `readonly File[]`.                                                                            |
| `activity`, `recordActivity(detail, kind, resourceId?)`                                                                                                       | Local event feed, not a tamper-resistant production audit log.                                                                                      |
| `savedViews`, `setSavedViews`, `customerView`, `setCustomerView`                                                                                              | Per-workspace preferences. Stored view values are `unknown`; normalize before use.                                                                  |
| `onboarding`, `setOnboarding`, `completeOnboarding`                                                                                                           | Persisted `OnboardingDraft`; completion creates/selects a local workspace and local invitations.                                                    |

## Operation contracts

### Onboarding and workspaces

`OnboardingFlowValue` has `step`, `organizationName`, `workspaceName`, `workspaceSlug`, `invites` and `completed`. Steps are zero-based, 0–3: organization, workspace, invitations and first action. The block validates before advancing and awaits `onComplete`; the caller must reflect accepted completion in `value`. Failure preserves the draft.

The local `OnboardingDraft` additionally permits `workspaceId`. Organization/workspace names are 2–100 characters; slug is 2–64 lowercase alphanumeric characters separated by hyphens and must be unique locally. `completeOnboarding` supports at most 50 invitations, validates email/role, and excludes the current member from invitations. Non-viewers can create another local workspace; the new scope starts with the current member as owner and empty operational data.

`WorkspaceProvider` reads/writes validated `SaasDemoState` under **`aureform:saas:v1`** in `localStorage`, and accepts valid updates through storage events. `data[workspaceId]` isolates customers, members, invitations, notes, files, activity and views. `previewRole` is persisted in `SaasDemoState.previewRole`; `setWorkspace` clears it, and `setPreviewRole(null)` returns to the member role. No public reset method exists. Clearing browser storage is not a documented provider callback; do not invent `resetWorkspace()`.

The local wrappers key customer/import/member state by workspace. A consumer must apply the same scope boundary to requests, selection and drafts; abort or discard old requests when switching. Browser separation of records is not production tenant isolation.

### Members

Roles are `owner`, `admin`, `member`, `viewer`; invitations cannot assign `owner`.

| Capability                                                           | Owner | Admin | Member | Viewer |
| -------------------------------------------------------------------- | ----- | ----- | ------ | ------ |
| `workspace.manage`, `members.manage`                                 | Yes   | Yes   | No     | No     |
| `ownership.transfer`                                                 | Yes   | No    | No     | No     |
| `customers.write`, `customers.import`, `notes.write`, `views.manage` | Yes   | Yes   | Yes    | No     |

Local invitations expire after seven days; resend renews a pending/expired invitation, accept adds a local member, and revoke changes the local status. There is no mail service. Member statuses are `active`/`suspended`; invitation statuses are `pending`/`accepted`/`expired`/`revoked`.

The provider prevents changing/removing an owner through ordinary role/removal actions and prevents self-removal. Ownership transfer requires an actual active owner and a different active target; it makes the old owner an admin and the target an owner. Previewing owner does not grant that transfer. Pure helpers in `lib/saas.ts` implement these rules. `SaasError.code` is `permission`, `invalid`, `duplicate`, `owner`, `expired` or `missing`.

`MemberManagement` owns form/dialog pending and failure feedback; its callbacks own accepted records. Cancelling does not call a mutation. Production membership, protected-member rules and authorization still belong to the host.

### CSV import

`parseCSV` accepts comma-delimited UTF-8 CSV, including BOM, escaped double quotes, quoted commas/multiline cells and CRLF. Default limits are **5 MiB, 10,000 data rows and 200 columns**, configurable through `limits: Partial<CSVLimits>`. Malformed quoting, unsafe/blank/duplicate headers and invalid limits are parser/configuration errors, not successful empty imports.

`ImportField<T>` defines `key`, localized `label`, optional `required`, `aliases`, `sample`, `defaultValue`, `parse` and `validate`. Mapping/preview helpers do not mutate the dataset. The wizard stages file → mapping → preview → review. Invalid rows require correction or explicit exclusion; duplicates use `"skip"` or `"update"` and a caller-provided key/existing-key set. A field error remains distinct from an import commit failure.

`CustomerImportRow` has `name`, `email`, `company`, `plan`, `status`, `amount`, `joined`. Company defaults to empty; the other fields are required. The supplied fields use plans Starter/Pro/Enterprise, statuses active/trial/paused, nonnegative numeric amount and a real `YYYY-MM-DD` date. `getCustomerImportKey` normalizes email. The provider merge preserves existing IDs on update.

`ImportCallback<T>` is `(rows: readonly T[], context: ImportContext) => Promise<ImportResult>`. Context supplies `mode`, `signal` and `onProgress({ completed, total?, message? })`. Result counts `created + updated + skipped + failed` must equal the exact submitted row count. For a safe failed-only retry, supply one `{ index, message }` per failed row; indexes are zero-based in that invocation's submitted array, not CSV line numbers.

The caller stages/rolls back writes before rejecting or acknowledging cancellation. A resolved partial result can retry only identified failures. Resolving after abort is **unverified**, not proof of rollback and not permission for automatic retry. The local `CustomerImportTemplate` checks abort through asynchronous staging/progress, then performs one synchronous provider merge; it does not upload a CSV to a backend. `serializeCSV` quotes cells and guards formula-looking text on export.

### Customer table and external query

`DataTableQuery` is `{ search, filters, sorting, pagination }`; pagination uses **zero-based `pageIndex`** and `pageSize`. `normalizeDataTableQuery` defaults to page 0/size 5 and accepts a column allowlist/max size. The customer adapter uses size 5 and maximum 100. Sort order preserves multi-sort precedence. Search/filter/sort changes reset the table page to 0; the query adapter must reconcile a page that becomes invalid after data changes.

`DataTable` defaults to `"client"` processing of its complete supplied array. With **`mode="external"` and required `rowCount`**, filtering, sorting and pagination are manual: supply only the accepted page and its total matching count. The component does not fetch, apply a second client filter or infer a total from page length.

`DataWorkbenchValue` contains `query`, optional `columns` and `density`. Filters include text, select/multi-select, number range and date range. The query helpers support contains/startsWith, equality/inequality, in/notIn, numeric comparisons/between, dateBetween and empty/not-empty. Filters combine with AND; multi-select values within one `in` filter combine as alternatives. Column state is visibility, order, sizing and pinning; density is comfortable/compact.

The [demo customer adapter](../src/demo/customer-adapter.ts) exports `matchingCustomers`, `queryCustomers` and async `loadDemoCustomerPage(source, query, { signal, delay?, fail? })`. It uses the caller's array, checks abort, and returns `{ rows, total, query }` with a clamped page. It makes no network request. `CustomerOperationsTemplate` supplies only `scope.customers`, keys requests by query and source, aborts superseded requests and remounts on workspace change.

**Filtered export covers all matching records**, not just the page: the local wrapper calls `matchingCustomers(scope.customers, value.query)` before CSV generation. A production caller needs an equivalent complete-filter export path; a single remote page is insufficient.

Controlled `rowSelection` is an ID map; `onRowSelectionChange` and `onSelectedIdsChange` can represent IDs beyond the loaded page. The legacy `onSelectionChange` and row-based `selectedAction` only know loaded records. A host must resolve cross-page IDs and define selection behavior after filtering. The local customer wrapper can resolve them from its complete scoped array. Page selection never means all query matches.

### Saved views and detail

`DataView` stores `{ query, columns, density }`. `serializeDataView(value, columnIds)` emits a version-1 envelope; `parseDataView(text, columnIds)` returns a normalized view or `null`, rejecting malformed/oversized input. Unknown columns are removed. It stores neither customer snapshots nor selected rows. Search/filter values can still contain business information; a copied view URL is not an access grant.

`DataWorkbench` takes `savedViews`, optional controlled `activeViewId`/`onActiveViewChange`, and `onSaveView(view)`, `onDeleteView(id)`, `onShareView(value, view?)`, each permitting an async callback. The local wrapper saves per-workspace views and shares actual current-origin view configuration through the clipboard. Shared ownership, access and synchronization are host responsibilities.

The local detail wrapper reads an encoded `id` query parameter and looks up that ID only in the active workspace. The customer form preserves input on rejected `onSave`, reports the rejection as a general form error, and closes editing only after acceptance. Local schema errors attach to fields; there is no documented server-field-error return object. Cancel resets the draft to the supplied customer; changing customer ID remounts its detail body. A production host must resolve stale-record conflicts and update accepted parent data.

`attachFiles(customerId, files)` records **metadata only**: `{ id, name, size, type, createdAt }`, **at most 100 entries per customer, at most 10 MiB per file**. It stores no binaries, object URLs or fabricated download URLs. `CustomerDetailTemplate` permits a real optional `CustomerDetailFile.url` supplied by the host; the local wrapper does not manufacture it. CSV's 5 MiB input limit is a separate contract.

These contracts support finding, comparing, editing and acting on records, following the task framing in [NN/G's data-table guidance](https://www.nngroup.com/articles/data-tables/).

## State matrix

The state names below describe behavior, not exported enum values. EN/ES wording is illustrative and must be reconciled with the actual labels.

| State                | Interface behavior                                                        | Local demo / consumer boundary                                     | Example EN / ES                                                                      |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Ready                | Show confirmed context, records and available actions.                    | Demo seed or accepted query result.                                | Customers / Clientes                                                                 |
| Initial loading      | Identify the pending operation; avoid a premature empty state.            | Adapter reports initial loading.                                   | Loading customers / Cargando clientes                                                |
| Refreshing           | Indicate refresh and distinguish retained rows from confirmed new data.   | Requires that distinction in the adapter.                          | Updating results / Actualizando resultados                                           |
| First-use empty      | Explain what is missing and offer create/import.                          | Successful unfiltered query with no records.                       | Add your first customer / Añade tu primer cliente                                    |
| No matches           | Keep query controls and offer a targeted reset.                           | Successful filtered query with no matches.                         | No matches for these filters / Sin coincidencias con estos filtros                   |
| Invalid input        | Associate errors with fields or CSV rows; preserve input.                 | Client checks plus authoritative host validation.                  | Review the marked fields / Revisa los campos señalados                               |
| Mutation pending     | Keep the action name, announce progress and prevent duplicate submission. | Actual operation remains unresolved.                               | Saving changes / Guardando cambios                                                   |
| Success              | Update accepted state and announce the result with its scope.             | Local acceptance or a host-confirmed mutation.                     | Changes saved / Cambios guardados                                                    |
| Recoverable error    | Explain the failed operation, preserve input/query and offer retry.       | Failed read/parse/write, identified accurately.                    | Could not save changes / No se pudieron guardar los cambios                          |
| Restricted/read-only | Explain unavailable actions when the host provides that state.            | Production authorization remains on the server.                    | You can view this record / Puedes consultar este registro                            |
| Missing record       | Offer a route back to the existing list context.                          | Host confirms absence or the chosen inaccessible-record policy.    | Customer unavailable / Cliente no disponible                                         |
| Storage unavailable  | Keep a usable session; expose persistence failure/retry.                  | `persistenceError` and `retryPersistence()` in the local provider. | Changes are available in this session / Los cambios están disponibles en esta sesión |
| Workspace transition | Identify the new context; discard results from the previous one.          | Host/demo reconcile scoped state and pending operations.           | Switching workspace / Cambiando de espacio de trabajo                                |

Empty and error states must be visibly distinct and offer the appropriate next action. This follows [NN/G's empty-state guidance](https://www.nngroup.com/articles/empty-state-interface-design/).

Import cancellation additionally distinguishes cancelling, confirmed cancellation, partial result and unverified completion. Refreshing and production authorization/conflict states require the host to provide the corresponding truth; this matrix is not a completed coverage report.

## Consuming the source

The local [CLI](../bin/aureform.mjs) discovers the **13 new source entries**: `workspace-provider`, `workspace-status`, `onboarding-flow`, `member-management`, `import-wizard`, `data-workbench`, `record-detail`, `record-actions`, `saas-setup`, `saas-operations`, `customer-operations`, `customer-import` and `customer-detail`. For example, from the extracted kit:

```sh
node bin/aureform.mjs list
node bin/aureform.mjs init ../team-product --no-install
node bin/aureform.mjs add saas-operations customer-operations customer-import --cwd ../existing-product --dry-run
node bin/aureform.mjs add saas-operations customer-operations customer-import --cwd ../existing-product --diff
```

`--dry-run` reports destinations, dependency changes and protected conflicts without writes. `--diff` adds text differences and always implies dry-run. Neither installs packages. An actual `add` copies the dependency closure and merges integration requirements; the consumer then runs its package manager.

Successful `add` writes **`.aureform/manifest.json`** with item origin/version and each `sourcePath`, `sourceHash`, `targetPath`, `targetHash`. Source hash covers original bytes; target hash covers installed bytes after alias rewriting. Preview also exposes current/proposed hashes. The receipt distinguishes unmodified/customized/unknown files; it is provenance, not a signature or overwrite permission. Changed existing source is protected even when a prior receipt says unmodified. Review the diff before choosing an explicit `--overwrite`; it does not bypass incompatible dependency requirements. See [CLI previews and receipts](cli-updates-1.2.md).

The [registry generator](../scripts/generate-registry.mjs) writes standard `registry.json` and `public/r/registry.json`, plus the versioned `public/r/index.json` and item payloads. The current 1.2.0 index has 96 entries. These are registry discovery manifests, including for registry-aware MCP tooling; their existence is not a live MCP deployment or cloud publication. Recorded validation and remaining archive gates are separated in the [release checklist](release-checklist-1.2.md).

Interactive query/form callbacks belong inside a suitable client boundary. The installed Next.js guide for `'use client'` requires serializable props across the server/client boundary; a conventional event callback cannot simply be passed from a Server Component. Choose a client adapter or the host's supported server interaction pattern. The installed forms guide also requires authorization inside each Server Action when the host uses that mechanism.

Use the existing `AppearanceProvider` and `AppearanceScope` contracts when applicable; see [Appearance](appearance.md). Brand edits should flow through semantic tokens and scopes, with readable tables, visible focus, Light/Dark and motion preferences reviewed.

Local examples must identify their synthetic data and persistence boundary. A production consuming example should demonstrate a caller-owned data source and real response states without depending on the suite's route catalog or demo store.

## Reusable examples

These examples use existing exports. They require the copied dependency closure, styles and the host's client boundary. They are documentation examples; their consumer execution remains a release check. The [Spanish guide](saas-operations.es.md) uses the same contracts with Spanish labels.

### Local suite composition

Inside a Next.js application, the suite provider supplies locale, appearance and the local workspace store. This is a browser demo, not a backend adapter.

```tsx
"use client";
import { Providers } from "@/components/providers";
import { OnboardingOperationsTemplate } from "@/components/templates/saas-operations";

export function TeamDemo() {
  return (
    <Providers locale="en">
      <OnboardingOperationsTemplate />
    </Providers>
  );
}
```

### Controlled onboarding without the workspace store

`finish` belongs to the consumer. It rejects on failure; after acceptance, this parent reflects the completed value supplied by the block.

```tsx
"use client";
import { useState } from "react";
import {
  OnboardingFlow,
  type OnboardingFlowProps,
  type OnboardingFlowValue,
} from "@/components/blocks/onboarding-flow";

export function ConsumerSetup({
  finish,
}: {
  finish: OnboardingFlowProps["onComplete"];
}) {
  const [value, setValue] = useState<OnboardingFlowValue>({
    step: 0,
    organizationName: "",
    workspaceName: "",
    workspaceSlug: "",
    invites: [],
    completed: false,
  });
  return (
    <OnboardingFlow
      locale="en"
      value={value}
      onChange={setValue}
      onComplete={async (completed) => {
        await finish(completed);
        setValue(completed);
      }}
    />
  );
}
```

### Import through the caller's commit

This reusable component supplies the existing customer schema/key and forwards the full abort/progress contract to `commit`. Supply only the active scope's existing keys. The consumer callback must implement persistence and rollback; the UI does not create that service.

```tsx
"use client";
import { ImportWizard } from "@/components/blocks/import-wizard";
import {
  customerImportFields,
  getCustomerImportKey,
  type CustomerImportRow,
  type ImportCallback,
  type ImportKey,
} from "@/lib/csv-import";

export function ConsumerImport({
  existingKeys,
  commit,
}: {
  existingKeys: readonly ImportKey[];
  commit: ImportCallback<CustomerImportRow>;
}) {
  return (
    <ImportWizard<CustomerImportRow>
      locale="en"
      fields={customerImportFields}
      getRowKey={getCustomerImportKey}
      existingKeys={existingKeys}
      onImport={commit}
      title="Import customers"
      description="Review the mapping and rows before confirming."
    />
  );
}
```

### Controlled external query with actual async cancellation

The following uses the existing synthetic adapter over a caller-owned array; it makes no network request and does not use `useWorkspace`. Mount under `NextIntlClientProvider` with locale `en` and the host's messages. Remount with `key={workspaceId}` on scope change. Keep the source array reference stable until its data changes.

```tsx
"use client";
import { useEffect, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  DataWorkbench,
  type DataWorkbenchValue,
} from "@/components/blocks/data-workbench";
import {
  customerColumnIds,
  loadDemoCustomerPage,
} from "@/demo/customer-adapter";
import type { Customer } from "@/demo/data";
import {
  normalizeDataTableQuery,
  serializeDataTableQuery,
} from "@/lib/data-query";

const columns: ColumnDef<Customer>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "company", header: "Company" },
  { accessorKey: "plan", header: "Plan" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "amount", header: "Amount" },
  { accessorKey: "joined", header: "Joined" },
];
type Snapshot = {
  source: readonly Customer[];
  key: string;
  rows: Customer[];
  total: number;
  error?: string;
};

export function ExternalCustomers({ source }: { source: readonly Customer[] }) {
  const [value, setValue] = useState<DataWorkbenchValue>(() => ({
    query: normalizeDataTableQuery(
      {},
      { columnIds: customerColumnIds, maxPageSize: 100 },
    ),
  }));
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [retry, setRetry] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const key = `${serializeDataTableQuery(value.query)}:${retry}`;

  useEffect(() => {
    const controller = new AbortController();
    loadDemoCustomerPage(source, value.query, { signal: controller.signal })
      .then((page) => {
        if (controller.signal.aborted) return;
        if (
          serializeDataTableQuery(page.query) !==
          serializeDataTableQuery(value.query)
        ) {
          setValue((previous) => ({ ...previous, query: page.query }));
          return;
        }
        setSnapshot({ source, key, rows: page.rows, total: page.total });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setSnapshot({
            source,
            key,
            rows: [],
            total: 0,
            error: "Could not load customers. Try again.",
          });
      });
    return () => controller.abort();
  }, [source, value.query, key]);

  const current =
    snapshot?.source === source && snapshot.key === key ? snapshot : undefined;
  return (
    <DataWorkbench<Customer>
      mode="external"
      value={value}
      onValueChange={setValue}
      columns={columns}
      data={current?.rows ?? []}
      rowCount={current?.total ?? 0}
      loading={!current}
      error={current?.error}
      onRetry={() => setRetry((previous) => previous + 1)}
      filterFields={[{ id: "company", label: "Company", type: "text" }]}
      pageSizeOptions={[5, 10, 25, 50, 100]}
      selectable
      rowSelection={selection}
      onRowSelectionChange={setSelection}
    />
  );
}
```

For a production adapter, replace the async read with the host's authenticated source while preserving query identity, abort/discard and authoritative totals. To export this demo's complete filtered set, use `matchingCustomers(source, value.query)`; to serialize a saved view, use `serializeDataView(value, customerColumnIds)`. Neither operation should use only `current.rows`.

### A real rejected form callback for a pilot fixture

Under the same locale provider, this fixture rejects the first save through the actual `onSave` callback. The next attempt delegates to the caller, which must update accepted customer data. This is a test fixture, not a production error policy.

```tsx
"use client";
import { useState } from "react";
import {
  CustomerDetailTemplate,
  type CustomerDetailTemplateProps,
} from "@/components/templates/customer-detail";

export function RecoverableDetail(props: CustomerDetailTemplateProps) {
  const [rejectOnce, setRejectOnce] = useState(true);
  return (
    <CustomerDetailTemplate
      {...props}
      onSave={
        props.onSave
          ? async (customer) => {
              if (rejectOnce) {
                setRejectOnce(false);
                throw new Error(
                  "Temporary save failure. Your draft is still here; try again.",
                );
              }
              await props.onSave?.(customer);
            }
          : undefined
      }
    />
  );
}
```

## Release handoff

Source contracts and reusable examples are documented. The [executed 1.2 independent consumer checkpoint](consumer-verification-1.2.md#final-executed-consumer-checkpoint) records 811/811 checks across three modes — CLI add, official HTTP registry and CLI init — with actual consumer type/lint/production commands and unchanged captured inputs. Six installation modes are planned: those three plus source/starter/free ZIP consumers. The evidence companions are integrity-checked archives, not installation modes. The final pinned six-mode retake and publication remain pending.

The [native 1.2 audit](../.figma/native-audit-1.2.json) records 69 roots: 63 inherited and six SaaS routes reviewed in Light/Dark. The [SaaS library](../.figma/native-saas-library-1.2.json) records nine sets / 68 variants and 12 Light/Dark roots with [22 owner-approved PNG exports](../.figma/proofs/saas-1.2/owner-visual-approval.json). [Local Code Connect validation](../.figma/code-connect/validation/validation-summary.json) checked 92 unchanged prior templates against source 1.2: 1,646 evaluations / 556 typed examples, zero diagnostics and 98 source snapshots. It uses a synthetic local runtime and does not claim cloud publication or new templates. The [recorded verification](release-checklist-1.2.md#recorded-verification-at-source-freeze) also closes the integrated 74-case E2E run, motion 14/74, copy 188, scoped responsive 72, served-preview/gallery checks and fresh unit 184/type/zero-warning lint checks. The portable [current-source runtime receipt](qa-runtime-1.2.json) records these results and their preserved full-report hashes. Fifty-four scoped axe analyses reported zero violations and retain 54 incomplete rule results; they are not complete accessibility certification. Copy covers 176 dynamic clipboard payloads plus 12 code-view combinations, 188 strict checks total. The separate compilation covers **688 generated payloads = 44 copied + 616 configured + 28 Studio**; 44 canonical example files plus one barrel bring the compile roots to **733**. This and its negative controls are compile-only proof.

The 1.2 source ZIP layout retains source/assets, docs, native manifests and reproduction scripts, with native proof PNGs excluded. Native PNG proofs are distributed separately as `aureform-ui-native-evidence-1.1.zip` and `aureform-ui-native-evidence-1.2.zip`, preserving 23 accepted historical and 22 accepted new PNGs and their original proof paths/hashes. They are **optional for suite build/run and component installation**. Preliminary generation of all five archives passed the size gate; final archives are regenerated and pinned after the included docs freeze. To reproduce the `pnpm package:source` evidence gate, verify the final matching checksums and extract both companions into the extracted kit root, preserving `.figma/proofs/...`, then run the packaging command. See [packages and extraction commands](../README.md#figma-source-and-packages) and the [release checklist](release-checklist-1.2.md). The final five-ZIP pin, six-mode consumer results and source/native/browser checks belong in `public/downloads/verification-1.2.json`, excluded from the Source ZIP and fixed before publication; no preliminary hash is bound by this included snapshot. Publication authority is the native Sites host saved-version/commit/deployment acknowledgment, retained after deployment in ignored `artifacts/publication-1.2.json` and the final handoff. The static public receipt is not updated to embed the eventual publication commit.

Production gaps remain: authenticated identity, server authorization/tenant isolation, invitation email, durable database writes, transaction/idempotency policy, real file storage/download authorization, shared-view access and stale-record conflict handling. These are host integrations, not hidden services supplied by the frontend.

The [historical 1.2 release checklist](release-checklist-1.2.md) records that release's technical evidence and private publication scope. Original Aureform source, examples and distributed design assets now use [Apache 2.0](../LICENSE); the current open-source release has its own publication checkpoint. The [planned community pilot](pilot-validation.es.md) remains future research outside delivery gates. This guide does not claim interviews, adoption outcomes or cloud Code Connect publication.

1.3 is planned for inbox, usage, billing, audit and webhooks. AI artifacts, an editor and emails are later work; production services for those features remain the consuming application's responsibility unless a future release explicitly changes the delivery model.
