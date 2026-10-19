// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-585
// source=src/components/ui/gallery.tsx
// component=Gallery
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Grid": "Grid", "Lightbox": "Lightbox"});
const imports = [...new Set([...["import { Gallery } from \"@/components/ui/gallery\";"], ...nestedImports])];
export default {
  example: figma.code`<Gallery label="Original compositions" images={[{ src: "/assets/art/arc.svg", alt: "An original geometric arch", caption: "Quiet forms" }, { src: "/assets/art/morrow.svg", alt: "An original editorial composition", caption: "Morrow" }]} />`,
  id: "aureform-gallery",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Gallery", "node": "25:585", "source": "src/components/ui/gallery.tsx", "sourceExport": "Gallery", "axes": {"State": ["Grid", "Lightbox"]}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["Grid", "Lightbox"], "reason": "Lightbox selection is internal and has no public initial-selection prop."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
