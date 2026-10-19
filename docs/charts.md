# Aureform charts

The frozen 1.1 source and recorded native library each have 13 chart kinds. Current Chart/browser QA, final state-bound local Code Connect and the scoped native Chart PNG review pass. The actual 65-view native structural audit also passes against frozen state. The suite still has 64 routes plus the landing and 44 core families; additional chart kinds extend the existing `Chart` family.

## Reference and source acknowledgment

The visual reference is [Full charts components by Frank Esteban Isdray](https://dribbble.com/shots/18624777-Full-charts-components). The author’s page links to the [original Figma community file](https://www.figma.com/community/file/1039326385370619352). The user supplied [this Figma design reference](https://www.figma.com/design/vtuBNxwqC3BZk5T9fHU7WG).

The owner’s inspection of the supplied design found a Cover and a raster image (`25:5447`). That image informed the review of chart cards, category comparisons, stacked series, rings and compact numeric summaries. Aureform’s chart implementation is independent React/Recharts source. No third-party screenshot, artwork, avatar or editable original component is distributed, and this handoff does not claim an editable import of the original library.

## Kinds and compatibility

The six existing APIs remain `area`, `line`, `bar`, `pie`, `radar` and `radial`. Native Donut continues to map to source `pie`.

| Additional source kind | Intended use                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `horizontal-bar`       | Compare categories with labels beside the bars.              |
| `stacked-bar`          | Compare totals and the series that contribute to each total. |
| `stacked-area`         | Show cumulative series over ordered categories.              |
| `diverging-bar`        | Compare signed values around a zero baseline.                |
| `gauge`                | Present one progress or completion measure.                  |
| `rings`                | Present several measures with concentric rings.              |
| `heatmap`              | Show value intensity in a compact grid.                      |

These additions bring the source contract to 13 kinds. Exact behavior comes from the exported `ChartKind` and implementation, rather than the reference image. All 13 native Kind variants are recorded in [the actual Chart library receipt](../.figma/native-charts-1.1.json); the original six variant IDs remain intact.

## Complete usage with the preserved API

Use a host that includes Aureform’s global styles and fonts, such as the CLI starter. This example uses the existing `bar` API and can be saved as a client component.

```tsx
"use client";

import { Chart, type ChartDatum } from "@/components/ui/chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const data: ChartDatum[] = [
  { label: "May", value: 28, secondary: 24 },
  { label: "June", value: 34, secondary: 28 },
  { label: "July", value: 42, secondary: 31 },
];

export default function ChartExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart
          kind="bar"
          data={data}
          label="Monthly current and previous values"
          valueLabel="Current"
          secondaryLabel="Previous"
          height={280}
          valueFormatter={(value) => `${value} units`}
        />
      </CardContent>
    </Card>
  );
}
```

For an existing configured host, copy the source dependencies with `node bin/aureform.mjs add chart card --cwd ../my-product`, then run its package manager. The registry and CLI follow local imports; there is no chart data service included.

## Data and appearance

`label` names each data row, `value` is its primary numeric measure, and `secondary` and `tertiary` are optional numeric series. Name those series with `valueLabel`, `secondaryLabel` and `tertiaryLabel`. The source also exposes `visibleSeries`, `legend`, `maxValue`, `locale` and `appearance` (`flat`, `gradient` or `glow`). Do not treat the reference image's plotted marks as data.

Use signed values for `diverging-bar`. Choose meaningful units and domains for progress charts; a visual percentage is not a backend measurement. The frozen implementation defines gauge/ring normalization and heatmap layout. Missing optional series should remain absent rather than being fabricated as zero.

Charts use Aureform’s semantic palette variables. Select a palette and Light/Dark through the appearance provider or Studio, and keep the kit styles in the host. Use an [appearance scope](appearance.md) for an isolated example. Recheck labels, legends and contrast after changing colors; the original reference’s dark appearance does not establish Light-theme accessibility.

## Accessibility and native handoff

Keep a descriptive `Chart.label`, useful series names and the source’s data-table alternative. Verify both languages, Light/Dark, narrow containers, keyboard access and OS reduced motion against the final implementation. Source examples use explicit fictional data.

Code Connect derives its chart kind contract from source and maps all 13 owner-recorded native Kind values, with Donut → `pie`. It type checks each declared kind, numeric tertiary fixtures and signed diverging data. Show legend maps to `legend`, Glow to `appearance` (`glow`/`flat`), and Series 1–3 to `visibleSeries`. Show data and Category 1–6 remain visual-only metadata because those native toggles have no public configuration prop; the accessible data table remains source-owned. [Exact definitions](../.figma/code-connect/Chart.native-definitions-1.1.json) and [the local checkpoint](../.figma/code-connect/validation/chart13-checkpoint-1.1.json) retain all 12 Boolean keys/defaults and 338 scoped Boolean cases.

The application/registry are frozen, the owner reports fresh/deep actual-browser Chart checks passing, and the final bilingual route matrix passes 780/780. [Final native Chart review](../.figma/proofs/charts-1.1/owner-visual-review.json) passes after legend-wrap and October-axis corrections. Final local CC and the accepted 65-view native structural audit bind the same frozen state. Docs-only coverage and shipping docs use those final records; new archive verification and private publication remain delivery gates. The local templates remain unpublished to Code Connect cloud. See [the release checklist](release-checklist-1.1.md), [owner handoff](handoff-1.1.md) and [verification status](verification.md).
