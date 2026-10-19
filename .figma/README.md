**Aureform UI — local parserless Code Connect assets**

These are local `.figma.ts` template artifacts, prepared on 2026-10-18. They have not been registered, uploaded or published to Figma. The native library is unpublished and the account is Professional; preparation of these local assets does not establish cloud eligibility or a live Dev Mode connection.

`figma.config.json` selects `.figma/*.figma.ts`, with TSX as the emitted snippet language. Every template imports `figma` from `'figma'`, reads `figma.selectedInstance`, and default-exports a `figma.code` example with imports, an ID and metadata. There are no parser-based `.figma.tsx` files or `figma.connect()` calls in this asset set. The runtime module is supplied by Code Connect, not by the Next.js application.

The manifest lists every template's file, authoritative native node, source/export, exact property keys, exhaustive axes, mappings, intentional visual limitations and local publication status. Input and source hashes make the prepared snapshot traceable. The authoritative `state.json` and `component-properties.json` are inputs and have not been edited by this preparation task.

| Prepared assets                                                        |  Count |
| ---------------------------------------------------------------------- | -----: |
| Core families from `src/lib/catalog.ts`                                |     44 |
| Button additional styles / loading and icons                           |      2 |
| Source block exports, across 8 source files                            |      9 |
| RevenuePanel / Bar additional native master                            |      1 |
| Native icon templates, including AureformMark and ArrowUpRight         |     22 |
| SidebarItem navigation-data fragment                                   |      1 |
| DashboardSidebar / DashboardHeader / DashboardBrandHeader compositions |      3 |
| **Total parserless templates**                                         | **82** |

The nine blocks are AIComposer, CustomerTable, CustomerDataTable, DashboardShell, MetricCard, PageHeading, PlanBreakdown, RevenuePanel and RouteMap. CustomerTable and CustomerDataTable share their source file. MetricCard maps to its native **Core** node; RouteMap maps to the application-component node from the ledger. No extra native block IDs have been invented.

RevenuePanelBar additionally maps the authoritative **RevenuePanel / Bar** master `38:1736` to the existing RevenuePanel source export. Its local fallback uses `kind="bar"`; a connected Chart supplies its actual kind, label and data. This separate native master has no reported property keys or variant axes.

Coverage follows the agreed core/block/chrome/icon scope. Private application helpers such as PlanBreakdown / Attainment, ShipmentProgress, FileCard / Studio and CalendarDay are outside this local asset set. Native responsive layout changes with unchanged axes do not add source props.

The icon ledger includes the nine application icons added during preparation. DashboardSidebar maps the authoritative `Applications open#38:0` Boolean to the collapsible SidebarGroup's `open` field. Application membership and hrefs are explicit fixtures corresponding to the source shell's routes, selected through dynamically executed icon metadata; they are not inferred native URL properties. DashboardBrandHeader covers the recorded brand-based header node for topbar/centered layouts.

The templates follow the actual source contracts. Text strings are emitted through JSON string literals in JSX expressions, preserving quotes, newlines, braces and EN/ES text. Source variants use exhaustive `getEnum` maps for every reported option; axes lacking public source controls are still read and retained in metadata.

| Native detail                                                | Emitted source behavior                                                                                                                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button Icon / Show icon                                      | `getInstanceSwap` resolves the child dynamically. Icons are children of Button, never an `icon` prop. Loading uses Button's own spinner.                                                                       |
| Input Value                                                  | Maps to `placeholder` for the current native empty-input representation, not to entered form data.                                                                                                             |
| InputOTP Label                                               | First visual digit only; retained as visual metadata. The accessible name and complete OTP value are independent fixtures.                                                                                     |
| DatePicker / DateRangePicker Label                           | Formatted display text, retained as visual metadata. It is not parsed into a date and does not become the source label. Dates are explicit `Date` / `DateRange` fixtures.                                      |
| Carousel Label                                               | Visible slide-title content; the carousel's accessible name is independent.                                                                                                                                    |
| Tabs Label                                                   | Paragraph content inside TabsContent; Overview/Details names are separate fixtures.                                                                                                                            |
| FileUpload Label                                             | Maps to `labels.title`. Required browse, remove and validation messages are supplied separately.                                                                                                               |
| Avatar Initials                                              | A synthetic, letter-spaced `name` preserves up to two initials. Replace it with a real accessible name in a product. No `initials` prop is invented.                                                           |
| Hover, focus, internal popup/selection/playback/error states | Controlled only where a public source prop exists; otherwise documented in `intentionalVisualOnly` and metadata notes. For example, MultiSelect has no `disabled` prop and Carousel has no initial-index prop. |
| SidebarItem                                                  | Typed SidebarLink data consumed by Sidebar, not a fictitious exported SidebarItem component. Icon swaps and active state are preserved.                                                                        |
| DashboardHeader                                              | A composition of real source primitives, not a fictitious DashboardHeader export. The actual header is internal to DashboardShell.                                                                             |

Nested instances are executed only after checking `type === 'INSTANCE'`. Their structured result sections are interpolated through `figma.code`; section arrays are never string-concatenated or joined. Required child imports are propagated through `metadata.props.imports`. Missing instance connections are omitted, or use clearly documented local text/control fixtures when required by the source contract. Navigation data does not substitute guessed icons.

DashboardShell deliberately reads `getSlot('Content#30:0')` without forwarding that slot verbatim: the native Content region includes header chrome and Page content, while the source shell already renders its header. The template attempts to execute a genuine instance named **Page content**. A frame is not treated as an instance. If that lookup cannot produce code, the example emits a meaningful local page-body section with PageHeading. Neither the raw Content slot nor DashboardHeader is inserted again into shell children. This is a documented local preparation limit, not a claim that arbitrary native frame content has been mapped.

Examples provide all required props and handlers. Controlled examples define their own React state in a local fixture component; they do not reference undefined generic `value`, `setValue`, `open`, `save` or `columns` symbols. Data, option IDs, accessible names and callbacks absent from the ledger are explicit examples rather than extracted native properties. Use these expressions in a client TSX context with the emitted imports. Blocks that rely on Aureform's existing language/theme/demo providers retain that application-context requirement.

Run the portable generator and validator from the extracted kit root after installing dependencies:

```sh
python3 scripts/generate-code-connect.py
pnpm verify:code-connect
```

The validator uses a synthetic Figma API stub and the installed TypeScript/dependency types. It enumerates every reported axis cross-product, exercises missing and connected children, prepared icon swaps, error handles, quoted Unicode text and the shell's page-content fallback. It checks generated JSX against the actual source components and records the authoritative input hashes in the manifest.

The recorded result is **82 templates, 754 top-level cases, 239 variant combinations and 367 distinct typed emitted examples**, with **zero TypeScript 5.9.3 diagnostics**. There were 1,078 template evaluations, including 324 nested executions. Validation output is stored in `artifacts/code-connect-validation/`; the portable manifest retains its summary and source hashes.

**Live Figma template execution and cloud registration have not been performed.** This local validation is separate from the completed native design audit and browser verification. Future nestable registrations must agree with each template's `metadata.nestable`; the manifest preserves the parserless registration data.
