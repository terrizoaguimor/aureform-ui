"use client";
import { useMemo } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, ChevronDown, X } from "lucide-react";
import { inputClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";
export type ComboboxOption = { value: string; label: string };
export function Combobox({
  options,
  value,
  onValueChange,
  label,
  placeholder,
  emptyLabel = "No options found",
  disabled,
  className,
  id,
}: {
  options: ComboboxOption[];
  value?: string | null;
  onValueChange: (value: string | null) => void;
  label: string;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const items = useMemo(
    () =>
      ComboboxPrimitive.createItems(options, {
        getValue: (o) => o.value,
        getLabel: (o) => o.label,
      }),
    [options],
  );
  return (
    <ComboboxPrimitive.Root
      items={items}
      value={value ?? null}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <ComboboxPrimitive.InputGroup className={cn("relative", className)}>
        <ComboboxPrimitive.Input
          id={id}
          aria-label={label}
          placeholder={placeholder}
          className={cn(inputClasses, "pr-16")}
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          <ComboboxPrimitive.Clear
            aria-label={label}
            className="rounded p-1 text-muted-foreground"
          >
            <X className="size-3" />
          </ComboboxPrimitive.Clear>
          <ComboboxPrimitive.Trigger
            aria-label={label}
            className="rounded p-1 text-muted-foreground"
          >
            <ChevronDown className="size-3.5" />
          </ComboboxPrimitive.Trigger>
        </div>
      </ComboboxPrimitive.InputGroup>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={6} className="z-70">
          <ComboboxPrimitive.Popup className="min-w-(--anchor-width) max-h-72 overflow-auto rounded-lg border border-border bg-surface p-1 text-foreground shadow-lg">
            <ComboboxPrimitive.Empty className="p-4 text-xs text-muted-foreground">
              {emptyLabel}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(option: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="flex items-center justify-between gap-4 rounded-md px-3 py-2 text-xs outline-none data-highlighted:bg-accent"
                >
                  {option.label}
                  <ComboboxPrimitive.ItemIndicator>
                    <Check className="size-3.5" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
