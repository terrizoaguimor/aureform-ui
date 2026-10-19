import { generatedImageMetadata } from "@/demo/generated-image-metadata";

export type ProductAsset = {
  readonly slug: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: { readonly en: string; readonly es: string };
};

/** Literal public URLs keep the demo images portable in source installations. */
export const productAssets = {
  "prd-001": {
    slug: "forma-desk-lamp",
    src: "/assets/products/forma-desk-lamp.svg",
    width: generatedImageMetadata["forma-desk-lamp"].width,
    height: generatedImageMetadata["forma-desk-lamp"].height,
    alt: {
      en: "A forest-green desk lamp with a brass stem",
      es: "Una lámpara verde bosque con tallo de latón",
    },
  },
  "prd-002": {
    slug: "arc-lounge-chair",
    src: "/assets/products/arc-lounge-chair.svg",
    width: generatedImageMetadata["arc-lounge-chair"].width,
    height: generatedImageMetadata["arc-lounge-chair"].height,
    alt: {
      en: "An oak lounge chair with ivory upholstery",
      es: "Una silla de roble con tapizado marfil",
    },
  },
  "prd-003": {
    slug: "linea-notebook",
    src: "/assets/products/linea-notebook.svg",
    width: generatedImageMetadata["linea-notebook"].width,
    height: generatedImageMetadata["linea-notebook"].height,
    alt: {
      en: "A lilac linen notebook with a green bookmark",
      es: "Un cuaderno de lino lila con marcador verde",
    },
  },
  "prd-004": {
    slug: "studio-tote",
    src: "/assets/products/studio-tote.svg",
    width: generatedImageMetadata["studio-tote"].width,
    height: generatedImageMetadata["studio-tote"].height,
    alt: {
      en: "A natural canvas tote with a sage-green abstract mark",
      es: "Un bolso de lona natural con una forma abstracta verde salvia",
    },
  },
  "prd-005": {
    slug: "morrow-ceramic-cup",
    src: "/assets/products/morrow-ceramic-cup.svg",
    width: generatedImageMetadata["morrow-ceramic-cup"].width,
    height: generatedImageMetadata["morrow-ceramic-cup"].height,
    alt: {
      en: "A honey-amber ceramic cup and saucer",
      es: "Una taza cerámica ámbar con plato",
    },
  },
  "prd-006": {
    slug: "silhouette-vase",
    src: "/assets/products/silhouette-vase.svg",
    width: generatedImageMetadata["silhouette-vase"].width,
    height: generatedImageMetadata["silhouette-vase"].height,
    alt: {
      en: "A sculptural terracotta ceramic vase",
      es: "Un jarrón escultórico de cerámica terracota",
    },
  },
  "prd-007": {
    slug: "fold-side-table",
    src: "/assets/products/fold-side-table.svg",
    width: generatedImageMetadata["fold-side-table"].width,
    height: generatedImageMetadata["fold-side-table"].height,
    alt: {
      en: "A folded slate-blue metal side table",
      es: "Una mesa auxiliar de metal plegado azul pizarra",
    },
  },
  "prd-008": {
    slug: "essential-wall-print",
    src: "/assets/products/essential-wall-print.svg",
    width: generatedImageMetadata["essential-wall-print"].width,
    height: generatedImageMetadata["essential-wall-print"].height,
    alt: {
      en: "An oak-framed abstract print in green, amber and lilac",
      es: "Una lámina abstracta en verde, ámbar y lila con marco de roble",
    },
  },
} as const satisfies Record<string, ProductAsset>;

/** Seed IDs survive edits. Newly created products keep their icon fallback. */
export function getProductAsset(id: string): ProductAsset | undefined {
  return Object.prototype.hasOwnProperty.call(productAssets, id)
    ? productAssets[id as keyof typeof productAssets]
    : undefined;
}
