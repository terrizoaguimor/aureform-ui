// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-734
// source=src/components/effects/gradient-background.tsx
// component=GradientBackground
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const kind = instance.getEnum("Kind", {"Linear": "linear", "Radial": "radial", "Mesh": "mesh"});
const label = instance.getString("Title#104:21");
const imports = [...new Set([...["import { GradientBackground } from \"@/components/effects/gradient-background\";"], ...nestedImports])];
export default {
  example: figma.code`<GradientBackground kind="${kind}"><p>{${JSON.stringify(label)}}</p></GradientBackground>`,
  id: "aureform-gradient-background",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "GradientBackground", "node": "104:734", "source": "src/components/effects/gradient-background.tsx", "sourceExport": "GradientBackground", "axes": {"Kind": ["Linear", "Radial", "Mesh"]}, "mappedProperties": [{"property": "Kind", "type": "VARIANT", "codeTarget": "kind", "options": {"Linear": "linear", "Radial": "radial", "Mesh": "mesh"}}, {"property": "Title#104:21", "type": "TEXT", "codeTarget": "children"}], "sourceProperties": [{"source": "src/components/effects/gradient-background.tsx", "export": "GradientBackground", "type": "GradientBackgroundProps"}], "intentionalVisualOnly": [], "notes": ["Children and source defaults absent from the native ledger are explicit local fixtures, not inferred production content.", "The native Title text is emitted as an explicit children fixture, not a title/label source prop.", "Decorative browser movement and WebGL output are not asserted by a native design mapping."], "imports": imports, "nativePropertyValues": { "Kind": kind, "Title#104:21": label }} },
};
