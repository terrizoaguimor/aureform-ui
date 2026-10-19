"use client";
import { publicPath } from "@/lib/public-path";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export type SidebarLink = {
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: ReactNode;
  active?: boolean;
};
export type SidebarGroup = {
  label: string;
  items: SidebarLink[];
  collapsible?: boolean;
  open?: boolean;
};
export function Sidebar({
  brand,
  workspace,
  groups,
  footer,
  className,
  onNavigate,
  label = "Main navigation",
  compact = false,
}: {
  brand: ReactNode;
  workspace?: ReactNode;
  groups: SidebarGroup[];
  footer?: ReactNode;
  className?: string;
  onNavigate?: () => void;
  label?: string;
  compact?: boolean;
}) {
  const list = (items: SidebarLink[]) => (
    <ul className="grid gap-0.5">
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={publicPath(item.href)}
            onClick={onNavigate}
            aria-current={item.active ? "page" : undefined}
            title={compact ? item.label : undefined}
            className={cn(
              "group flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              item.active && "bg-accent text-accent-foreground",
              compact && "justify-center px-2",
            )}
          >
            <span className="shrink-0 [&_svg]:size-4">{item.icon}</span>
            <span className={compact ? "sr-only" : "min-w-0 flex-1"}>
              {item.label}
            </span>
            {!compact && item.badge}
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <aside
      className={cn(
        "flex h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface",
        compact && "w-[76px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-[76px] shrink-0 items-center px-6",
          compact && "justify-center px-3",
        )}
      >
        {brand}
      </div>
      {workspace && <div className="px-4 pb-5">{workspace}</div>}
      <nav
        aria-label={label}
        className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6"
      >
        {groups.map((group) =>
          group.collapsible ? (
            <details
              key={group.label}
              open={group.open || undefined}
              className="group mb-5"
            >
              <summary
                className={cn(
                  "mb-2 flex list-none items-center justify-between px-3 text-[9px] font-semibold uppercase tracking-[.13em] text-muted-foreground",
                  compact && "hidden",
                )}
              >
                {group.label}
                <span className="text-xs transition-transform group-open:rotate-90">
                  ›
                </span>
              </summary>
              {list(group.items)}
            </details>
          ) : (
            <div key={group.label} className="mb-5">
              {!compact && (
                <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[.13em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              {list(group.items)}
            </div>
          ),
        )}
      </nav>
      {footer && (
        <div className="shrink-0 border-t border-border p-4">{footer}</div>
      )}
    </aside>
  );
}
