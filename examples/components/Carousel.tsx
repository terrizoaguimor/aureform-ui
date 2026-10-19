"use client";

import { Carousel } from "@/components/ui/carousel";
import { publicPath } from "@/lib/public-path";

const images = [
  {
    src: "/assets/art/arc.svg",
    alt: "A terracotta arch and amber glass sphere with sweeping shadows",
    title: "Arc",
  },
  {
    src: "/assets/art/morrow.svg",
    alt: "A folded sage satin ribbon on a misty green background",
    title: "Morrow",
  },
  {
    src: "/assets/art/studio.svg",
    alt: "A sunlit creative studio with an oak table and sage chair",
    title: "Studio",
  },
];

export default function CarouselExample() {
  return (
    <Carousel
      label="Aureform generated art collection"
      previousLabel="Previous image"
      nextLabel="Next image"
      slideLabel={(number) => `Image ${number}`}
      className="max-w-xl"
      items={images.map((image) => (
        <figure key={image.src}>
          <img
            src={publicPath(image.src)}
            alt={image.alt}
            width={1200}
            height={800}
            className="aspect-[3/2] w-full object-cover"
          />
          <figcaption className="bg-surface px-4 py-3 text-sm">
            {image.title}
          </figcaption>
        </figure>
      ))}
    />
  );
}
