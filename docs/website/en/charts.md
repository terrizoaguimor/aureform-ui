# Charts

`Chart` is a source component for numeric visualization with Recharts and custom SVG views. It includes an accessible data-table alternative and palette-based colors. Install its dependencies and Aureform's global semantic styles before copying an example.

## Choose a chart kind

The current `ChartKind` contract has 13 values:

- Trends and comparisons: `area`, `line`, `bar`, `horizontal-bar`, `stacked-bar`, `stacked-area`, `diverging-bar`.
- Categories and progress: `pie`, `radar`, `radial`, `gauge`, `rings`.
- Grid intensity: `heatmap`.

Use signed values for a diverging comparison and meaningful domains for progress. Choose the kind to match your question rather than treating the demo's plotted shapes as real measurements.

## Render explicit numeric data

1. Install `chart` through the CLI or public registry.
2. Create a Client Component with your own `ChartDatum[]`.
3. Name the chart, series and units clearly.

```tsx
"use client";

import { Chart, type ChartDatum } from "@/components/ui/chart";

const data: ChartDatum[] = [
  { label: "May", value: 28, secondary: 24 },
  { label: "June", value: 34, secondary: 28 },
  { label: "July", value: 42, secondary: 31 },
];

export default function OrdersChart() {
  return (
    <Chart
      kind="bar"
      data={data}
      label="Fictional monthly order counts"
      valueLabel="Current orders"
      secondaryLabel="Previous orders"
      locale="en"
      legend
      height={280}
      valueFormatter={(value) => `${value} orders`}
    />
  );
}
```

These are fictional counts. `ChartDatum` requires `label` and numeric `value`; `secondary` and `tertiary` are optional. `tertiaryLabel` names a third series. `visibleSeries` accepts `value`, `secondary` and `tertiary` keys.

## Define domains and missing-data behavior

`maxValue` sets the progress goal, defaulting to 100; gauge/ring rendering clamps values to its visual range. `appearance` is `flat`, `gradient` or `glow`. The host supplies width while `height` sets the plotting area.

The primary value contract does not accept `null`. The current heatmap renders absent optional cells as zero; represent meaningful missingness explicitly in your surrounding UI or adapt the contract. Do not label an unknown observation as a measured zero.

## Preserve accessible context

Legend controls toggle plotted series or categories with keyboard-operable buttons. The screen-reader table retains supplied data, including hidden series. Visual formatters do not format that table's raw numbers; put units in labels and series headings.

Review narrow containers, both themes, translated labels and contrast after palette changes. The [chart guide](../../../docs/charts.md) includes fuller recipes and historical design scope; [`ChartProps`](../../../src/components/ui/chart.tsx) is the current API. See [Accessibility](accessibility.md) for integration review.
