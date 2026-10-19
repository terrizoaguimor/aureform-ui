import { cn } from "@/lib/utils";
export function Progress({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const percentage =
    max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(0, value))}
      className={cn(
        "h-1.5 overflow-hidden rounded-full bg-surface-subtle",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
