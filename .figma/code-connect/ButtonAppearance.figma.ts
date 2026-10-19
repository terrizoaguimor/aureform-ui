// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=97-655
// source=src/components/ui/button.tsx
// component=Button
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const appearance = instance.getEnum("Appearance", {"Solid": "solid", "Soft": "soft", "Outline": "outline", "Glass": "glass", "Gradient": "gradient"});
const state = instance.getEnum("State", {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"});
const label = instance.getString("Label#97:0");
const imports = [...new Set([...["import { Button } from \"@/components/ui/button\";"], ...nestedImports])];
export default {
  example: figma.code`<Button appearance="${appearance}" disabled={${state === "Disabled"}}>{${JSON.stringify(label)}}</Button>`,
  id: "aureform-button-appearance",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Button / Appearance", "node": "97:655", "source": "src/components/ui/button.tsx", "sourceExport": "Button", "axes": {"Appearance": ["Solid", "Soft", "Outline", "Glass", "Gradient"], "State": ["Default", "Hover", "Disabled"]}, "mappedProperties": [{"property": "Appearance", "type": "VARIANT", "codeTarget": "appearance", "options": {"Solid": "solid", "Soft": "soft", "Outline": "outline", "Glass": "glass", "Gradient": "gradient"}}, {"property": "State", "type": "VARIANT", "codeTarget": "disabled (Disabled); interactive CSS presentation otherwise", "options": {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"}}, {"property": "Label#97:0", "type": "TEXT", "codeTarget": "children"}], "sourceProperties": [{"source": "src/components/ui/button.tsx", "export": "Button", "property": "appearance", "type": "ButtonAppearance", "options": ["solid", "soft", "outline", "glass", "gradient"], "nativeProperty": "Appearance", "status": "mapped-native-axis"}], "intentionalVisualOnly": [{"property": "State", "values": ["Hover"], "reason": "Hover is pointer/CSS presentation, not a force-hover source prop."}], "notes": ["Children and source defaults absent from the native ledger are explicit local fixtures, not inferred production content."], "imports": imports, "nativePropertyValues": { "Appearance": appearance, "State": state, "Label#97:0": label }} },
};
