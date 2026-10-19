// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-786
// source=src/components/effects/glow-border.tsx
// component=GlowBorder
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Hover": "Hover"});
const label = instance.getString("Title#104:33");
const imports = [...new Set([...["import { GlowBorder } from \"@/components/effects/glow-border\";"], ...nestedImports])];
export default {
  example: figma.code`<GlowBorder><p>{${JSON.stringify(label)}}</p></GlowBorder>`,
  id: "aureform-glow-border",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "GlowBorder", "node": "104:786", "source": "src/components/effects/glow-border.tsx", "sourceExport": "GlowBorder", "axes": {"State": ["Default", "Hover"]}, "mappedProperties": [{"property": "Title#104:33", "type": "TEXT", "codeTarget": "children"}], "sourceProperties": [{"source": "src/components/effects/glow-border.tsx", "export": "GlowBorder", "type": "GlowBorderProps"}], "intentionalVisualOnly": [{"property": "State", "values": ["Default", "Hover"], "reason": "Default/Hover are native pointer/CSS specimens; this source export has no forced-hover or state prop."}], "notes": ["Children and source defaults absent from the native ledger are explicit local fixtures, not inferred production content.", "The native Title text is emitted as an explicit children fixture, not a title/label source prop.", "Decorative browser movement and WebGL output are not asserted by a native design mapping."], "imports": imports, "nativePropertyValues": { "State": state, "Title#104:33": label }} },
};
