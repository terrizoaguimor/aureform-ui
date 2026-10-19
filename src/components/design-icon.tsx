import type { CSSProperties } from "react";
import { publicPath } from "@/lib/public-path";
import { cn } from "@/lib/utils";
export type DesignIconName =
  | "bell"
  | "moon"
  | "search"
  | "layout-dashboard"
  | "chart"
  | "sparkles"
  | "users"
  | "layers"
  | "book-open"
  | "settings";
/** Exact, editable Figma exports. A mask retains semantic theme color. */
export function DesignIcon({
  name,
  className,
}: {
  name: DesignIconName;
  className?: string;
}) {
  const style: CSSProperties = {
    mask: `url(${publicPath(`/assets/figma/${name}.svg`)}) center / contain no-repeat`,
    WebkitMask: `url(${publicPath(`/assets/figma/${name}.svg`)}) center / contain no-repeat`,
    backgroundColor: "currentColor",
  };
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-4 shrink-0", className)}
      style={style}
    />
  );
}
