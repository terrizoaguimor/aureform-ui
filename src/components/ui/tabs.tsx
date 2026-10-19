"use client";
import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";
export const Tabs = TabsPrimitive.Root;
export function TabsList({
  className,
  ...props
}: Omit<React.ComponentProps<typeof TabsPrimitive.List>, "className"> & {
  className?: string;
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-surface-subtle/65 p-1",
        className,
      )}
      {...props}
    />
  );
}
export function TabsTrigger({
  className,
  ...props
}: Omit<React.ComponentProps<typeof TabsPrimitive.Tab>, "className"> & {
  className?: string;
}) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground outline-none transition-[color,background-color,border-color,box-shadow] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:border-primary/25 data-active:bg-surface data-active:font-semibold data-active:text-primary data-active:shadow-xs data-disabled:pointer-events-none data-disabled:opacity-45 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
export function TabsContent({
  className,
  ...props
}: Omit<React.ComponentProps<typeof TabsPrimitive.Panel>, "className"> & {
  className?: string;
}) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "mt-5 min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}
