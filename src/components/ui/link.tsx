import type { ComponentProps } from "react";
import { publicPath } from "@/lib/public-path";
import { cn } from "@/lib/utils";
export function TextLink({ className, href, ...props }: ComponentProps<"a">) {
  return (
    <a
      href={href === undefined ? undefined : publicPath(href)}
      className={cn(
        "font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}
