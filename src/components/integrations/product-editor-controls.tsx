"use client";

import { useEffect, useId, useRef, type ReactElement, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { Toolbar } from "@base-ui/react/toolbar";
import { Check, Slash } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProductEditorAction = {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  /** Omit for commands which are not formatting toggles. */
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
};

export type ProductEditorBlockCommand = ProductEditorAction & {
  description?: string;
};

export type ProductEditorControlsProps = {
  actions: readonly ProductEditorAction[];
  blockCommands?: readonly ProductEditorBlockCommand[];
  disabled?: boolean;
  locale?: "en" | "es";
  className?: string;
  /** A binding can open this menu when "/" is typed in an empty block. */
  blockMenuOpen?: boolean;
  onBlockMenuOpenChange?: (open: boolean) => void;
};

/** Presentation only: every edit is an explicit command supplied by the host. */
export function ProductEditorControls({
  actions,
  blockCommands = [],
  disabled = false,
  locale = "en",
  className,
  blockMenuOpen,
  onBlockMenuOpenChange,
}: ProductEditorControlsProps) {
  return (
    <Toolbar.Root
      disabled={disabled}
      aria-label={locale === "es" ? "Formato del documento" : "Document formatting"}
      data-product-editor-controls
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface-subtle/50 p-2",
        className,
      )}
    >
      {actions.map((action) => (
        <Toolbar.Button
          key={action.id}
          type="button"
          data-editor-command={action.id}
          aria-pressed={action.active}
          disabled={disabled || action.disabled}
          focusableWhenDisabled={false}
          className={cn(
            buttonVariants({ variant: action.active ? "secondary" : "ghost", size: "sm" }),
            "max-w-full whitespace-normal",
          )}
          // Pointer formatting must preserve the editor's selected text.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!disabled && !action.disabled) action.onSelect();
          }}
          title={action.shortcut ? `${action.label} · ${action.shortcut}` : undefined}
        >
          {action.icon && <span aria-hidden className="contents">{action.icon}</span>}
          <span>{action.label}</span>
        </Toolbar.Button>
      ))}
      {blockCommands.length > 0 && (
        <ProductEditorSlashMenu
          commands={blockCommands}
          disabled={disabled}
          locale={locale}
          open={blockMenuOpen}
          onOpenChange={onBlockMenuOpenChange}
          renderTrigger={
            <Toolbar.Button
              type="button"
              focusableWhenDisabled={false}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            />
          }
        />
      )}
    </Toolbar.Root>
  );
}

export type ProductEditorSlashMenuProps = {
  commands: readonly ProductEditorBlockCommand[];
  disabled?: boolean;
  locale?: "en" | "es";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderTrigger?: ReactElement;
};

/** Base UI supplies arrow keys, typeahead, Escape and disabled-item handling. */
export function ProductEditorSlashMenu({
  commands,
  disabled = false,
  locale = "en",
  open,
  onOpenChange,
  renderTrigger,
}: ProductEditorSlashMenuProps) {
  const selected = useRef(false);
  const triggerId = useId();
  const label = locale === "es" ? "Insertar bloque" : "Insert block";
  return (
    <Menu.Root
      open={open}
      triggerId={open === undefined ? undefined : triggerId}
      disabled={disabled}
      onOpenChange={(next) => {
        if (next) selected.current = false;
        onOpenChange?.(next);
      }}
    >
      <Menu.Trigger
        id={triggerId}
        disabled={disabled || !commands.some((command) => !command.disabled)}
        render={renderTrigger ?? <Button variant="outline" size="sm" />}
        aria-label={label}
        data-product-editor-slash-trigger
      >
        <Slash aria-hidden className="size-4" />
        {label}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={6} className="z-70 max-w-[calc(100vw-2rem)]">
          <Menu.Popup
            aria-label={label}
            data-product-editor-slash-menu
            // A selected callback focuses the SDK editor. Escape still returns
            // to the trigger, while selecting a command retains that editor focus.
            finalFocus={() => !selected.current}
            className="max-h-[min(24rem,70dvh)] w-72 max-w-full overflow-y-auto rounded-xl border border-border bg-surface p-1.5 text-foreground shadow-lg outline-none"
          >
            {commands.map((command) => (
              <Menu.Item
                key={command.id}
                label={command.label}
                disabled={disabled || command.disabled}
                data-editor-command={command.id}
                className="flex min-w-0 cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-xs outline-none data-disabled:opacity-45 data-highlighted:bg-accent data-highlighted:text-accent-foreground [@media(pointer:coarse)]:min-h-11 [&_svg]:size-4 [&_svg]:shrink-0"
                onClick={() => {
                  if (disabled || command.disabled) return;
                  selected.current = true;
                  command.onSelect();
                }}
              >
                {command.icon && <span aria-hidden>{command.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block wrap-break-word font-medium">{command.label}</span>
                  {command.description && (
                    <span className="mt-1 block wrap-break-word text-[11px] leading-5 text-muted-foreground">
                      {command.description}
                    </span>
                  )}
                </span>
                {command.active && <Check aria-hidden />}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export type ProductEditorBlockCommandsProps = {
  commands: readonly ProductEditorBlockCommand[];
  /** A native suggestion controller owns filtering and keyboard navigation. */
  selectedIndex?: number;
  disabled?: boolean;
  locale?: "en" | "es";
  id?: string;
  className?: string;
};

/** Reusable suggestion list; command callbacks can delegate to a native controller. */
export function ProductEditorBlockCommands({
  commands,
  selectedIndex,
  disabled = false,
  locale = "en",
  id,
  className,
}: ProductEditorBlockCommandsProps) {
  const generatedId = useId();
  const listId = id ?? generatedId;
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedIndex === undefined) return;
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [selectedIndex]);
  if (!commands.length) {
    return <p role="status" className="p-3 text-xs text-muted-foreground">{locale === "es" ? "No hay bloques coincidentes." : "No matching blocks."}</p>;
  }
  return (
    <div
      ref={list}
      id={listId}
      role="listbox"
      aria-label={locale === "es" ? "Comandos de bloque" : "Block commands"}
      data-product-editor-block-commands
      className={cn(
        "grid max-h-[min(24rem,70dvh)] w-72 max-w-[calc(100vw-2rem)] gap-1 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 text-foreground shadow-lg",
        className,
      )}
    >
      {commands.map((command, index) => (
        <Button
          key={command.id}
          id={`${listId}-${index}`}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          data-editor-command={command.id}
          tabIndex={selectedIndex === undefined ? 0 : -1}
          variant={index === selectedIndex ? "secondary" : "ghost"}
          disabled={disabled || command.disabled}
          className="h-auto min-h-10 w-full justify-start whitespace-normal px-3 py-2.5 text-left"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!disabled && !command.disabled) command.onSelect();
          }}
        >
          {command.icon && <span aria-hidden className="contents">{command.icon}</span>}
          <span className="min-w-0">
            <span className="block wrap-break-word">{command.label}</span>
            {command.description && <span className="mt-1 block wrap-break-word text-[11px] font-normal leading-5 text-muted-foreground">{command.description}</span>}
          </span>
        </Button>
      ))}
    </div>
  );
}
