# Aureform generated image collection

[Español](README.es.md)

[catalog.json](catalog.json) defines 32 pre-generated images: 16 fictional profile portraits, two fictional organization images, eight fictional products and six art/studio scenes. It is the source for each image's prompt, slug, English/Spanish alternative text, master filename and optimized dimensions.

The catalog records **GPTImage2.5 Flare**, using the exact OpenAI Images API snapshot **`gpt-image-2.5-flare-2026-09-08`**. Its generation settings are high quality, an opaque background and WebP output with compression 92. These are the recorded generation inputs; optimized delivery files have the dimensions below.

| Group             | Images | Master dimensions | Optimized dimensions | Runtime path                  |
| ----------------- | -----: | ----------------- | -------------------- | ----------------------------- |
| Avatars           |     18 | 1024 × 1024       | 320 × 320            | `/assets/avatars/<slug>.svg`  |
| Products          |      8 | 1024 × 1024       | 640 × 640            | `/assets/products/<slug>.svg` |
| Art/studio scenes |      6 | 1536 × 1024       | 1200 × 800           | `/assets/art/<slug>.svg`      |

The people, organizations and product designs are fictional demo subjects. The scenes are generated imagery. They do not identify real people or advertise purchasable products.

## Runtime formats

Each `.svg` is a portability container with the real optimized WebP embedded as an image data URI. It preserves text-based shadcn registry transport and the existing asset URLs. The picture is raster imagery, not an editable vector illustration; the SVG extension does not add image detail.

A sibling `.webp` contains the same optimized raster for direct image use and download. For example:

- `/assets/avatars/alex-morgan.svg` and `/assets/avatars/alex-morgan.webp`
- `/assets/products/forma-desk-lamp.svg` and `/assets/products/forma-desk-lamp.webp`
- `/assets/art/arc.svg` and `/assets/art/arc.webp`

Generation happens outside the application. Running the demo or using these supplied assets requires no client API key, generation request or remote image service.

## Component examples

Avatar takes an explicit `src`; it does not import a demo-name map. Its accessible name remains the profile's `name`. Omitting `src` provides the initials fallback when an application does not include the demo image files.

```tsx
import { Avatar } from "@/components/ui/avatar";

export function ProfileImages() {
  return (
    <div className="flex items-center gap-3">
      <Avatar name="Alex Morgan" src="/assets/avatars/alex-morgan.svg" />
      <Avatar name="Isabel Torres" />
    </div>
  );
}
```

Art images use 1200 × 800 dimensions and the catalog's descriptive alternative text:

```tsx
export function GeneratedArt() {
  return (
    <img
      src="/assets/art/arc.svg"
      alt="A terracotta arch and amber glass sphere with sweeping shadows"
      width={1200}
      height={800}
      className="aspect-[3/2] w-full object-cover"
    />
  );
}
```

The complete [Avatar](../../examples/components/Avatar.tsx), [Carousel](../../examples/components/Carousel.tsx) and [Gallery](../../examples/components/Gallery.tsx) examples use literal asset paths. The copy-source record contains the canonical complete files for all 44 component families. Copy the relevant assets into the host project's `public/assets` directory along with the example code.

## Manifest and distribution

The asset pipeline's manifest target is **`public/assets/generated-images.json`**, served as **`/assets/generated-images.json`**. Use that delivery record for the files actually generated, their provenance and their optimized dimensions; the catalog defines the 32 requested images.

The open-source Source and image archives include the optimized `.svg`/`.webp` pairs, the delivery manifest, full prompt catalog and all 32 original masters at **`design/images/masters/<master filename>`**. Masters use the exact filenames in `catalog.json`; the historical 1.2.1 manifest records their earlier `output/imagegen/masters` workspace locations without changing its provenance hashes.

The original generated collection, masters, prompts and Figma image derivatives use the same [Apache 2.0 license](../../LICENSE) as the original Aureform kit, to the extent the contributors hold rights in those materials. Preserve [NOTICE](../../NOTICE) when redistributing them. The starter and eight-component sample have the same license.

Generation credentials and local generation output remain outside the distribution. Masters are included for editing and reproducibility; neither masters nor an API key are runtime dependencies. Generation prompts retain their original wording, including the historical description of a premium kit; that wording is provenance, not a separate license.

## Preserve generated images

`scripts/generate-demo-assets.mjs` preserves the collection by default and writes no assets. Its optional operations are separate:

```bash
node scripts/generate-demo-assets.mjs
node scripts/generate-demo-assets.mjs --video
node scripts/generate-demo-assets.mjs --legacy
```

`--video` requires ffmpeg and writes only `public/assets/aureform-motion.webm` and its `.vtt` captions. It does not replace portraits, products, art images or their SVG containers. `--legacy` creates the old vector samples only in `public/assets/legacy/art` and preserves existing files there. Neither operation calls the Images API.
