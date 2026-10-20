# Product research and opportunities

Aureform has a substantial visual foundation. The next opportunity is to make that foundation easier to integrate, operate and maintain: preserve its character when users encounter incomplete data, errors, small screens, session changes and customized source.

This report compares eight references, revisits the previous 20 findings and proposes eight priorities. Its baseline is **v1.4.1, commit `70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0`**: 69 demo views, 44 core families, 107 registry entries, six palettes and an Apache-2.0 frontend. Subsequent Lighthouse and Sponsors work has separate evidence and is not attributed retrospectively to that baseline.

## Method and scope

**Three headless investigations used `agy` and Gemini 4 Argon High**, covering design/interaction, application workflows and adoption/maintenance. Workflow and design runs recorded CLI 1.4.2; adoption recorded 1.4.3. Completed runs recorded **52 observed `search_web` queries**. Two initial attempts failed without delivering results. Design and adoption were retried in independent projects with public-web research and separate repository review. Failed attempts are not counted as completed research.

The [execution ledger](../../research/2026-10-20/agy-provenance.json) records models, versions, times, status, queries and hashes of locally retained final responses. The [verification ledger](../../research/2026-10-20/verification.json) records primary sources, redirects, issue context and exact baseline code references. The initial cutoff is October 20, 2026 UTC; rolling documentation can change.

The review separates four kinds of evidence: vendor-documented capabilities; particular experiences reported in issues; Aureform's existing behavior/contracts; and hypotheses requiring real users. A competitor feature does not establish demand. An open issue does not prove a locally reproduced defect, and closure alone does not identify a fixing release.

The primary audience is small product teams and agencies building SaaS, dashboards and internal tools. The [community pilot](../../pilot-validation.es.md) remains a planned protocol, targeting 8–12 voluntary interviews and 3–5 open integrations. No measured interviews, adoption, conversion or time savings establish what “most users” want.

## What the references show

These products have different purposes and distribution models. The classification follows their documented focus and identifies useful comparisons without presenting every project as an interchangeable competitor.

| Reference                                                               | Category                                   | Lesson for Aureform                                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [TailAdmin](https://tailadmin.com/docs/installation/nextjs)             | Dashboard template                         | A complete starting point makes navigation, composition and coverage easier to evaluate. Available pages depend on edition and version. The useful direction is completable journeys and clear module requirements. |
| [Untitled UI React](https://www.untitledui.com/react/docs/introduction) | Styled component kit with design resources | Editable source, tokens and setup documentation support brand work. Copying components still requires packages, utilities and CSS; editable source does not remove integration cost.                                |
| [shadcn/ui](https://ui.shadcn.com/docs/registry/registry-item-json)     | Components and source distribution         | Items can declare dependencies, files, instructions and metadata. That places the required installation context beside the component being added.                                                                   |
| [Tremor](https://www.tremor.so/docs/getting-started/about)              | Data and dashboard composition             | Small visualizations, tooltips and interactions offer references for useful data reading. Raw and the NPM library have separate setup tracks and should not be combined into one compatibility promise.             |
| [Magic UI](https://magicui.design/docs/components/bento-grid)           | Visual and motion inspiration              | Compositions offer ideas for hierarchy, presentation and discovery. Demo logos and integration diagrams communicate a visual relationship; they do not implement the services they illustrate.                      |
| [Mantine](https://mantine.dev/guides/next/)                             | Styled toolkit with specialized packages   | Full and minimal examples show an adoption progression. Its [CSS layer guidance](https://mantine.dev/styles/mantine-styles/) explains precedence; isolation of variables and selectors requires separate treatment. |
| [HeroUI](https://heroui.com/en/docs/react/getting-started/cli)          | Styled toolkit and adoption tools          | The current CLI documents installed-package and peer-requirement diagnostics. This is a reference for finding specific setup problems before first render, rather than guaranteeing universal compatibility.        |
| [Base UI](https://base-ui.com/react/overview/about)                     | Unstyled interaction foundation            | Aureform already uses this foundation. Its [accessibility guidance](https://base-ui.com/react/overview/accessibility) leaves responsibilities such as contrast, labels and visible focus with the product author.   |

Verification found distinctions that change interpretation: HeroUI's old CLI URL redirects to migration, while a current page separately documents `doctor`; Tremor describes two installation tracks; and Untitled UI setup still includes dependencies and CSS. Current capabilities are not inferred from obsolete URLs or marketing shorthand.

## Friction to investigate with users

**First render and first customization.** Someone needs to know whether a button is independent, whether a block needs a provider, which styles it imports and what it changes in an existing application. [shadcn issue #8669](https://github.com/shadcn-ui/ui/issues/8669) reports a particular custom-registry/base-style interaction. It includes maintainer replies and disputed follow-up, rather than evidence that every install fails. Aureform should exercise hosts with their own styles alongside its prepared starter.

**Updating after editing.** Editable source provides freedom and transfers update decisions to the consumer. Aureform already offers preview, diff, receipts and file protection. The remaining question is how to preserve, combine or replace when both sides change. [Untitled UI installation/update instructions](https://www.untitledui.com/react/docs/installation) and the [shadcn CLI](https://ui.shadcn.com/docs/cli) are flow references; acceptance needs a consumer with actual customization.

**Operation when something fails.** Tables, imports, sessions, payments and AI all have temporary states. Network failure, a late response and an expired session need different responses. The demo already has asynchronous contracts, cancellation and bounded retries. The opportunity is to make those boundaries observable while preserving the user's work.

**Reading data at different densities.** An attractive chart needs to distinguish zero, absence and stale data and offer a readable alternative. Compact tables can benefit desktop keyboard use while hurting touch targets. [Tremor Area Chart](https://www.tremor.so/docs/visualizations/area-chart) demonstrates composition; keyboard, formatting and touch acceptance remain our responsibility.

**Design/source continuity.** The Figma/source-only boundary is already documented. The next useful question is which missing blocks prevent a real design task. Until that need is identified, make scope easy to find and avoid promising complete parity.

**Confidence when choosing a foundation.** Reproducible setup, accurate examples, public evidence and maintainable updates reduce evaluation uncertainty. A page's score does not certify a kit. [Mantine's accessibility guidance](https://help.mantine.dev/q/are-mantine-components-accessible) and [Base UI issue #5237](https://github.com/mui/base-ui/issues/5237) illustrate why automated results need behavioral context.

## Changes since the earlier study

The [previous study](../../research-gaps-1.4.es.md) retains its sources and 1.4.0 baseline. Review of v1.4.1 classifies **one finding as delivered, three as partial and sixteen proposed extensions as outstanding**. Delivered can describe a satisfied documentation boundary; it does not imply expanded native Figma coverage.

| Earlier finding                        | Reviewed baseline state | Important distinction                                                                                                      |
| -------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 01. Route entry cost                   | Partial                 | Landing/docs are separated from application providers; app/auth partitioning and the complete comparison remain open.      |
| 02. Reproducible QA gates              | Partial                 | Website, keyboard, touch and scoped scans exist; equivalent acceptance across engines and assistive technologies does not. |
| 03. Minimal integration and styles     | Partial                 | A provider-free button and context guide exist; item-level recipes and a fresh host-style acceptance receipt remain open.  |
| 04. Copied-source updates              | Outstanding             | Preview, diff and protection exist; three-way comparison and per-file resolution require additional work.                  |
| 05. Figma/source-only boundary         | Delivered               | The retained native checkpoint and later source-only blocks have explicit limits.                                          |
| 06. Scenario laboratory                | Outstanding             | Bounded errors exist in separate contracts; a shared experience for exploring scenarios is absent.                         |
| 07. Expired sessions/invite recipient  | Outstanding             | Four auth screens and administrative operations exist; recoverable drafts and the recipient's journey do not.              |
| 08. Context and cross-tab conflicts    | Outstanding             | SaaS/commerce have scope protections; other demos and revision conflicts lack the same contract.                           |
| 09. DataTable extensions               | Outstanding             | Controlled query, manual pagination and stable IDs exist; cursors, unknown totals and query-wide selection are extensions. |
| 10. Import continuity                  | Outstanding             | Cancellation and partial retry exist; a consultable job after leaving the wizard is not implemented.                       |
| 11. Analytics semantics                | Outstanding             | Explicit absence, freshness, time domain and typed drilldown remain open.                                                  |
| 12. Regional preferences               | Outstanding             | EN/ES exists; timezone, currency precision and date presentation need a shared contract.                                   |
| 13. Dense touch/keyboard visualization | Outstanding             | Map controls exist; dense navigation and touch pan need their own acceptance.                                              |
| 14. Quotes and variants                | Outstanding             | Editing and purchase-time prices exist; tax, discounts, shipping and variants are outside current contracts.               |
| 15. Deferred payments/inventory        | Outstanding             | Redirect validation and repeated mock payment effects are protected; processing and committed availability remain open.    |
| 16. Refunds and returns                | Outstanding             | Displaying `refunded` does not implement operations or partial adjustments.                                                |
| 17. Effective plan changes             | Outstanding             | Mock changes do not provide proration previews or scheduled effective dates.                                               |
| 18. Per-file media recovery            | Outstanding             | Crop, validation, order and alt text exist; independent recovery after a batch failure does not.                           |
| 19. Maps degradation/cost              | Outstanding             | Fallback and opt-in exist; mount lifecycle, diagnosis and real cost need additional acceptance.                            |
| 20. AI continuity                      | Outstanding             | Mock streaming and stop exist; exact replay, evidence and partial states remain proposed.                                  |

The verification ledger provides source paths and line anchors for every row. Missing acceptance evidence is not automatically a demonstrated failure: a proposal can intentionally exceed the existing demo's scope.

## Eight recommended priorities

The order combines reach, expected benefit and relative cost. **Impact and confidence are research judgments, not experimental outcomes.** Small/medium/large effort describes contract, testing and integration extent and does not promise delivery days.

### 1. Item-level installation recipes and consumer diagnostics

**High impact · medium effort · high confidence · extension of a partial finding.** The catalog has 107 entries and the review found no item-level `docs` or `meta`. The [registry specification](https://ui.shadcn.com/docs/registry/registry-item-json) supports instructions and integration context.

Add provider, CSS, asset and minimal-example requirements at the point of installation. Complement existing receipts with diagnostics for versions, aliases and missing configuration. Maintain representative consumers with custom themes, edited source and effect composition.

**Acceptance:** install a primitive, a SaaS block and an effect in new and existing projects; render with the host's styles without missing imports or invalid composition. Record exact versions and diffs. A diagnostic explains how to correct a problem; package checks do not replace rendering.

### 2. State and recovery laboratory

**High impact · medium effort · high confidence · outstanding from the earlier study.** Bring together loading, empty data, no search results, recoverable errors, late responses and expired sessions. [Mantine form validation](https://mantine.dev/form/validation/) provides concrete references for async state, cancellation and invalid-field focus.

Use Aureform's real callbacks and deterministic fixtures rather than a parallel simulator that never exercises the component. The laboratory must work with a keyboard and explain the consumer backend boundary.

**Acceptance:** rejected submission preserves a draft; an old response cannot replace a newer one; retry resolves the displayed error and restores expected context. Exercise the fixtures in both languages and desktop/touch modes.

### 3. Dense-task accessibility and visual budgets

**High impact · medium effort · medium-high confidence · new acceptance over existing capabilities.** GSAP/Lenis already respect reduced motion, and applications use native scrolling. Extend acceptance to the complete task: nested overlays, virtual keyboards, post-filter focus and charts with many elements.

Provide suitable touch targets and cell navigation that avoids excessive tab stops. Check preset and customized contrast. Surfaces, gradients and hover must retain hierarchy and visible focus. [Base UI accessibility](https://base-ui.com/react/overview/accessibility) identifies responsibilities that remain in the visual layer.

**Acceptance:** open, operate and close composed controls with a keyboard; restore trigger focus; finish mobile editing with the virtual keyboard visible; interpret a chart without relying solely on color. Add human assistive-technology review and another engine before expanding coverage claims.

### 4. Analytics semantics and shared formatting

**High impact · medium effort · high confidence · outstanding.** `ChartDatum` requires numbers, heatmaps use zero for an absent series, and the accessible table does not apply the visual formatter. See the [baseline Chart implementation](https://github.com/terrizoaguimor/aureform-ui/blob/70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0/src/components/ui/chart.tsx).

Model absence, period, freshness and query state; use the same formatting in tooltips, table alternatives and exports. Apply explicit regional preferences while preserving integer minor units where required.

**Acceptance:** zero, absent data and errors produce distinguishable output; the table communicates the same values/units as the chart; timezone changes preserve period meaning; drilldown passes filters to the consumer.

### 5. Continuity when updating customized source

**High impact · large effort · high confidence · outstanding.** Build on existing protection, receipts and rollback on transaction failure. A retained comparison base and per-file choices should evolve the [current CLI](https://github.com/terrizoaguimor/aureform-ui/blob/70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0/bin/aureform.mjs).

**Acceptance:** customize an installed component, prepare an update with local and upstream edits, review conflicts before writes, combine selected changes and restore the prior state. Validate actual dependency ranges; a matching major version is not compatibility proof.

### 6. Context, sessions and long-running work

**High impact · large effort · high confidence · grouped outstanding findings.** Declare which demos are global and which belong to a workspace. Add cross-tab revision/conflict handling, reauthentication with recoverable drafts and an import state that can be consulted after leaving the screen.

**Acceptance:** changing workspace discards old-context late results; another tab does not silently overwrite a draft; invitation acceptance exercises the recipient's journey; leaving an import makes its status or cancellation discoverable. Real authority, durable persistence and authorization belong to the consumer's server. This is not a claim of a production tenant data leak.

### 7. Commerce and integrations with complete operation states

**Medium-high impact · large effort · high confidence · outstanding by domain.** Choose one concrete journey before adding many pages: complete quote, processing payment, effective plan date, and distinct returns/refunds. Review the [current commerce contracts](https://github.com/terrizoaguimor/aureform-ui/blob/70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0/src/lib/commerce.ts).

Pair that journey with per-file recovery in media, visible/reusable map mounting and an immutable AI request-parameter snapshot.

**Acceptance:** callbacks preserve coherent amount/operation states; a redirect does not confirm payment; cancellation does not promise money returned; AI retry uses the recorded request; one failed file does not silently erase the rest. Financial operations and reconciliation remain backend responsibilities.

### 8. Public evidence, documentation and discovery

**High impact · small/medium effort · high confidence · first measured delivery verified.** Publish measurements by route/profile, maintain bilingual references and provide a clear voluntary sponsorship route. The [quality page](https://aureformui.com/en/quality/) presents verified snapshots and their audited commits while retaining the laboratory scope. Unmeasured combinations are explicit.

The [GitHub discovery study](../../github-discovery.md) reviews 17 destinations and prepares proposals for the five priorities. About/topics describe actual capabilities. The official shadcn directory requires its validator and a fresh consumer install before a proposal is submitted.

**Acceptance:** badges derive from the same snapshot as the page; original downloads match their hashes; sponsorship links point to the maintainer; proposals follow destination formatting and disclose the project relationship. Acceptance and exposure belong to each community.

## Measured supplement to the research baseline

On **October 20, 2026**, the [first production snapshot](../../quality/lighthouse/index.json) audited commit **`0caf7c8874ea8bb2b1580c0d59a9bda4497cbdd4`**, after the immutable research baseline. Eighteen sequential audits produced mobile/desktop performance medians of **93/100 for the landing, 94/100 for installation documentation and 40/67 for the dashboard**. The complete four-category results and five loading metrics are available on the [quality page](https://aureformui.com/en/quality/).

This supplies measured evidence for continued work on application loading and main-thread cost. It does not establish a single cause, other-route performance or real-user experience. Profile the dashboard before choosing a change; preserve the stronger public-site results when isolating application modules. The dashboard's SEO median of 69 reflects its deliberate `noindex` policy, not a reason to index fictional application records.

This supplement does not change the original twenty finding classifications or retrospectively add Lighthouse to commit `70b40b5`. It describes a separate, fully identified measurement.

## Work sequence

First consolidate evidence and adoption clarity: public quality records, item-level recipes, representative consumers and the error laboratory. Then choose a dense task and complete its accessibility and data semantics. Source updates, cross-tab conflicts and financial journeys need broader contract design and acceptance and can proceed in independent domains.

Before expanding native Figma coverage, ask which three blocks a concrete integration needs to design. A long component list provides less learning than a journey that can be completed and customized.

The [roadmap](roadmap.md) distinguishes delivered work from these recommendations. A proposal does not add an API by appearing here. Each task needs a consumer, observable acceptance and new evidence before it is announced as available.

## Validation still needed

Use the pilot to observe an unaided installation, the CSS/provider blocking first render and a customized update decision. Ask about the person's last real error, intended task and device. Keep observed time separate from recalled estimates.

Record completion, abandonment, assistance and contract failures. Share anonymized findings or agreed attribution rather than client data. The pilot should test these priorities rather than confirm a predetermined conclusion.

The available baseline supports concrete next steps; primary references and scoped checks should retain their limits when the product is communicated.

## Sources and traceability

The [complete verification ledger](../../research/2026-10-20/verification.json) records requested/final URLs, retrieval dates, documented versions, issue states and corrected claims. The [AGY ledger](../../research/2026-10-20/agy-provenance.json) records actual searches from the three completed investigations.

Verified technical references follow. Their versions describe the retrieved documentation, not certified interoperability with Aureform.

<!-- BEGIN:verified-research-sources -->

### Benchmark documentation and first-party issues

- [TailAdmin Next.js Installation Guide](https://tailadmin.com/docs/installation/nextjs)
- [TailAdmin React Installation Guide](https://tailadmin.com/docs/installation/react)
- [TailAdmin FAQ](https://tailadmin.com/docs/others/faq)
- [TailAdmin Dark Mode](https://tailadmin.com/docs/customizations/dark-mode)
- [TailAdmin Next.js Changelogs](https://tailadmin.com/docs/update-logs/nextjs)
- [Untitled UI React Introduction](https://www.untitledui.com/react/docs/introduction)
- [Untitled UI React Installation](https://www.untitledui.com/react/docs/installation)
- [Untitled UI CLI](https://www.untitledui.com/react/docs/cli)
- [Untitled UI Theming](https://www.untitledui.com/react/docs/theming)
- [shadcn/ui Introduction](https://ui.shadcn.com/docs)
- [shadcn CLI](https://ui.shadcn.com/docs/cli)
- [shadcn Registry Item Specification](https://ui.shadcn.com/docs/registry/registry-item-json)
- [shadcn Registry Examples](https://ui.shadcn.com/docs/registry/examples)
- [shadcn Theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui #8669: custom registry cssVars and default base styles](https://github.com/shadcn-ui/ui/issues/8669)
- [Tremor: Towards Copy and Paste](https://www.tremor.so/docs/getting-started/about)
- [Tremor Raw Installation](https://www.tremor.so/docs/getting-started/installation)
- [Tremor Area Chart](https://www.tremor.so/docs/visualizations/area-chart)
- [Tremor NPM Installation](https://npm.tremor.so/docs/getting-started/installation)
- [Magic UI Installation](https://magicui.design/docs/installation)
- [Magic UI Animated Beam](https://magicui.design/docs/components/animated-beam)
- [Magic UI Bento Grid](https://magicui.design/docs/components/bento-grid)
- [Magic UI MCP Server](https://magicui.design/docs/mcp)
- [Magic UI #611: unresolved motion/react import during manual setup](https://github.com/magicuidesign/magicui/issues/611)
- [Mantine Usage with Next.js](https://mantine.dev/guides/next/)
- [Mantine Styles](https://mantine.dev/styles/mantine-styles/)
- [Are Mantine Components Accessible?](https://help.mantine.dev/q/are-mantine-components-accessible)
- [Mantine Form Validation](https://mantine.dev/form/validation/)
- [HeroUI Legacy CLI URL Now Resolves to Migration](https://heroui.com/en/docs/react/migration)
- [HeroUI Current React CLI](https://heroui.com/en/docs/react/getting-started/cli)
- [HeroUI React Quick Start](https://heroui.com/en/docs/react/getting-started/quick-start)
- [HeroUI Styling and Theming Migration](https://heroui.com/en/docs/react/migration/styling)
- [About Base UI](https://base-ui.com/react/overview/about)
- [Base UI Accessibility](https://base-ui.com/react/overview/accessibility)
- [Base UI Styling](https://base-ui.com/react/handbook/styling)
- [Base UI Releases](https://base-ui.com/react/overview/releases)
- [Base UI #5237: focus guard names in WebKit accessibility checks](https://github.com/mui/base-ui/issues/5237)

### Workflow, accessibility and adoption references

- [TanStack Table v8 row selection guide](https://tanstack.com/table/v8/docs/guide/row-selection)
- [TanStack Table v8 pagination guide](https://tanstack.com/table/v8/docs/guide/pagination)
- [TanStack Table #4781: pagination and row selection](https://github.com/TanStack/table/issues/4781)
- [shadcn/ui #1151: fixed table header with scrollable body](https://github.com/shadcn-ui/ui/issues/1151)
- [shadcn/ui #1960: row selection freezes a data table](https://github.com/shadcn-ui/ui/issues/1960)
- [shadcn/ui current Base UI data-table recipe](https://ui.shadcn.com/docs/components/base/data-table)
- [shadcn/ui changelog: CLI v4 and October 2026 agentic patterns](https://ui.shadcn.com/docs/changelog)
- [Mantine notifications and promise lifecycle](https://mantine.dev/x/notifications/)
- [Mantine 8.0.0 historical changelog](https://mantine.dev/changelog/8-0-0/)
- [Mantine 7.2.0: named form actions](https://mantine.dev/changelog/7-2-0/)
- [HeroUI v3 Table composition and infinite loading](https://heroui.com/en/docs/react/components/table)
- [Stripe payment-method integration comparison](https://docs.stripe.com/payments/payment-methods/integration-options)
- [Stripe Checkout fulfillment and delayed payment confirmation](https://docs.stripe.com/checkout/fulfillment)
- [Stripe subscription prorations and previews](https://docs.stripe.com/billing/subscriptions/prorations)
- [Vercel AI SDK useChat states and tool approval response](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [Google Maps JavaScript usage and billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing)
- [Google Maps Platform Dynamic Maps billable event](https://developers.google.com/maps/billing-and-pricing/sku-details#dynamic-maps-ess-sku)
- [Recharts #877: tooltip visibility for null values](https://github.com/recharts/recharts/issues/877)
- [Recharts #5552: tooltip when all Y values are null](https://github.com/recharts/recharts/issues/5552)
- [Recharts #6782: connectNulls edge behavior in stacked areas](https://github.com/recharts/recharts/issues/6782)
- [Recharts discussion #4228: snapping at null points](https://github.com/recharts/recharts/discussions/4228)
- [Magic UI #42: historical Globe GPU/scroll report](https://github.com/magicuidesign/magicui/issues/42)
- [Base UI #3630: keyboard access to Combobox.Clear](https://github.com/mui/base-ui/issues/3630)
- [Base UI PR #5537: proposed closing-popup focus/accessibility changes](https://github.com/mui/base-ui/pull/5537)
- [Mantine #7085: closed combobox aria-controls report](https://github.com/mantinedev/mantine/issues/7085)
- [Mantine #9233: disabled options and aria-disabled](https://github.com/mantinedev/mantine/issues/9233)
- [Base UI #1455: mobile keyboard/dialog positioning](https://github.com/mui/base-ui/issues/1455)
- [Mantine #6553: nested overlay Escape report](https://github.com/mantinedev/mantine/issues/6553)
- [Tremor NPM PR #1087: proposed tooltip z-index change](https://github.com/tremorlabs/tremor-npm/pull/1087)
- [W3C explanation of WCAG 2.2 target-size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [W3C explanation of enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
- [W3C explanation of meaningful non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [W3C explanation of text contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WAI-ARIA APG interactive grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [shadcn/ui #10496: third-party registry style override](https://github.com/shadcn-ui/ui/issues/10496)
- [HeroUI #4753: historical plugin/Tailwind v4 report](https://github.com/heroui-inc/heroui/issues/4753)
- [HeroUI #5733: historical package/style configuration](https://github.com/heroui-inc/heroui/issues/5733)
- [Tremor NPM #1054: React 19 RC chart report](https://github.com/tremorlabs/tremor-npm/issues/1054)
- [Tremor NPM #1072: React 19 support request](https://github.com/tremorlabs/tremor-npm/issues/1072)
- [Base UI public machine-readable documentation index](https://base-ui.com/llms.txt)
- [Mantine documentation, MCP and skills for coding assistants](https://mantine.dev/guides/llms/)
- [shadcn/ui MCP server and configured registries](https://ui.shadcn.com/docs/mcp)

<!-- END:verified-research-sources -->
