"use client";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClasses } from "@/components/ui/input";
export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  label,
  className,
  name,
  disabled,
  ...aria
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      items={options}
      value={value}
      defaultValue={defaultValue}
      name={name}
      disabled={disabled}
      onValueChange={(v) => {
        if (v !== null) onValueChange?.(v);
      }}
    >
      {label && (
        <SelectPrimitive.Label className="mb-2 block text-xs font-semibold">
          {label}
        </SelectPrimitive.Label>
      )}
      <SelectPrimitive.Trigger
        className={cn(
          inputClasses,
          "items-center justify-between gap-3",
          className,
        )}
        {...aria}
      >
        <SelectPrimitive.Value
          placeholder={placeholder}
          className="min-w-0 truncate whitespace-nowrap"
        />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-3.5 opacity-60" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-70"
        >
          <SelectPrimitive.Popup className="min-w-(--anchor-width) max-h-80 overflow-auto rounded-lg border border-border bg-surface p-1 text-[13px] text-foreground shadow-lg">
            <SelectPrimitive.List>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="flex cursor-default items-center justify-between gap-6 rounded-md px-3 py-2 outline-none data-highlighted:bg-accent data-disabled:opacity-40"
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-3.5" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
