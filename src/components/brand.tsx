import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function AureformMark({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      className={cn("size-7", className)}
      {...props}
    >
      <path d="M4 28 14 4h5L9 28H4Z M21 12l7 16h-5l-5-11 3-5Z M11 21h8l2 4H9l2-4Z" />
    </svg>
  );
}
export function Brand({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-foreground",
        className,
      )}
    >
      <AureformMark className="size-7 text-primary" />
      {!compact && (
        <span className="text-[21px] font-semibold tracking-[-0.8px]">
          aureform
          {" "}
          <span className="ml-1 text-xs font-normal tracking-normal text-muted-foreground">
            ui
          </span>
        </span>
      )}
    </span>
  );
}
