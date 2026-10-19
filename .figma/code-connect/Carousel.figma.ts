// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-511
// source=src/components/ui/carousel.tsx
// component=Carousel
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"First": "First", "Middle": "Middle", "Last": "Last"});
const label = instance.getString("Label#25:0");
const imports = [...new Set([...["import { Carousel } from \"@/components/ui/carousel\";"], ...nestedImports])];
export default {
  example: figma.code`<Carousel label="Featured compositions" items={[<article key="first"><h3>{${JSON.stringify(label)}}</h3><p>First local slide.</p></article>, <article key="second"><h3>Quiet forms</h3><p>Second local slide.</p></article>, <article key="third"><h3>A new possibility</h3><p>Third local slide.</p></article>]} />`,
  id: "aureform-carousel",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Carousel", "node": "25:511", "source": "src/components/ui/carousel.tsx", "sourceExport": "Carousel", "axes": {"State": ["First", "Middle", "Last"]}, "mappedProperties": [{"property": "Label#25:0", "type": "TEXT", "codeTarget": "items[0] visible title children"}], "sourceProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["First", "Middle", "Last"], "reason": "Carousel initializes internal index at zero and has no selected-index prop."}], "notes": ["Native Label is the visual CarouselTitle, not the accessibility label. Accessible carousel name and slide content are separate source fixtures."], "imports": imports, "nativePropertyValues": { "State": state, "Label#25:0": label }} },
};
