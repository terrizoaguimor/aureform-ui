"use client";

import { Gallery, type GalleryImage } from "@/components/ui/gallery";

const images: GalleryImage[] = [
  {
    src: "/assets/art/arc.svg",
    alt: "A terracotta arch and amber glass sphere with sweeping shadows",
    caption: "Arc",
    width: 1200,
    height: 800,
  },
  {
    src: "/assets/art/morrow.svg",
    alt: "A folded sage satin ribbon on a misty green background",
    caption: "Morrow",
    width: 1200,
    height: 800,
  },
  {
    src: "/assets/art/studio.svg",
    alt: "A sunlit creative studio with an oak table and sage chair",
    caption: "Studio",
    width: 1200,
    height: 800,
  },
];

export default function GalleryExample() {
  return (
    <Gallery
      label="Aureform generated art collection"
      closeLabel="Close image preview"
      images={images}
      className="max-w-3xl"
    />
  );
}
