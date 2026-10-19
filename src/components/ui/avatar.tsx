"use client";
import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { publicPath } from "@/lib/public-path";
import { cn } from "@/lib/utils";
export function Avatar({
  name,
  src,
  className,
  size = "md",
}: {
  name: string;
  src?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <AvatarPrimitive.Root
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent font-semibold text-accent-foreground",
        size === "sm"
          ? "size-6 text-[9px]"
          : size === "lg"
            ? "size-12 text-base"
            : "size-9 text-xs",
        className,
      )}
    >
      {src && (
        <AvatarPrimitive.Image
          src={publicPath(src)}
          alt=""
          className="size-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback>
        {name
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase()}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
