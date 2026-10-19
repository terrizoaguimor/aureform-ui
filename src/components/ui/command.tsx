"use client";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export type CommandItem = {
  id: string;
  label: string;
  group?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  keywords?: string[];
};
export function Command({
  open,
  onOpenChange,
  items,
  label,
  placeholder,
  emptyLabel,
  closeLabel,
  search,
  onSearchChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  label: string;
  placeholder: string;
  emptyLabel: string;
  closeLabel?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
}) {
  const groups = [...new Set(items.map((item) => item.group ?? ""))];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0" closeLabel={closeLabel}>
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <DialogDescription className="sr-only">{placeholder}</DialogDescription>
        <CommandPrimitive label={label}>
          <div className="flex items-center gap-3 border-b border-border px-5 pr-12">
            <Search className="size-4 text-muted-foreground" />
            <CommandPrimitive.Input
              value={search}
              onValueChange={onSearchChange}
              placeholder={placeholder}
              className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <CommandPrimitive.List className="max-h-[min(60vh,400px)] overflow-y-auto p-2">
            <CommandPrimitive.Empty className="p-8 text-center text-xs text-muted-foreground">
              {emptyLabel}
            </CommandPrimitive.Empty>
            {groups.map((group) => (
              <CommandPrimitive.Group
                key={group}
                heading={group || undefined}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {items
                  .filter((item) => (item.group ?? "") === group)
                  .map((item) => (
                    <CommandPrimitive.Item
                      key={item.id}
                      value={item.label}
                      keywords={item.keywords}
                      onSelect={() => {
                        item.onSelect();
                        onOpenChange(false);
                      }}
                      className="flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-xs aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg]:size-4"
                    >
                      {item.icon}
                      {item.label}
                    </CommandPrimitive.Item>
                  ))}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
