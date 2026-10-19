import { generatedImageMetadata } from "@/demo/generated-image-metadata";

/** Public metadata is copied with the literal SVG assets by the source graph. */
export const generatedImagesManifestSrc = "/assets/generated-images.json";

export const editorialAssets = [
  {
    id: "quiet-forms",
    src: "/assets/art/quiet-forms.svg",
    width: generatedImageMetadata["quiet-forms"].width,
    height: generatedImageMetadata["quiet-forms"].height,
    title: { en: "Quiet Forms", es: "Formas tranquilas" },
    alt: {
      en: "An ivory sculptural arch and sage sphere in warm side light",
      es: "Un arco escultórico marfil y una esfera salvia con luz cálida lateral",
    },
    svgFilename: "quiet-forms.svg",
    svgBytes: generatedImageMetadata["quiet-forms"].svgBytes,
    webpFilename: "quiet-forms.webp",
    webpBytes: generatedImageMetadata["quiet-forms"].webpBytes,
  },
  {
    id: "studio",
    src: "/assets/art/studio.svg",
    width: generatedImageMetadata.studio.width,
    height: generatedImageMetadata.studio.height,
    title: { en: "Studio", es: "Estudio" },
    alt: {
      en: "A sunlit creative studio with an oak table and sage chair",
      es: "Un estudio creativo iluminado con mesa de roble y silla salvia",
    },
    svgFilename: "studio.svg",
    svgBytes: generatedImageMetadata.studio.svgBytes,
    webpFilename: "studio.webp",
    webpBytes: generatedImageMetadata.studio.webpBytes,
  },
  {
    id: "arc",
    src: "/assets/art/arc.svg",
    width: generatedImageMetadata.arc.width,
    height: generatedImageMetadata.arc.height,
    title: { en: "Arc", es: "Arco" },
    alt: {
      en: "A terracotta arch and amber glass sphere with sweeping shadows",
      es: "Un arco terracota y una esfera de vidrio ámbar con sombras amplias",
    },
    svgFilename: "arc.svg",
    svgBytes: generatedImageMetadata.arc.svgBytes,
    webpFilename: "arc.webp",
    webpBytes: generatedImageMetadata.arc.webpBytes,
  },
  {
    id: "morrow",
    src: "/assets/art/morrow.svg",
    width: generatedImageMetadata.morrow.width,
    height: generatedImageMetadata.morrow.height,
    title: { en: "Morrow", es: "Amanecer" },
    alt: {
      en: "A folded sage satin ribbon on a misty green background",
      es: "Una cinta plegada de satén salvia sobre un fondo verde brumoso",
    },
    svgFilename: "morrow.svg",
    svgBytes: generatedImageMetadata.morrow.svgBytes,
    webpFilename: "morrow.webp",
    webpBytes: generatedImageMetadata.morrow.webpBytes,
  },
  {
    id: "silhouette",
    src: "/assets/art/silhouette.svg",
    width: generatedImageMetadata.silhouette.width,
    height: generatedImageMetadata.silhouette.height,
    title: { en: "Silhouette", es: "Silueta" },
    alt: {
      en: "A cobalt vessel and orange stone form on a lilac stage",
      es: "Un recipiente cobalto y una forma naranja sobre una base lila",
    },
    svgFilename: "silhouette.svg",
    svgBytes: generatedImageMetadata.silhouette.svgBytes,
    webpFilename: "silhouette.webp",
    webpBytes: generatedImageMetadata.silhouette.webpBytes,
  },
  {
    id: "goodform",
    src: "/assets/art/goodform.svg",
    width: generatedImageMetadata.goodform.width,
    height: generatedImageMetadata.goodform.height,
    title: { en: "Goodform", es: "Buena forma" },
    alt: {
      en: "Lavender resin discs, an amber arc and a mint sphere",
      es: "Discos de resina lavanda, un arco ámbar y una esfera menta",
    },
    svgFilename: "goodform.svg",
    svgBytes: generatedImageMetadata.goodform.svgBytes,
    webpFilename: "goodform.webp",
    webpBytes: generatedImageMetadata.goodform.webpBytes,
  },
] as const;

export type EditorialAsset = (typeof editorialAssets)[number];

/** Lookup describes the prepared image, independently of a user's saved brief. */
export function getEditorialAsset(
  srcOrId: string | undefined,
): EditorialAsset | undefined {
  return editorialAssets.find(
    (asset) => asset.id === srcOrId || asset.src === srcOrId,
  );
}
