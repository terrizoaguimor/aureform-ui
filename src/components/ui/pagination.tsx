"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Pagination({
  page,
  count,
  onPageChange,
  label = "Pagination",
  previousLabel = "Previous",
  nextLabel = "Next",
}: {
  page: number;
  count: number;
  onPageChange: (page: number) => void;
  label?: string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  const pages = Array.from({ length: count }, (_, n) => n + 1).filter(
    (n) => n === 1 || n === count || Math.abs(n - page) <= 1,
  );
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={previousLabel}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft />
      </Button>
      {pages.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - pages[i - 1] > 1 && (
            <span className="px-1 text-muted-foreground">…</span>
          )}
          <Button
            variant={page === n ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={`${label} ${n}`}
            aria-current={page === n ? "page" : undefined}
            onClick={() => onPageChange(n)}
          >
            {n}
          </Button>
        </span>
      ))}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={nextLabel}
        disabled={page >= count}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
