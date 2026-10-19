"use client";

import { Chart, type ChartDatum } from "@/components/ui/chart";

const data: ChartDatum[] = [
  { label: "May", value: 28000, secondary: 24000 },
  { label: "June", value: 34000, secondary: 28000 },
  { label: "July", value: 31000, secondary: 29000 },
  { label: "August", value: 38000, secondary: 32000 },
];
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function ChartExample() {
  return (
    <Chart
      kind="line"
      label="Illustrative monthly revenue comparison"
      valueLabel="Current period"
      secondaryLabel="Previous period"
      data={data}
      valueFormatter={(value) => currency.format(value)}
      className="w-full min-w-0"
    />
  );
}
