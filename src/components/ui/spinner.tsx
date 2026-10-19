import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
export function Spinner({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <LoaderCircle
        className="size-4 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
