// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-766
// source=src/components/effects/shader-background.tsx
// component=ShaderBackground
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const kind = instance.getEnum("Kind", {"Aurora": "aurora", "Waves": "waves", "Iridescent": "iridescent", "None": "none"});
const label = instance.getString("Title#104:25");
const imports = [...new Set([...["import { ShaderBackground } from \"@/components/effects/shader-background\";"], ...nestedImports])];
export default {
  example: figma.code`<ShaderBackground kind="${kind}"><p>{${JSON.stringify(label)}}</p></ShaderBackground>`,
  id: "aureform-shader-background",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "ShaderBackground", "node": "104:766", "source": "src/components/effects/shader-background.tsx", "sourceExport": "ShaderBackground", "axes": {"Kind": ["Aurora", "Waves", "Iridescent", "None"]}, "mappedProperties": [{"property": "Kind", "type": "VARIANT", "codeTarget": "kind", "options": {"Aurora": "aurora", "Waves": "waves", "Iridescent": "iridescent", "None": "none"}}, {"property": "Title#104:25", "type": "TEXT", "codeTarget": "children"}], "sourceProperties": [{"source": "src/components/effects/shader-background.tsx", "export": "ShaderBackground", "type": "ShaderBackgroundProps"}], "intentionalVisualOnly": [], "notes": ["Children and source defaults absent from the native ledger are explicit local fixtures, not inferred production content.", "The native Title text is emitted as an explicit children fixture, not a title/label source prop.", "Decorative browser movement and WebGL output are not asserted by a native design mapping."], "imports": imports, "nativePropertyValues": { "Kind": kind, "Title#104:25": label }} },
};
