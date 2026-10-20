# Public Lighthouse evidence

[Quality page](https://aureformui.com/en/quality/) · [Español](https://aureformui.com/es/quality/) · [Versioned snapshots](lighthouse/)

Aureform publishes loading audits as dated evidence for specific pages and
commits. This is a laboratory baseline, separate from real-user Core Web Vitals,
the application's behavioral tests, and manual accessibility review.

## First production snapshot

The [October 20, 2026 snapshot](lighthouse/production-39375951507-1/) contains
18 verified audits of commit
[`0caf7c8874ea8bb2b1580c0d59a9bda4497cbdd4`](https://github.com/terrizoaguimor/aureform-ui/commit/0caf7c8874ea8bb2b1580c0d59a9bda4497cbdd4).
The [successful audit job](https://github.com/terrizoaguimor/aureform-ui/actions/runs/39375951507)
used Node 24.21.0, Lighthouse 13.5.0 and Chromium 156.0.8078.4 on Ubuntu 24.04.
Raw reports preserve runner image `20261012.334.1` and kernel
`6.17.0-1022-azure`.

| Page                       | Mobile performance | Desktop performance |
| -------------------------- | -----------------: | ------------------: |
| Landing                    |                 93 |                 100 |
| Installation documentation |                 94 |                 100 |
| Demo dashboard             |                 40 |                  67 |

The dashboard has a substantially larger measured main-thread cost. Its raw
timings are simulated laboratory values; inspect the individual reports before
attributing the cost to a component or generalizing to other pages. The
dashboard's SEO median is 69 because the `is-crawlable` audit encounters the
intentional `noindex` policy. All categories and timings remain in the public
matrix rather than being reduced to the landing score badges.

## What is measured

| Page           | Production pathname      | Why this page                                                         |
| -------------- | ------------------------ | --------------------------------------------------------------------- |
| Landing        | `/en/`                   | Public introduction, previews, appearance and motion                  |
| Documentation  | `/en/docs/installation/` | Real article, search and documentation navigation                     |
| Demo dashboard | `/en/dashboard/`         | An application with mock records and heavier interactive dependencies |

Every snapshot has mobile and desktop profiles and three consecutive cold
browser runs for each page/profile: **18 runs**, with all four Lighthouse
categories. Scores use a 0–100 scale. FCP, LCP, Total Blocking Time and Speed Index
use milliseconds in the source; Cumulative Layout Shift is unitless.

The website and README show the median of the three values independently for
each category and metric. They do not select the best run. Because different
categories can have different median runs, an individual HTML report can differ
from the aggregate row. All three originals are available.

The dashboard is deliberately `noindex` because it contains fictional
application records. Its SEO result retains that condition. An accessibility
score describes the automated checks on an audited page; it is not a whole-kit
WCAG certification. Loading audits do not measure field INP or demonstrate
real-user Core Web Vitals.

## Toolchain and environment

Lighthouse **13.5.0** is installed from the independent, frozen lockfile in
`tools/lighthouse/`. The audit job uses Node **24**, with the Chromium supplied
by the repository's frozen Playwright installation. Audit tooling requires
Node 22.19 or later; the application retains its own Node 22.18 minimum.

Each published snapshot records Node, Lighthouse, Chrome and operating-system
versions, the target origin, creation time and exact source commit. Default
Lighthouse mobile and desktop presets define the device, network and CPU
simulation. The complete settings remain in every raw JSON report.

Runs are sequential, use fresh browser storage and do not supply credentials,
production OAuth, Stripe secrets or a Google Maps browser key. The public demo
is measured in its default configuration.

## Provenance and publication

The exported `build-info.json` identifies the production source commit and
package version. An audit checks it before and after every run. A dirty local
build, unknown commit, failed run or changed production deployment cannot
become a published complete snapshot.

The collector first writes ignored local artifacts. Reviewed evidence is then
imported under `docs/quality/lighthouse/<snapshot-id>/`, together with its
entry in `index.json`. Each run has full JSON and HTML and both SHA-256 hashes.
The export copies the same bytes to `/quality-reports/<snapshot-id>/`.
Reading the quality page does not run Lighthouse in the visitor's browser.

The `QualitySnapshot` interface contains date, source commit, package version,
target origin, toolchain, six page/profile result groups, median scores and
metrics, and the three report identities and hashes in each group. Raw results
are the evidence; the interface is their publication summary.

Adding reports creates a later repository commit. The snapshot continues to
identify the earlier **audited application commit**, rather than claiming that
the report publication commit was measured. Historical snapshots retain their
date, toolchain and source identity.

The GitHub audit workflow generates downloadable artifacts and a job summary.
It never pushes commits automatically. The initial pipeline validates evidence
integrity and reports scores; future performance regression budgets require a
recorded baseline and comparable environments.

## Repository and archive availability

The GitHub repository includes full reports. Production and GitHub Pages serve
the exported reports with the appropriate mount point. Raw report paths are
disallowed in `robots.txt`; Cloudflare also sends an `X-Robots-Tag: noindex,
nofollow` header for them. The localized quality pages are indexable.

Bulky raw reports are excluded from future source ZIPs so the reusable kit stays
within its existing distribution limit. Their summaries, tooling and public
links remain available. Existing v1.4.1 release assets and native design
checkpoints are immutable; publishing a quality snapshot does not replace or
recertify them.

## Interpreting and reproducing a result

Compare like profiles, pages, settings and environments. A production network
run can vary with routing, server load and machine conditions. Start from the
individual reports when investigating a regression, and record fresh evidence
after a change.

Use Node 24 and a checkout of the source commit already deployed to the public
origin. The collector refuses a different `build-info.json` identity. Install
both frozen dependency sets and the root pinned browser:

```bash
pnpm install --frozen-lockfile
pnpm --dir tools/lighthouse install --frozen-lockfile --ignore-scripts
pnpm exec playwright install --with-deps chromium
pnpm test:quality

AUDITED_COMMIT="$(git rev-parse HEAD)"
QUALITY_ID="manual-$(date -u +%Y%m%dt%H%M%sz)"
QUALITY_BUNDLE="artifacts/quality/lighthouse/$QUALITY_ID"

pnpm quality:collect \
  --source-commit "$AUDITED_COMMIT" \
  --origin https://aureformui.com \
  --id "$QUALITY_ID" \
  --output "$QUALITY_BUNDLE"
pnpm quality:verify \
  --bundle "$QUALITY_BUNDLE" \
  --source-commit "$AUDITED_COMMIT"
```

Review the summary and all reports before importing the bundle. Import and
README updates are explicit steps; neither creates a commit or deploys:

```bash
pnpm quality:import \
  --bundle "$QUALITY_BUNDLE" \
  --source-commit "$AUDITED_COMMIT"
pnpm quality:verify --require-reports
pnpm quality:readme
pnpm build
```

`pnpm build` generates build identity and exports the verified report bytes.
`pnpm quality:export --out out` can repeat that export after a completed build.
In a source ZIP without report directories, summary verification explicitly
reports its reduced scope and the quality page links to public report copies.
It does not claim to have verified missing raw bytes.

The same collection is available through the **Lighthouse quality** GitHub
workflow after successful production deployment or with an explicit source
commit. Normal kit installation and development do not install or run
Lighthouse.

See the primary [Lighthouse configuration and report documentation](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md)
and [Chrome's explanation of score variability](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).
