// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-777
// source=src/components/effects/spotlight-card.tsx
// component=SpotlightCard
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Hover": "Hover"});
const label = instance.getString("Title#104:30");
const imports = [...new Set([...["import { SpotlightCard } from \"@/components/effects/spotlight-card\";"], ...nestedImports])];
export default {
  example: figma.code`<SpotlightCard><p>{${JSON.stringify(label)}}</p></SpotlightCard>`,
  id: "aureform-spotlight-card",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "SpotlightCard", "node": "104:777", "source": "src/components/effects/spotlight-card.tsx", "sourceExport": "SpotlightCard", "axes": {"State": ["Default", "Hover"]}, "mappedProperties": [{"property": "Title#104:30", "type": "TEXT", "codeTarget": "children"}], "sourceProperties": [{"source": "src/components/effects/spotlight-card.tsx", "export": "SpotlightCard", "type": "SpotlightCardProps"}], "intentionalVisualOnly": [{"property": "State", "values": ["Default", "Hover"], "reason": "Default/Hover are native pointer/CSS specimens; this source export has no forced-hover or state prop."}], "notes": ["Children and source defaults absent from the native ledger are explicit local fixtures, not inferred production content.", "The native Title text is emitted as an explicit children fixture, not a title/label source prop.", "Decorative browser movement and WebGL output are not asserted by a native design mapping."], "imports": imports, "nativePropertyValues": { "State": state, "Title#104:30": label }} },
};
