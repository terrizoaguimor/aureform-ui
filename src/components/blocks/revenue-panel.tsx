"use client";
import type { ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Chart, type ChartDatum, type ChartKind } from "@/components/ui/chart";
export function RevenuePanel({
  title,
  description,
  data,
  kind = "area",
  valueLabel,
  secondaryLabel,
  actions,
  label,
  valueFormatter,
}: {
  title: string;
  description: string;
  data: ChartDatum[];
  kind?: ChartKind;
  valueLabel: string;
  secondaryLabel?: string;
  actions?: ReactNode;
  label: string;
  valueFormatter?: (value: number) => string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 border-b border-border/65 pb-5">
        <div className="min-w-0 flex-1">
          <span aria-hidden="true" className="mb-3 flex gap-1.5">
            <span className="h-1 w-7 rounded-full bg-chart-1" />
            <span className="h-1 w-3 rounded-full bg-chart-2" />
            <span className="h-1 w-1 rounded-full bg-chart-3" />
          </span>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 pt-4 pb-5 sm:px-4">
        <Chart
          data={data}
          kind={kind}
          label={label}
          valueLabel={valueLabel}
          secondaryLabel={secondaryLabel}
          valueFormatter={valueFormatter}
        />
        <div className="mx-2 mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 rounded-lg border border-border/60 bg-surface-subtle/35 px-3 py-2.5 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-chart-1"
            />
            {valueLabel}
          </span>
          {secondaryLabel &&
            data.some((item) => item.secondary !== undefined) && (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-0.5 w-4 border-t-2 border-dashed border-chart-2"
                />
                {secondaryLabel}
              </span>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
