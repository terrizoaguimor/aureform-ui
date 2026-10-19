"use client";
import { useMemo } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, X } from "lucide-react";
import type { ComboboxOption } from "@/components/ui/combobox";
export function MultiSelect({
  options,
  value,
  onValueChange,
  label,
  placeholder,
  emptyLabel = "No options found",
  removeLabel = "Remove",
  keyboardHint = "Press Backspace or Delete to remove",
}: {
  options: ComboboxOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  label: string;
  placeholder?: string;
  emptyLabel?: string;
  removeLabel?: string;
  keyboardHint?: string;
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
      multiple
      value={value}
      onValueChange={onValueChange}
    >
      <ComboboxPrimitive.InputGroup className="rounded-md border border-border bg-surface px-2 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
        <ComboboxPrimitive.Value>
          {(selected: string[]) => (
            <ComboboxPrimitive.Chips
              className="flex flex-wrap items-center gap-1.5"
              aria-label={label}
            >
              {selected.map((v) => (
                <ComboboxPrimitive.Chip
                  key={v}
                  aria-description={keyboardHint}
                  className="flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs text-accent-foreground"
                >
                  {options.find((o) => o.value === v)?.label ?? v}
                  <ComboboxPrimitive.ChipRemove
                    aria-label={`${removeLabel} ${options.find((o) => o.value === v)?.label ?? v}`}
                  >
                    <X className="size-3" />
                  </ComboboxPrimitive.ChipRemove>
                </ComboboxPrimitive.Chip>
              ))}
              <ComboboxPrimitive.Input
                aria-label={label}
                aria-description={keyboardHint}
                placeholder={selected.length ? "" : placeholder}
                className="h-6 min-w-24 flex-1 bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground"
              />
            </ComboboxPrimitive.Chips>
          )}
        </ComboboxPrimitive.Value>
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
