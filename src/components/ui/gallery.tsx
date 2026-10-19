"use client";
import { publicPath } from "@/lib/public-path";
import { useState } from "react";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
export type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};
export function Gallery({
  images,
  label,
  closeLabel = "Close",
  className,
}: {
  images: GalleryImage[];
  label: string;
  closeLabel?: string;
  className?: string;
}) {
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  return (
    <>
      <div
        aria-label={label}
        className={cn("grid grid-cols-2 gap-3 md:grid-cols-3", className)}
      >
        {images.map((image) => (
          <button
            key={image.src}
            type="button"
            aria-label={
              image.caption ? `${image.caption} — ${image.alt}` : image.alt
            }
            className="group relative overflow-hidden rounded-lg border border-border bg-surface-subtle text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setSelected(image)}
          >
            <img
              src={publicPath(image.src)}
              alt={image.alt}
              loading="lazy"
              width={image.width ?? 800}
              height={image.height ?? 600}
              style={{
                aspectRatio: `${image.width ?? 800} / ${image.height ?? 600}`,
              }}
              className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
            />
            <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md bg-surface/85 text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Expand className="size-3.5" />
            </span>
            {image.caption && (
              <span className="block px-3 py-3 text-[11px] font-medium">
                {image.caption}
              </span>
            )}
          </button>
        ))}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-w-3xl" closeLabel={closeLabel}>
          <DialogTitle>{selected?.caption ?? label}</DialogTitle>
          <DialogDescription>{selected?.alt}</DialogDescription>
          {selected && (
            <img
              className="mt-5 w-full rounded-lg"
              src={publicPath(selected.src)}
              alt={selected.alt}
              width={selected.width ?? 800}
              height={selected.height ?? 600}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
