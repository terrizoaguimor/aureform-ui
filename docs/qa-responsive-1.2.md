# Aureform 1.2 — SaaS responsive and gallery preview QA

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

Status: **72/72 responsive cases PASS, 12/12 preview assets verified, and 2/2 gallery mode checks PASS.** The production run recorded zero uncaught browser errors, zero horizontal document overflow and zero horizontal control clipping outside an intentional internal scroll container.

This evidence is separate from the accepted [DataWorkbench 12-case production QA](qa-table-1.2.md). No additional browser execution was performed for the screenshot review documented here.

## Production checkpoint

| Field | Actual value |
| --- | --- |
| Target | `http://127.0.0.1:3012` |
| Run label | `owner-final-20261019T1456` |
| Started / finished | `2026-10-19T14:54:03.815Z` / `2026-10-19T14:54:34.125Z` |
| Production build | `BTAW6zd9K-Lz9R_XmVIOo` |
| Chromium | `155.0.8059.79` |
| Source checkpoint | All 19 source/build fingerprints equal before and after execution |
| Report SHA-256 | `74fcedd432405ebda1bef16fb50077ad5199aa52109be2ec87d7ce930fc288e8` |

The final report is [report.json](/tmp/aureform-saas-responsive-1.2-qa/owner-final-20261019T1456/report.json). It retains every case, screenshot hash, resolved appearance, measured geometry, preview byte receipt and source fingerprint.

## Exact matrix scope

**6 routes × 2 locales × 2 themes × 3 widths = 72 cases.** Every case used a 900px viewport height and DPR 1.

| Route | Initial state | Cases | Cases with intentional internal horizontal scrolling |
| --- | --- | --- | --- |
| `onboarding` | Organization form, step 1 | 12 | 0 |
| `settings/workspace` | Current workspace settings form | 12 | 4 |
| `settings/team` | Current members and invitations | 12 | 4 |
| `customers` | First customer page and Workbench toolbar | 12 | 8 |
| `customers/detail/?id=cus-001` | Olivia Rhye overview | 12 | 4 |
| `imports` | Initial CSV file selection | 12 | 0 |

Locales were **EN and ES**; themes were **Light and Dark**; widths were **360, 768 and 1440px**. Each isolated browser context started with the local demo owner workspace.

Aurora, Violet, Ocean, Mint, Ember and Rose each appear in **12 cases**. The palette index is `(routeIndex + widthIndex + 3*localeIndex + 2*themeIndex) % 6`. Each route receives each palette twice. This is a balanced palette distribution within the 72-case matrix; it does **not** cover the 432-case full palette cross product.

The harness uses the real `createAppearance` presets, stored preferences and provider hydration. It checks the stored configuration, root theme/palette/typography, color scheme, resolved background/surface/primary/secondary/tertiary tokens and loaded Manrope font. It does not substitute CSS overrides. Native `prefers-reduced-motion: reduce` was enabled for stable captures; the stored preset otherwise retains its real defaults.

## Geometry and visual findings

All 72 cases passed viewport-width, document-width and main-content horizontal bounds checks. The maximum measured document overflow was **0px**, and every case had an empty clipped-control list. Horizontal measurements include visible headings, labels and controls throughout the rendered document.

Twenty cases retain intentional horizontal scrolling inside the customer table or settings/detail tabs. Their scroll container stays within the page; these are distinct from document overflow. This matrix records that containment and does not claim to exercise every scroll interaction.

Codex agent visual inspection covered all 72 initial 900px viewports through twelve contact sheets, all twelve gallery preview images, and these three original full-page mobile captures:

- [Team, ES Light, 360px](/tmp/aureform-saas-responsive-1.2-qa/owner-final-20261019T1456/screens/settings-team-es-light-360.png)
- [Workspace, ES Dark, 360px](/tmp/aureform-saas-responsive-1.2-qa/owner-final-20261019T1456/screens/settings-workspace-es-dark-360.png)
- [Customer detail, ES Dark, 360px](/tmp/aureform-saas-responsive-1.2-qa/owner-final-20261019T1456/screens/customers-detail-es-dark-360.png)

At 360px, the sidebar becomes a compact header, forms and metrics stack, action groups wrap, and long Spanish headings remain contained. At 768px, forms and cards use the available columns while the customer toolbar wraps. At 1440px, the expanded sidebar and wider layouts remain consistent across themes and palettes. Long contact addresses wrap within mobile cards; tab strips and tables preserve their internal scroll behavior.

The previews show the actual 1.2 workspace controls, current customer Workbench and team forms. Manrope headings, grouped surfaces and restrained gradients remain coherent between Light and Dark. No additional overlap, broken preview, placeholder or mode mismatch was found in the reviewed images.

This is **Codex agent visual inspection; not an automated pixel verdict**. All original full-page screenshots remain available, but only the three full-page captures listed above received additional below-fold visual inspection.

## Twelve real gallery previews

Each preview was captured from the production **EN route in Aurora**, once in Light and once in Dark, at **1440 × 900px**, then encoded as **960 × 600px WebP** with quality 84. These are first-viewport thumbnails; they do not attempt to show an entire long page.

| Route | Light source asset | Dark source asset |
| --- | --- | --- |
| Onboarding | [onboarding.webp](../public/previews/light/onboarding.webp) | [onboarding.webp](../public/previews/onboarding.webp) |
| Workspace | [settings-workspace.webp](../public/previews/light/settings-workspace.webp) | [settings-workspace.webp](../public/previews/settings-workspace.webp) |
| Team | [settings-team.webp](../public/previews/light/settings-team.webp) | [settings-team.webp](../public/previews/settings-team.webp) |
| Customers | [customers.webp](../public/previews/light/customers.webp) | [customers.webp](../public/previews/customers.webp) |
| Customer detail | [customers-detail.webp](../public/previews/light/customers-detail.webp) | [customers-detail.webp](../public/previews/customers-detail.webp) |
| Imports | [imports.webp](../public/previews/light/imports.webp) | [imports.webp](../public/previews/imports.webp) |

All twelve requests returned **HTTP 200** with **`image/webp`**. Every served SHA-256 equals the corresponding source asset under `public/previews` and the runtime copy under `out/previews`. The assets are 23,382–29,578 bytes. Existing customer/team previews were refreshed alongside the eight previously missing assets; prior bytes are retained in the run's preview backups.

The two additional gallery checks visited `/en/templates/` in Aurora Light and Dark at 1440px. Each verified all six selected images loaded, retained the expected mode-specific source and linked to the correct route, including customer detail `?id=cus-001`. Both had zero uncaught browser errors. These two checks are counted separately from the 72 responsive cases.

## Evidence and reproduction

The evidence directory is `/tmp/aureform-saas-responsive-1.2-qa/owner-final-20261019T1456/`:

- `report.json`: complete production results and before/after source hashes.
- `screens/`: 72 original full-page PNGs, each referenced and hashed in the report.
- [previews/manifest.json](/tmp/aureform-saas-responsive-1.2-qa/owner-final-20261019T1456/previews/manifest.json): twelve PNG/WebP capture pairs, asset receipts and prior-file backups.
- [preview-contact-review.png](/tmp/aureform-saas-responsive-1.2-qa/owner-final-20261019T1456/preview-contact-review.png): the twelve reviewed thumbnails.
- [review/contacts.json](/tmp/aureform-saas-responsive-1.2-qa/owner-final-20261019T1456/review/contacts.json): all 72 case IDs and their twelve first-viewport contact sheets.
- [review/visual-review.json](/tmp/aureform-saas-responsive-1.2-qa/owner-final-20261019T1456/review/visual-review.json): this agent's bounded visual inspection, linked to the original report hash.

The owner executed `scripts/qa-saas-responsive-1.2.mjs` against the existing production server. A future authorized reproduction must use a new run label to preserve this evidence:

```bash
cd /tmp/aureform-ui-1.2
AUREFORM_QA_RUN=new-evidence-label \
  AUREFORM_BASE_URL=http://127.0.0.1:3012 \
  node --experimental-strip-types scripts/qa-saas-responsive-1.2.mjs
```

The script captures and updates these twelve preview assets before checking the gallery and responsive matrix. It does not start, restart or build the server. The earlier `owner-final-20261019T1455` attempt stopped before matrix cases because the harness used incorrect secondary/tertiary token names. The owner corrected those harness assertions to `--af-color-secondary` and `--af-color-tertiary`; no product change was required.

This run covers the listed initial page states. It does not establish all lifecycle, dialog, permission or error states, a complete WCAG audit, or motion behavior with reduced motion disabled. Functional Workbench and scoped accessibility evidence remains in the separate accepted 12-case report; motion and integrated-flow verification belongs to the owner's separate runs.
