# Roadmap and release scope

Use this page to distinguish delivered frontend capabilities from research proposals. Proposed work has no committed delivery date; its priority depends on a concrete consumer need, an agreed contract and recorded acceptance.

## Delivered in the current kit

The application baseline has 69 demo views, 44 core component families, 107 registry entries, six palettes and 13 chart kinds, with English/Spanish and light/dark support.

- Editable components, complete examples, local source installation, registry delivery, preview/diff and installation receipts.
- Appearance Studio, local presets, JSON/CSS/React exports, scoped motion and six reusable effects.
- Onboarding, workspaces, members, CSV import, controlled customer tables, saved views and customer detail.
- Product/image editing, purchase-time order prices, mock checkout, invoices and billing, plus typed transport to a consumer Stripe backend.
- Local maps with optional Google SDK connection, and four authentication layouts with replaceable social callbacks.

These are frontend workflows and contracts. Live identity, tenant authorization, shared storage, financial operations and durable jobs remain consumer responsibilities. See [application integration](../../../docs/application-integrations.md) and the [1.4 release record](../../../docs/release-checklist-1.4.0.md).

## Research candidates

The [current gap study](../../../docs/research-gaps-1.4.es.md) records proposals against the 1.4 baseline. Examples include:

- Better continuity when updating customized copied source, building on existing previews and receipts.
- Explicit expired-session, stale-response, conflict and partial-failure scenarios with recoverable drafts.
- Richer commerce quotations, deferred payment states, returns/refunds and plan-change previews.
- Analytics freshness and missing-data semantics, regional preferences, and additional touch/keyboard interaction for dense views.

These proposals do not introduce public APIs by appearing in a document. A candidate needs implementation and a new acceptance record before it becomes delivered behavior. The [pilot plan](../../../docs/pilot-validation.es.md) proposes interviews and voluntary integrations; it does not establish adoption rates or measured time savings.

## Native design and verification boundaries

The native Figma 1.2.1 checkpoint remains frozen. New 1.4 application blocks are source-only, with no claimed new native master. The 92 local Code Connect templates use a synthetic validation runtime; they are not cloud certified or proof of live publication.

Browser checks, source checks, native evidence and archive delivery are distinct scopes. Version changes and new screenshots do not recertify historical records. See [design distribution](../../../docs/figma-distribution.md).

## Help choose the next change

1. Report a reproducible task with the version, installation path, language and relevant state.
2. Describe the outcome your application needs and the backend responsibilities it can supply.
3. Propose a bounded source change with accessible states and English/Spanish copy.

Follow [CONTRIBUTING](../../../CONTRIBUTING.md) and preserve the existing contracts and license notices.
