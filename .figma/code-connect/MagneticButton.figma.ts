// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-804
// source=src/components/effects/magnetic-button.tsx
// component=MagneticButton
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"});
const label = instance.getString("Label#104:39");
const imports = [...new Set([...["import { MagneticButton } from \"@/components/effects/magnetic-button\";"], ...nestedImports])];
export default {
  example: figma.code`<MagneticButton type="button" disabled={${state === "Disabled"}}>{${JSON.stringify(label)}}</MagneticButton>`,
  id: "aureform-magnetic-button",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "MagneticButton", "node": "104:804", "source": "src/components/effects/magnetic-button.tsx", "sourceExport": "MagneticButton", "axes": {"State": ["Default", "Hover", "Disabled"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "disabled (Disabled)", "options": {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"}}, {"property": "Label#104:39", "type": "TEXT", "codeTarget": "children"}], "sourceProperties": [{"source": "src/components/effects/magnetic-button.tsx", "export": "MagneticButton", "type": "MagneticButtonProps"}], "intentionalVisualOnly": [{"property": "State", "values": ["Hover"], "reason": "Hover/focus are pointer and keyboard presentation, not forced source states."}], "notes": ["Children and source defaults absent from the native ledger are explicit local fixtures, not inferred production content.", "Decorative browser movement and WebGL output are not asserted by a native design mapping."], "imports": imports, "nativePropertyValues": { "State": state, "Label#104:39": label }} },
};
