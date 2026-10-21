# Roadmap and release scope

Use this page to distinguish delivered frontend capabilities from research proposals. Proposed work has no committed delivery date; its priority depends on a concrete consumer need, an agreed contract and recorded acceptance.

## Delivered in the current kit

The current application has 70 core views, a hub and 65 integration recipe pages, 44 core component families, 134 registry entries, six palettes and 13 chart kinds, with English/Spanish and light/dark support.

- Editable components, complete examples, local source installation, registry delivery, preview/diff and installation receipts.
- Appearance Studio, local presets, JSON/CSS/React exports, scoped motion and six reusable effects.
- Onboarding, workspaces, members, CSV import, controlled customer tables, saved views and customer detail.
- Product/image editing, purchase-time order prices, mock checkout, invoices and billing, plus typed transport to a consumer Stripe backend.
- Local maps with optional Google SDK connection, and four authentication layouts with replaceable social callbacks.
- 65 [integration recipes](integrations.md), 86 provider choices and 17 domain workbenches, with working local mocks, typed HTTP transports, scoped resources, review, cancellation and recovery.
- Complete identity/session/MFA/team flows; provider-neutral commerce; structured AI streaming with sources, usage and acknowledged tool decisions; injectable editor and realtime callbacks.

These are frontend workflows and contracts. Live identity, tenant authorization, shared storage, financial operations and durable jobs remain consumer responsibilities. See [integration](integrations.md) and the [1.5 release record](../../../docs/release-checklist-1.5.0.md).

## Evidence and community delivery

The [October 2026 research](research.md) compares eight references, reviews the original 20 findings against commit `70b40b5`, and prioritizes eight improvements. Three completed headless AGY investigations recorded 52 web searches, followed by independent primary-source and code review. The [earlier gap study](../../research-gaps-1.4.es.md) remains available with its original scope.

The separate [integration research](integration-research.md) reviews baseline `a93ab113`, with four completed AGY investigations, 99 observed searches and a common 12–18 October npm window for 70 packages. Its P0/P1/P2 shortlist starts with connected data, replaceable identity, the existing Stripe transport and optional AI SDK recipes, then operational services and product connectors. Candidate cards identify existing frontend seams, proposed UI, consumer-backend requirements and license boundaries. These recommendations do not add live provider connections or new public adapter APIs.

The [public quality page](https://aureformui.com/en/quality/) displays the latest published Lighthouse snapshot and its exact audited commit. Collection covers three pages, two profiles and three runs per combination. The tooling retains complete reports and verifies their hashes; an empty snapshot is presented without invented scores.

The first measured application commit is `0caf7c8`: landing performance 93/100, installation docs 94/100 and dashboard 40/67, mobile/desktop. These lab medians make dashboard profiling and route-loading work a concrete next step. They do not identify one cause or certify other application pages.

GitHub Sponsors supports the maintainer, and the [GitHub discovery guide](../../github-discovery.md) records appropriate directories, their submission rules and prepared proposals. Directory acceptance and community adoption remain external outcomes.

## Priorities for the next product changes

These proposals do not introduce public APIs by appearing in a document. Each needs a bounded implementation and new acceptance evidence. The detailed research records impact, effort, confidence and observable acceptance for every priority.

| Priority | Proposed change                               | Evidence needed before delivery                                                                                                 |
| -------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Installation recipes and consumer diagnostics | Install in clean applications, validate actual dependency ranges and explain module CSS/context requirements                    |
| 2        | Scenario and recovery lab                     | Demonstrate late responses, conflicts, partial failure, cancellation and recoverable drafts through shared contracts            |
| 3        | Dense task accessibility and visual budgets   | Complete representative tasks by keyboard and touch, review focus/overlay behavior and measure motion at the actual data volume |
| 4        | Data absence, freshness and shared formatting | Distinguish zero, unknown and error; preserve chart/table values, units, timezones and filters                                  |
| 5        | Continuity for customized source updates      | Retain a comparison base, review local/upstream conflicts before writes and restore the previous installation                   |
| 6        | Context, sessions and long-running work       | Exercise workspace changes, concurrent tabs, recipient invitations and discoverable import status                               |
| 7        | Commerce and integration operation states     | Choose and complete a quote/payment/return journey with replaceable typed transports and explicit pending/error states          |
| 8        | Evidence, documentation and discovery         | Retain measured quality evidence, validate installation examples and report actual community integrations                       |

Start with installation clarity and a small scenario lab, then evaluate dense task interactions and analytics semantics. Source-update continuity and durable workflow boundaries require broader contracts. Choose one integration journey at a time instead of treating every proposed screen as a simultaneous release.

The [pilot plan](../../pilot-validation.es.md) proposes 8–12 interviews and 3–5 voluntary integrations. Those are recruitment targets, not completed interviews or adoption figures. Record completion, assistance, failures and willingness to reuse the kit before changing the order.

## Native design and verification boundaries

The native Figma 1.2.1 checkpoint remains frozen. New 1.4 and 1.5 application blocks are source-only, with no claimed new native master. The 92 local Code Connect templates use a synthetic validation runtime; they are not cloud certified or proof of live publication.

Browser checks, source checks, native evidence and archive delivery are distinct scopes. Version changes and new screenshots do not recertify historical records. See [design distribution](../../../docs/figma-distribution.md).

## Help choose the next change

1. Report a reproducible task with the version, installation path, language and relevant state.
2. Describe the outcome your application needs and the backend responsibilities it can supply.
3. Propose a bounded source change with accessible states and English/Spanish copy.

Follow [CONTRIBUTING](../../../CONTRIBUTING.md) and preserve the existing contracts and license notices.
