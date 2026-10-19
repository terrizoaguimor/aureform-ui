"use client";
import * as React from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
export const Accordion = AccordionPrimitive.Root;
export function AccordionItem({
  className,
  ...props
}: Omit<React.ComponentProps<typeof AccordionPrimitive.Item>, "className"> & {
  className?: string;
}) {
  return (
    <AccordionPrimitive.Item
      className={cn("border-b border-border", className)}
      {...props}
    />
  );
}
export function AccordionTrigger({
  children,
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof AccordionPrimitive.Trigger>,
  "className"
> & { className?: string }) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
export function AccordionContent({
  className,
  ...props
}: Omit<React.ComponentProps<typeof AccordionPrimitive.Panel>, "className"> & {
  className?: string;
}) {
  return (
    <AccordionPrimitive.Panel
      className={cn(
        "pb-5 text-sm leading-relaxed text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
