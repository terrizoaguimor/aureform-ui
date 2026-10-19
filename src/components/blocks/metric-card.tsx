import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
export type MetricCardProps = {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  note?: string;
  icon?: ReactNode;
  series?: number[];
  className?: string;
};
export function MetricCard({
  label,
  value,
  change,
  trend = "up",
  note,
  icon,
  series,
  className,
}: MetricCardProps) {
  const max = Math.max(1, ...(series ?? [])),
    min = Math.min(0, ...(series ?? []));
  const points = series
    ?.map(
      (n, i) =>
        `${(i / Math.max(1, series.length - 1)) * 72},${24 - ((n - min) / (max - min)) * 22}`,
    )
    .join(" ");
  return (
    <Card
      className={cn(
        "relative isolate overflow-hidden p-[var(--af-card-padding,24px)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--chart-1), var(--chart-2), transparent)",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 -z-10 size-40 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 12%, transparent), transparent 70%)",
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[13px] leading-5 font-medium text-muted-foreground">
          {label}
        </p>
        {icon && (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-accent/65 text-primary [&_svg]:size-4"
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-4 break-words text-[30px] leading-tight font-semibold tracking-[-1.2px] tabular-nums sm:text-[32px]">
        {value}
      </p>
      <div className="mt-4 flex min-h-7 flex-wrap items-center gap-x-2 gap-y-2">
        {change && (
          <Badge
            variant={trend === "up" ? "default" : "destructive"}
            className="px-2 py-0.5 text-[11px]"
          >
            {trend === "up" ? (
              <ArrowUpRight aria-hidden="true" />
            ) : (
              <ArrowDownRight aria-hidden="true" />
            )}
            {change}
          </Badge>
        )}
        {note && (
          <span className="text-[11px] leading-5 text-muted-foreground">
            {note}
          </span>
        )}
        {points && (
          <svg
            className="ml-auto h-8 w-20 shrink-0 text-primary"
            viewBox="0 0 72 30"
            fill="none"
            aria-hidden="true"
          >
            <polygon
              points={`0,30 ${points} 72,30`}
              fill="currentColor"
              opacity=".12"
            />
            <polyline
              points={points}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </Card>
  );
}
