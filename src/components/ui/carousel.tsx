"use client";
import { useId, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export function Carousel({
  items,
  label,
  previousLabel = "Previous slide",
  nextLabel = "Next slide",
  slideLabel = (n) => `Slide ${n}`,
  className,
}: {
  items: ReactNode[];
  label: string;
  previousLabel?: string;
  nextLabel?: string;
  slideLabel?: (n: number) => string;
  className?: string;
}) {
  const [index, setIndex] = useState(0),
    id = useId();
  const current = Math.min(index, Math.max(0, items.length - 1));
  const move = (step: number) =>
    setIndex((current + step + items.length) % items.length);
  if (!items.length) return null;
  return (
    <section
      aria-label={label}
      aria-roledescription="carousel"
      className={cn("relative", className)}
    >
      <div
        id={id}
        className="overflow-hidden rounded-xl"
        role="group"
        aria-roledescription="slide"
        aria-label={`${current + 1} / ${items.length}`}
      >
        {items[current]}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={previousLabel}
          aria-controls={id}
          onClick={() => move(-1)}
          disabled={items.length < 2}
        >
          <ChevronLeft />
        </Button>
        <div className="flex flex-wrap justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={slideLabel(i + 1)}
              aria-current={i === current ? "true" : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                "flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === current ? "w-5 bg-primary" : "w-1.5 bg-border",
                )}
              />
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={nextLabel}
          aria-controls={id}
          onClick={() => move(1)}
          disabled={items.length < 2}
        >
          <ChevronRight />
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {slideLabel(current + 1)} · {items.length}
      </p>
    </section>
  );
}
