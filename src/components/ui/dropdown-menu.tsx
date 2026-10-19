"use client";
import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";
export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuGroup = MenuPrimitive.Group;
export function DropdownMenuContent({
  children,
  className,
  align = "end",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} sideOffset={6} className="z-70">
        <MenuPrimitive.Popup
          className={cn(
            "min-w-44 rounded-lg border border-border bg-surface p-1.5 text-foreground shadow-lg outline-none",
            className,
          )}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}
export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: Omit<React.ComponentProps<typeof MenuPrimitive.Item>, "className"> & {
  className?: string;
  destructive?: boolean;
}) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex cursor-default items-center gap-2 rounded-md px-3 py-2 text-xs outline-none data-highlighted:bg-surface-subtle [&_svg]:size-3.5",
        destructive && "text-destructive-foreground",
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuSeparator() {
  return <MenuPrimitive.Separator className="my-1 h-px bg-border" />;
}
export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <MenuPrimitive.GroupLabel className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </MenuPrimitive.GroupLabel>
  );
}
