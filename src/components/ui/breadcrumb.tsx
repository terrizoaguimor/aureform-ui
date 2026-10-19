import { publicPath } from "@/lib/public-path";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
export function Breadcrumb({
  items,
  label = "Breadcrumb",
}: {
  items: { label: ReactNode; href?: string }[];
  label?: string;
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="size-3" aria-hidden="true" />}
            {item.href ? (
              <a href={publicPath(item.href)} className="hover:text-foreground">
                {item.label}
              </a>
            ) : (
              <span
                aria-current={i === items.length - 1 ? "page" : undefined}
                className={
                  i === items.length - 1 ? "text-foreground" : undefined
                }
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
