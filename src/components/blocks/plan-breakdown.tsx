import type { CSSProperties, ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
export function PlanBreakdown({
  title,
  description,
  items,
  footer,
}: {
  title: string;
  description: string;
  items: { name: string; value: string; percentage: number }[];
  footer?: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="border-b border-border/65">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6 pt-6">
        {items.map((item, index) => (
          <div
            key={item.name}
            style={
              {
                "--primary": `var(--chart-${(index % 5) + 1})`,
              } as CSSProperties
            }
          >
            <div className="mb-3 flex items-start justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2.5 font-medium">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full bg-primary"
                />
                {item.name}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {item.value}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Progress
                value={item.percentage}
                label={item.name}
                className="h-2 flex-1"
              />
              <span
                aria-hidden="true"
                className="w-9 shrink-0 text-right text-[11px] font-medium text-muted-foreground tabular-nums"
              >
                {Math.round(Math.min(100, Math.max(0, item.percentage)))}%
              </span>
            </div>
          </div>
        ))}
        {footer && (
          <div className="border-t border-border/65 pt-4 text-[13px]">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
